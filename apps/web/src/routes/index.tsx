import { AVAILABLE_TOOLS } from "@kynos/shared";
import type {
  AppSettings,
  AuditLog,
  BotState,
  BotStatus,
  SkillRecord,
} from "@kynos/shared";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Brain,
  ChatCircleText,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  FloppyDisk,
  Plus,
  SidebarSimple,
  SlidersHorizontal,
  Terminal,
  TerminalWindow,
  Trash,
  Wrench,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { siWhatsapp } from "simple-icons";

import { AiRuntimeSection } from "../components/ai-runtime-section";
import { CommandPalette } from "../components/command-palette";
import type { PaletteCommand } from "../components/command-palette";
import { AuditSection, SidebarNav } from "../components/dashboard-layout";
import type { NavSection } from "../components/dashboard-layout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { SimpleIcon } from "../components/ui/simple-icon";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import {
  createSkillFn,
  deleteSkillFn,
  fetchAvailableModels,
  fetchDashboardData,
  saveSettingsFn,
  toggleSkillFn,
  triggerBotRestartFn,
} from "../lib/server-api";
import type { DashboardData, ModelOption } from "../lib/server-api";

const NAV_ICON: Record<NavSection, ReactNode> = {
  ai_runtime: <Brain />,
  audit: <ClockCounterClockwise />,
  gateway: <ChatCircleText />,
  skills: <Code />,
  tools: <Wrench />,
};

const NAV_SECTIONS: { id: NavSection; keywords: string; label: string }[] = [
  {
    id: "gateway",
    keywords: "whatsapp pairing qr device session",
    label: "Gateway",
  },
  {
    id: "ai_runtime",
    keywords: "model provider endpoint api key routing",
    label: "AI Gateway",
  },
  {
    id: "tools",
    keywords: "agent tools calculator weather reminder memory",
    label: "Tools",
  },
  { id: "skills", keywords: "skill expertise workflow", label: "Skills" },
  { id: "audit", keywords: "log history event execution", label: "Audit" },
];

const getStatusVisual = (status: BotStatus) => {
  if (status === "connected") {
    return {
      dot: "bg-emerald-400",
      label: "connected",
      variant: "success" as const,
    };
  }
  if (status === "connecting") {
    return {
      dot: "bg-amber-400",
      label: "connecting",
      variant: "warning" as const,
    };
  }
  if (status === "qr_ready") {
    return { dot: "bg-sky-400", label: "qr ready", variant: "info" as const };
  }
  return {
    dot: "bg-rose-500",
    label: "offline",
    variant: "destructive" as const,
  };
};

const COMMAND_REF = [
  {
    name: "/s",
    desc: "Convert image, video (max 10s), or GIF into a WebP sticker.",
  },
  {
    name: "/toimg",
    desc: "Extract a WhatsApp sticker back into PNG or GIF.",
  },
  {
    name: "/smeme [top]|[bottom]",
    desc: "Meme sticker with heavy Impact typography stroke.",
  },
  { name: "/status", desc: "Bot diagnostics, chat memory, runtime health." },
];

const GatewaySection = ({
  settings,
  state,
}: {
  settings: AppSettings;
  state: BotState;
}) => {
  let content: React.ReactNode = null;

  if (state.status === "qr_ready" && state.qr_code) {
    content = (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-fit rounded-xs border border-white/20 bg-white p-3">
          <img
            alt="WhatsApp pairing QR code"
            className="h-56 w-56 sm:h-64 sm:w-64"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
              state.qr_code
            )}`}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-300">
            WhatsApp › Linked Devices › Link a Device
          </p>
          <p className="text-[11px] text-zinc-500">
            Scan the QR code with your camera to authenticate the session.
          </p>
        </div>
      </div>
    );
  } else if (state.status === "connected") {
    content = (
      <div className="flex flex-col items-center gap-3.5 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-emerald-500/25 bg-emerald-500/12 text-emerald-300">
          <CheckCircle className="h-5.5 w-5.5" weight="fill" />
        </span>
        <div className="space-y-1">
          <p className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Gateway online
          </p>
          <p className="max-w-sm text-[11px] leading-relaxed text-zinc-500">
            Baileys socket is stable. The bot receives messages and runs the AI
            pipeline.
          </p>
        </div>
        {state.phone_number && (
          <span className="flex items-center gap-1.5 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[11px] text-zinc-300">
            <SimpleIcon
              icon={siWhatsapp}
              className="h-3 w-3 text-emerald-400"
            />
            +{state.phone_number}
          </span>
        )}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col items-center gap-3.5 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.03] text-zinc-500">
          <TerminalWindow className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-200">
            Daemon not running
          </p>
          <p className="max-w-sm text-[11px] text-zinc-500">
            Start the bot process to open the connection:
          </p>
        </div>
        <code className="kbd text-[11px]">bun run dev:all</code>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <SimpleIcon
                icon={siWhatsapp}
                className="h-3.5 w-3.5 text-zinc-400"
              />
              <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
                Pairing
              </h2>
            </div>
            <Badge variant="secondary">baileys v7</Badge>
          </div>
          <div className="p-4">{content}</div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
              Runtime parameters
            </h2>
          </div>
          <dl>
            {[
              ["Command prefix", settings.bot_prefix],
              ["Reply scope", settings.auto_reply_mode],
              ["Sticker pack", settings.sticker_pack_name],
              ["Reasoning", settings.ai_reasoning_effort],
            ].map(([k, v], i) => (
              <div
                className={`flex items-center justify-between px-4 py-2 ${
                  i < 3 ? "border-b border-white/[0.04]" : ""
                }`}
                key={k}
              >
                <dt className="text-[11px] text-zinc-500">{k}</dt>
                <dd className="max-w-[60%] truncate font-mono text-[11px] text-zinc-200">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
            <Terminal className="h-3.5 w-3.5 text-zinc-500" />
            <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
              Command reference
            </h2>
          </div>
          {COMMAND_REF.map((c, i) => (
            <div
              className={`px-4 py-2.5 transition-colors hover:bg-white/[0.015] ${
                i < COMMAND_REF.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
              key={c.name}
            >
              <p className="font-mono text-[11px] font-medium text-zinc-100">
                {c.name}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SkillsSection = ({
  handleCreateSkillSubmit,
  handleDeleteSkill,
  handleToggleSkill,
  isPending,
  newSkillBody,
  newSkillDesc,
  newSkillName,
  setNewSkillBody,
  setNewSkillDesc,
  setNewSkillName,
  setShowSkillForm,
  showSkillForm,
  skills,
}: {
  handleCreateSkillSubmit: (e: React.FormEvent) => void;
  handleDeleteSkill: (name: string) => void;
  handleToggleSkill: (name: string, current: boolean) => void;
  isPending: boolean;
  newSkillBody: string;
  newSkillDesc: string;
  newSkillName: string;
  setNewSkillBody: (v: string) => void;
  setNewSkillDesc: (v: string) => void;
  setNewSkillName: (v: string) => void;
  setShowSkillForm: (v: boolean) => void;
  showSkillForm: boolean;
  skills: SkillRecord[];
}) => (
  <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Code className="h-3.5 w-3.5 text-zinc-500" />
        <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
          Skills
        </h2>
        <Badge variant="secondary">{skills.length}</Badge>
      </div>
      <Button
        onClick={() => setShowSkillForm(!showSkillForm)}
        size="sm"
        variant="secondary"
      >
        <Plus />
        New skill
      </Button>
    </div>

    {showSkillForm && (
      <form
        className="animate-fade-in space-y-3 border-b border-white/[0.07] p-4"
        onSubmit={handleCreateSkillSubmit}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill_name">Name (kebab-case)</Label>
            <Input
              id="skill_name"
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. summarize-pdf"
              required
              value={newSkillName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill_desc">When to use</Label>
            <Input
              id="skill_desc"
              onChange={(e) => setNewSkillDesc(e.target.value)}
              placeholder="Skill trigger condition"
              value={newSkillDesc}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill_body">Instructions (markdown)</Label>
          <Textarea
            className="font-mono text-[11px]"
            id="skill_body"
            onChange={(e) => setNewSkillBody(e.target.value)}
            placeholder="# Steps..."
            required
            rows={3}
            value={newSkillBody}
          />
        </div>
        <div className="flex justify-end gap-1.5">
          <Button
            onClick={() => setShowSkillForm(false)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={isPending} size="sm" type="submit">
            Save
          </Button>
        </div>
      </form>
    )}

    {skills.length === 0 ? (
      <p className="px-4 py-10 text-center font-mono text-[11px] text-zinc-600">
        No skills yet. The agent records them automatically when it spots a
        working pattern, or create one manually.
      </p>
    ) : (
      <ul>
        {skills.map((skill) => (
          <li
            className="flex items-center justify-between gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0"
            key={skill.name}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-[11px] font-medium text-zinc-100">
                  {skill.name}
                </span>
                <Badge variant={skill.enabled ? "success" : "secondary"}>
                  {skill.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {skill.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                disabled={isPending}
                onClick={() => handleToggleSkill(skill.name, skill.enabled)}
                size="sm"
                variant="ghost"
              >
                {skill.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                aria-label={`Delete ${skill.name}`}
                disabled={isPending}
                onClick={() => handleDeleteSkill(skill.name)}
                size="icon"
                variant="ghost"
              >
                <Trash className="hover:text-rose-300" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ToolsSection = ({
  enabledTools,
  onToggleTool,
}: {
  enabledTools: string[];
  onToggleTool: (toolName: string) => void;
}) => (
  <div className="rounded-md border border-white/[0.07] bg-[#0a0a0d]">
    <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
      <Wrench className="h-3.5 w-3.5 text-zinc-500" />
      <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
        Tools
      </h2>
      <Badge variant="secondary">
        {enabledTools.length} / {AVAILABLE_TOOLS.length}
      </Badge>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {AVAILABLE_TOOLS.map((tool, i) => {
        const isEnabled = enabledTools.includes(tool.name);
        return (
          <div
            className={`flex items-start justify-between gap-3 border-white/[0.04] p-3.5 ${
              i % 2 === 0 ? "border-r" : ""
            } ${i < AVAILABLE_TOOLS.length - (AVAILABLE_TOOLS.length % 2) ? "border-b" : ""} ${
              isEnabled ? "bg-white/[0.02]" : ""
            }`}
            key={tool.name}
          >
            <div className="min-w-0">
              <p
                className={`font-mono text-[11px] font-medium ${
                  isEnabled ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {tool.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                {tool.description}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => onToggleTool(tool.name)}
            />
          </div>
        );
      })}
    </div>
  </div>
);

const DashboardPage = () => {
  const initialData = Route.useLoaderData();
  const [activeNav, setActiveNav] = useState<NavSection>("ai_runtime");

  const [settings, setSettings] = useState<AppSettings>(initialData.settings);
  const [state, setState] = useState<BotState>(initialData.state);
  const [skills, setSkills] = useState<SkillRecord[]>(initialData.skills);
  const [logs, setLogs] = useState<AuditLog[]>(initialData.logs);

  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillBody, setNewSkillBody] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillName, setNewSkillName] = useState("");

  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsFetchError, setModelsFetchError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kynos.nav.collapsed");
    if (saved === "1") {
      setTimeout(() => setCollapsed(true), 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kynos.nav.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboardData()
        .then((fresh) => {
          setState(fresh.state);
          setLogs(fresh.logs);
          return fresh;
        })
        .catch(() => null);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const loadModels = useCallback(
    async (baseUrl?: string, apiKey?: string) => {
      setIsFetchingModels(true);
      setModelsFetchError(null);
      try {
        const fetched = await fetchAvailableModels(
          baseUrl || settings.ai_base_url,
          apiKey === undefined ? settings.ai_api_key : apiKey
        );
        setAvailableModels(fetched);
      } catch (error) {
        setModelsFetchError(
          error instanceof Error ? error.message : "Failed to load model list"
        );
      }
      setIsFetchingModels(false);
    },
    [settings.ai_api_key, settings.ai_base_url]
  );

  useEffect(() => {
    if (!settings.ai_base_url) {
      return;
    }
    const timer = setTimeout(() => {
      loadModels(settings.ai_base_url, settings.ai_api_key);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadModels, settings.ai_api_key, settings.ai_base_url]);

  const handleProviderChange = (provider: AppSettings["ai_provider"]) => {
    const urls: Record<string, string> = {
      custom: settings.ai_base_url,
      groq: "https://api.groq.com/openai/v1",
      ollama: "http://localhost:11434/v1",
      openai: "https://api.openai.com/v1",
      openrouter: "https://openrouter.ai/api/v1",
    };
    const baseUrl = urls[provider] ?? settings.ai_base_url;
    setSettings((prev) => ({
      ...prev,
      ai_base_url: baseUrl,
      ai_provider: provider,
    }));
    loadModels(baseUrl, settings.ai_api_key);
  };

  const handlePresetSelect = (presetId: string) => {
    let baseUrl = "https://openrouter.ai/api/v1";
    let provider: AppSettings["ai_provider"] = "openrouter";
    if (presetId.includes("groq") || presetId.includes("versatile")) {
      baseUrl = "https://api.groq.com/openai/v1";
      provider = "groq";
    } else if (
      presetId.includes("ollama") ||
      presetId.includes("hermes3:latest")
    ) {
      baseUrl = "http://localhost:11434/v1";
      provider = "ollama";
    }
    setSettings((prev) => ({
      ...prev,
      ai_base_url: baseUrl,
      ai_model: presetId,
      ai_provider: provider,
    }));
    loadModels(baseUrl, settings.ai_api_key);
  };

  const handleToggleTool = (toolName: string) => {
    setSettings((prev) => {
      const current = prev.tools_enabled || [];
      const exists = current.includes(toolName);
      return {
        ...prev,
        tools_enabled: exists
          ? current.filter((t) => t !== toolName)
          : [...current, toolName],
      };
    });
  };

  const handleSaveSettings = () => {
    setFeedbackMsg("Saving configuration...");
    startTransition(async () => {
      try {
        const updated = await saveSettingsFn({ data: settings });
        setSettings(updated);
        setFeedbackMsg("Saved to SQLite.");
        setTimeout(() => setFeedbackMsg(null), 3000);
      } catch (error) {
        setFeedbackMsg(
          `Save failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleRestartBot = () => {
    setFeedbackMsg("Reloading daemon...");
    startTransition(async () => {
      try {
        await triggerBotRestartFn();
        setFeedbackMsg("Reload signal sent.");
        setTimeout(() => setFeedbackMsg(null), 3000);
      } catch (error) {
        setFeedbackMsg(
          `Reload failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleToggleSkill = (name: string, currentEnabled: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleSkillFn({ data: { currentEnabled, name } });
        setSkills((prev) =>
          prev.map((s) =>
            s.name === name ? { ...s, enabled: res.enabled } : s
          )
        );
      } catch (error) {
        setFeedbackMsg(
          `Toggle failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleDeleteSkill = (name: string) => {
    startTransition(async () => {
      try {
        await deleteSkillFn({ data: { name } });
        setSkills((prev) => prev.filter((s) => s.name !== name));
      } catch (error) {
        setFeedbackMsg(
          `Delete failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const handleCreateSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillBody.trim()) {
      setFeedbackMsg("Skill name and instructions are required.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createSkillFn({
          data: {
            body: newSkillBody,
            description: newSkillDesc,
            name: newSkillName,
          },
        });
        setSkills((prev) => [...prev, created]);
        setNewSkillName("");
        setNewSkillDesc("");
        setNewSkillBody("");
        setShowSkillForm(false);
        setFeedbackMsg(`Skill "${created.name}" saved.`);
        setTimeout(() => setFeedbackMsg(null), 3000);
      } catch (error) {
        setFeedbackMsg(
          `Create failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  };

  const paletteCommands: PaletteCommand[] = [
    ...NAV_SECTIONS.map((s) => ({
      group: "Navigation",
      hint: "↗",
      icon: NAV_ICON[s.id],
      id: s.id,
      keywords: s.keywords,
      label: `Go to ${s.label}`,
      run: () => setActiveNav(s.id),
    })),
    {
      group: "Actions",
      hint: "⌘ config",
      icon: <FloppyDisk />,
      id: "save",
      keywords: "save settings config",
      label: "Save configuration",
      run: handleSaveSettings,
    },
    {
      group: "Actions",
      hint: "daemon",
      icon: <ArrowCounterClockwise />,
      id: "restart",
      keywords: "restart reload bot daemon",
      label: "Reload bot daemon",
      run: handleRestartBot,
    },
    {
      group: "Actions",
      hint: "/models",
      icon: <ArrowsClockwise />,
      id: "sync",
      keywords: "fetch sync model list",
      label: "Sync model list",
      run: () => {
        loadModels();
      },
    },
    {
      group: "Actions",
      icon: <SidebarSimple />,
      id: "collapse",
      keywords: "sidebar collapse expand menu",
      label: collapsed ? "Expand sidebar" : "Collapse sidebar",
      run: () => setCollapsed((v) => !v),
    },
    ...AVAILABLE_TOOLS.map((t) => ({
      group: "Tools",
      hint: settings.tools_enabled?.includes(t.name) ? "on" : "off",
      icon: <Wrench />,
      id: `tool-${t.name}`,
      keywords: `${t.name} ${t.description}`,
      label: `Toggle tool ${t.name}`,
      run: () => handleToggleTool(t.name),
    })),
  ];

  const visual = getStatusVisual(state.status);

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      <SidebarNav
        activeNav={activeNav}
        collapsed={collapsed}
        dotColor={visual.dot}
        logCount={logs.length}
        model={settings.ai_model}
        onSelectNav={setActiveNav}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        provider={settings.ai_provider}
        skillCount={skills.length}
        statusLabel={visual.label}
        toolsCount={settings.tools_enabled?.length || 0}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-semibold tracking-tight text-zinc-100">
                {NAV_SECTIONS.find((s) => s.id === activeNav)?.label}
              </h1>
              <span className="flex items-center gap-1.5 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-zinc-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${visual.dot} ${state.status === "connecting" || state.status === "qr_ready" ? "animate-pulse" : ""}`}
                />
                {visual.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                disabled={isPending}
                onClick={handleRestartBot}
                variant="outline"
              >
                <ArrowCounterClockwise />
                Reload
              </Button>
              <Button disabled={isPending} onClick={handleSaveSettings}>
                <FloppyDisk />
                Save
              </Button>
            </div>
          </div>

          {activeNav === "gateway" && (
            <GatewaySection settings={settings} state={state} />
          )}
          {activeNav === "ai_runtime" && (
            <AiRuntimeSection
              availableModels={availableModels}
              isFetchingModels={isFetchingModels}
              modelsFetchError={modelsFetchError}
              onFetchModels={() => {
                loadModels();
              }}
              onPresetSelect={handlePresetSelect}
              onProviderChange={handleProviderChange}
              setSettings={setSettings}
              settings={settings}
            />
          )}
          {activeNav === "tools" && (
            <ToolsSection
              enabledTools={settings.tools_enabled || []}
              onToggleTool={handleToggleTool}
            />
          )}
          {activeNav === "skills" && (
            <SkillsSection
              handleCreateSkillSubmit={handleCreateSkillSubmit}
              handleDeleteSkill={handleDeleteSkill}
              handleToggleSkill={handleToggleSkill}
              isPending={isPending}
              newSkillBody={newSkillBody}
              newSkillDesc={newSkillDesc}
              newSkillName={newSkillName}
              setNewSkillBody={setNewSkillBody}
              setNewSkillDesc={setNewSkillDesc}
              setNewSkillName={setNewSkillName}
              setShowSkillForm={setShowSkillForm}
              showSkillForm={showSkillForm}
              skills={skills}
            />
          )}
          {activeNav === "audit" && <AuditSection logs={logs} />}
        </div>
      </main>

      <CommandPalette commands={paletteCommands} />

      {feedbackMsg && (
        <div className="animate-fade-in fixed right-3 bottom-3 z-40 rounded-sm border border-white/10 bg-[#0b0b0e] px-3 py-2 font-mono text-[11px] text-zinc-200 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/")({
  loader: async (): Promise<DashboardData> => await fetchDashboardData(),
  component: DashboardPage,
});
