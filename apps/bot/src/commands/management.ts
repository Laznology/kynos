import { addAuditLog, getSettings, updateSettings } from "@kynos/db";
import { AVAILABLE_TOOLS, AI_MODEL_PRESETS } from "@kynos/shared";
import type { ReasoningEffort } from "@kynos/shared";

import type { CommandContext, CommandHandler } from "./types";

const OWNER_REQUIRED = "Perintah ini hanya dapat digunakan oleh owner Kynos.";
const MODEL_PATTERN = /^[a-zA-Z0-9._:/-]{2,200}$/u;

const getCurrentSettings = (ctx: CommandContext) =>
  ctx.settings || getSettings();

const isOwner = (ctx: CommandContext): boolean => {
  const ownerJid = getCurrentSettings(ctx).owner_jid.trim().toLowerCase();
  return ownerJid.length > 0 && ctx.sender.trim().toLowerCase() === ownerJid;
};

const requireOwner = async (ctx: CommandContext): Promise<boolean> => {
  if (isOwner(ctx)) {
    return true;
  }
  await ctx.reply(OWNER_REQUIRED);
  return false;
};

const requirePrivateAccess = async (ctx: CommandContext): Promise<boolean> => {
  const settings = getCurrentSettings(ctx);
  if (settings.allowed_users.includes(ctx.sender.trim().toLowerCase())) {
    return true;
  }
  await ctx.reply(
    "Ganti model hanya tersedia untuk user yang terdaftar di Private Access."
  );
  return false;
};

const formatSettings = (ctx: CommandContext): string => {
  const settings = getCurrentSettings(ctx);
  return [
    "*KYNOS CONFIG*",
    `- Model: ${settings.ai_model}`,
    `- Provider: ${settings.ai_provider}`,
    `- Reasoning: ${settings.ai_reasoning_effort}`,
    `- Temperature: ${settings.ai_temperature}`,
    `- Max tokens: ${settings.ai_max_tokens}`,
    `- Tools: ${settings.tools_enabled.length}/${AVAILABLE_TOOLS.length} aktif`,
    `- Prefix: ${settings.bot_prefix}`,
    "",
    "Perintah:",
    "/model: pilih model interaktif",
    "/model <model-id>: ganti langsung",
    "/reasoning [low|medium|high]",
    "/temperature [0-2]",
    "/tokens [jumlah]",
    "/tools [list|enable|disable] [tool-id]",
  ].join("\n");
};

const auditSettingsChange = (
  ctx: CommandContext,
  setting: string,
  value: string
) => {
  addAuditLog("info", "command", `Setting changed via /config: ${setting}`, {
    jid: ctx.jid,
    sender: ctx.sender,
    setting,
    value,
  });
};

export const configCommand: CommandHandler = {
  aliases: ["settings"],
  description: "Show and manage AI runtime configuration",
  execute: async (ctx) => {
    await ctx.reply(formatSettings(ctx));
  },
  name: "config",
  usage: "/config",
};

export const modelCommand: CommandHandler = {
  description: "Show or change the active AI model",
  execute: async (ctx) => {
    const [model] = ctx.args;
    if (!model) {
      const settings = getCurrentSettings(ctx);
      if (ctx.replyList) {
        await ctx.replyList({
          buttonText: "Pilih model",
          description: `Model aktif: ${settings.ai_model}\nProvider aktif: ${settings.ai_provider}`,
          rows: AI_MODEL_PRESETS.map((preset) => ({
            description: `${preset.provider}: ${preset.description}`,
            id: `/model-confirm ${preset.id}`,
            title: preset.name,
          })),
          title: "Daftar Model Kynos",
        });
        return;
      }
      const presets = AI_MODEL_PRESETS.map(
        (preset) => `- ${preset.id} (${preset.name})`
      ).join("\n");
      await ctx.reply(
        `Model aktif: ${settings.ai_model}\n\nModel preset:\n${presets}\n\nUntuk model custom: /model <provider/model-id>`
      );
      return;
    }

    if (!(await requirePrivateAccess(ctx))) {
      return;
    }
    if (!MODEL_PATTERN.test(model)) {
      await ctx.reply("Model ID tidak valid.");
      return;
    }

    updateSettings({ ai_model: model });
    auditSettingsChange(ctx, "ai_model", model);
    await ctx.reply(`Model aktif diubah ke: ${model}`);
  },
  name: "model",
  usage: "/model [model-id]",
};

export const modelConfirmCommand: CommandHandler = {
  description: "Confirm an interactive model selection",
  execute: async (ctx) => {
    const [model] = ctx.args;
    if (!model || !MODEL_PATTERN.test(model)) {
      await ctx.reply("Model ID tidak valid.");
      return;
    }
    if (!(await requirePrivateAccess(ctx))) {
      return;
    }
    if (ctx.replyButtons) {
      await ctx.replyButtons({
        buttons: [
          { id: `/model-apply ${model}`, text: "Gunakan model" },
          { id: "/model-cancel", text: "Batalkan" },
        ],
        text: `Model dipilih: ${model}\nKonfirmasi perubahan konfigurasi.`,
      });
      return;
    }
    await ctx.reply(`Ketik /model ${model} untuk menerapkan model ini.`);
  },
  name: "model-confirm",
  usage: "/model-confirm <model-id>",
};

export const modelApplyCommand: CommandHandler = {
  description: "Apply a confirmed interactive model selection",
  execute: async (ctx) => {
    const [model] = ctx.args;
    if (!model || !MODEL_PATTERN.test(model)) {
      await ctx.reply("Model ID tidak valid.");
      return;
    }
    if (!(await requirePrivateAccess(ctx))) {
      return;
    }
    updateSettings({ ai_model: model });
    auditSettingsChange(ctx, "ai_model", model);
    await ctx.reply(`Model aktif diubah ke: ${model}`);
  },
  name: "model-apply",
  usage: "/model-apply <model-id>",
};

export const modelCancelCommand: CommandHandler = {
  description: "Cancel an interactive model selection",
  execute: async (ctx) => {
    await ctx.reply("Perubahan model dibatalkan.");
  },
  name: "model-cancel",
  usage: "/model-cancel",
};

export const reasoningCommand: CommandHandler = {
  aliases: ["effort"],
  description: "Show or change model reasoning effort",
  execute: async (ctx) => {
    const [rawEffort] = ctx.args;
    const effort = rawEffort?.toLowerCase();
    if (!effort) {
      await ctx.reply(
        `Reasoning effort aktif: ${getCurrentSettings(ctx).ai_reasoning_effort}\nPilihan: low, medium, high`
      );
      return;
    }
    if (!(await requireOwner(ctx))) {
      return;
    }
    if (effort !== "low" && effort !== "medium" && effort !== "high") {
      await ctx.reply("Nilai reasoning harus: low, medium, atau high.");
      return;
    }

    updateSettings({ ai_reasoning_effort: effort as ReasoningEffort });
    auditSettingsChange(ctx, "ai_reasoning_effort", effort);
    await ctx.reply(`Reasoning effort diubah ke: ${effort}`);
  },
  name: "reasoning",
  usage: "/reasoning [low|medium|high]",
};

export const temperatureCommand: CommandHandler = {
  description: "Show or change model temperature",
  execute: async (ctx) => {
    const [rawTemperature] = ctx.args;
    if (!rawTemperature) {
      await ctx.reply(
        `Temperature aktif: ${getCurrentSettings(ctx).ai_temperature}\nRange: 0 sampai 2`
      );
      return;
    }
    if (!(await requireOwner(ctx))) {
      return;
    }

    const temperature = Number(rawTemperature);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      await ctx.reply("Temperature harus berupa angka antara 0 dan 2.");
      return;
    }

    updateSettings({ ai_temperature: temperature });
    auditSettingsChange(ctx, "ai_temperature", String(temperature));
    await ctx.reply(`Temperature diubah ke: ${temperature}`);
  },
  name: "temperature",
  usage: "/temperature [0-2]",
};

export const tokensCommand: CommandHandler = {
  description: "Show or change maximum output tokens",
  execute: async (ctx) => {
    const [rawTokens] = ctx.args;
    if (!rawTokens) {
      await ctx.reply(
        `Max output tokens aktif: ${getCurrentSettings(ctx).ai_max_tokens}`
      );
      return;
    }
    if (!(await requireOwner(ctx))) {
      return;
    }

    const tokens = Number(rawTokens);
    if (!Number.isInteger(tokens) || tokens < 1 || tokens > 1_000_000) {
      await ctx.reply("Max tokens harus bilangan bulat antara 1 dan 1000000.");
      return;
    }

    updateSettings({ ai_max_tokens: tokens });
    auditSettingsChange(ctx, "ai_max_tokens", String(tokens));
    await ctx.reply(`Max output tokens diubah ke: ${tokens}`);
  },
  name: "tokens",
  usage: "/tokens [jumlah]",
};

export const toolsCommand: CommandHandler = {
  description: "List or enable/disable AI tools",
  execute: async (ctx) => {
    const [rawAction, toolId] = ctx.args;
    const action = rawAction?.toLowerCase() || "list";
    const knownTool = AVAILABLE_TOOLS.find((tool) => tool.id === toolId);

    if (action === "list") {
      const settings = getCurrentSettings(ctx);
      const lines = AVAILABLE_TOOLS.map(
        (tool) =>
          `- ${settings.tools_enabled.includes(tool.id) ? "ON " : "OFF"} ${tool.id}: ${tool.description}`
      );
      await ctx.reply(`*AI TOOLS*\n${lines.join("\n")}`);
      return;
    }

    if (action !== "enable" && action !== "disable") {
      await ctx.reply("Usage: /tools [list|enable|disable] [tool-id]");
      return;
    }
    if (!(await requireOwner(ctx))) {
      return;
    }
    if (!knownTool) {
      await ctx.reply(
        `Tool tidak dikenal. Gunakan /tools list.\nPilihan: ${AVAILABLE_TOOLS.map((tool) => tool.id).join(", ")}`
      );
      return;
    }

    const current = getCurrentSettings(ctx).tools_enabled;
    const next =
      action === "enable"
        ? [...new Set([...current, knownTool.id])]
        : current.filter((id) => id !== knownTool.id);
    updateSettings({ tools_enabled: next });
    auditSettingsChange(ctx, "tools_enabled", `${action}:${knownTool.id}`);
    await ctx.reply(
      `Tool ${knownTool.id} ${action === "enable" ? "diaktifkan" : "dinonaktifkan"}.`
    );
  },
  name: "tools",
  usage: "/tools [list|enable|disable] [tool-id]",
};
