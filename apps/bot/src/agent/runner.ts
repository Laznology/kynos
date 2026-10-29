import {
  addAuditLog,
  addChatMessage,
  getChatHistory,
  getSettings,
  getSkills,
  getUserFacts,
} from "@kynos/db";
import { generateText, stepCountIs } from "ai";
import { destr } from "destr";

import { getLanguageModel } from "./client";
import { formatAgentErrorMessage } from "./error-handler";
import { buildKynosSystemPrompt, extractThoughts } from "./prompt";
import { getAgentTools } from "./tools";
import type { AgentContext, AgentRunResult } from "./types";

interface ModelMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const extractStatusCode = (data: unknown): number | undefined => {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  if ("statusCode" in data && typeof data.statusCode === "number") {
    return data.statusCode;
  }
  if ("status" in data && typeof data.status === "number") {
    return data.status;
  }
  if ("code" in data && typeof data.code === "number") {
    return data.code;
  }
  if ("error" in data && data.error && typeof data.error === "object") {
    const nested = data.error;
    if ("code" in nested && typeof nested.code === "number") {
      return nested.code;
    }
  }
  return undefined;
};

const extractResponseBody = (err: object): unknown => {
  if ("responseBody" in err && err.responseBody !== undefined) {
    return typeof err.responseBody === "string"
      ? destr(err.responseBody)
      : err.responseBody;
  }
  if ("data" in err && err.data !== undefined) {
    return typeof err.data === "string" ? destr(err.data) : err.data;
  }
  return null;
};

const parseErrorTrace = (error: unknown, errorMsg: string) => {
  let apiError: unknown = null;
  let statusCode: number | undefined;

  if (error && typeof error === "object") {
    apiError = extractResponseBody(error);
    statusCode = extractStatusCode(error);
  }
  if (!apiError && typeof errorMsg === "string") {
    const jsonMatch = errorMsg.match(/\{[\s\S]*\}/u);
    if (jsonMatch) {
      const parsed = destr(jsonMatch[0]);
      if (typeof parsed === "object" && parsed !== null) {
        apiError = parsed;
      }
    }
    if (!statusCode) {
      const statusMatch = errorMsg.match(/\[(?<code>\d{3})\]/u);
      if (statusMatch?.groups?.code) {
        statusCode = Math.trunc(Number(statusMatch.groups.code));
      }
    }
  }

  if (!statusCode && apiError) {
    statusCode = extractStatusCode(apiError);
  }

  return {
    apiError,
    message: errorMsg,
    name: error instanceof Error ? error.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined,
    statusCode,
  };
};
export const runKynosAgent = async (
  userPrompt: string,
  context: AgentContext
): Promise<AgentRunResult> => {
  const settings = getSettings();
  const model = getLanguageModel(settings);
  const userFacts = getUserFacts(context.jid);
  const skills = getSkills(true);
  const tools = getAgentTools(context, settings.tools_enabled);
  const systemPrompt = buildKynosSystemPrompt(
    settings,
    context,
    userFacts,
    skills
  );

  const history = getChatHistory(context.jid, 8);
  const messages: ModelMessage[] = [];

  for (const h of history) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({
        content: h.content,
        role: h.role,
      });
    }
  }

  messages.push({
    content: userPrompt,
    role: "user",
  });

  const toolCallsExecuted: AgentRunResult["toolCallsExecuted"] = [];
  let replyText = "";
  let extractedThoughtsText = "";

  try {
    const result = await generateText({
      messages,
      model,
      onStepFinish: (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            const tr = step.toolResults?.find(
              (r) => r.toolCallId === tc.toolCallId
            );
            let rawOutput = "";
            if (tr && "result" in tr) {
              rawOutput =
                typeof tr.result === "string"
                  ? tr.result
                  : JSON.stringify(tr.result ?? "");
            }
            const rawArgs =
              "args" in tc ? (tc.args as Record<string, unknown>) : {};
            toolCallsExecuted.push({
              arguments: rawArgs,
              name: tc.toolName,
              result: rawOutput,
            });
            addAuditLog("info", "agent", `Executed tool '${tc.toolName}'`, {
              arguments: rawArgs,
              jid: context.jid,
            });
          }
        }
      },
      stopWhen: stepCountIs(5),
      system: systemPrompt,
      temperature: settings.ai_temperature,
      tools,
    });

    const parsed = extractThoughts(result.text);
    replyText = parsed.cleanText;
    extractedThoughtsText = parsed.thoughts || "";

    addAuditLog(
      "info",
      "agent",
      `AI generated reply (${replyText.length} chars)`,
      {
        modelConfig: {
          baseUrl: settings.ai_base_url || null,
          maxTokens: settings.ai_max_tokens,
          model: settings.ai_model,
          provider: settings.ai_provider,
          temperature: settings.ai_temperature,
        },
        request: {
          historyCount: history.length,
          isGroup: context.isGroup,
          jid: context.jid,
          prompt: userPrompt,
          senderName: context.senderName,
          toolCallsExecuted,
          tools: Object.keys(tools),
        },
        stats: {
          hasThoughts: Boolean(extractedThoughtsText),
          replyLength: replyText.length,
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const parsedTrace = parseErrorTrace(error, errorMsg);

    addAuditLog("error", "agent", `AI execution error: ${errorMsg}`, {
      error: parsedTrace,
      modelConfig: {
        baseUrl: settings.ai_base_url || null,
        maxTokens: settings.ai_max_tokens,
        model: settings.ai_model,
        provider: settings.ai_provider,
        reasoningEffort: settings.ai_reasoning_effort,
        temperature: settings.ai_temperature,
      },
      request: {
        historyCount: history.length,
        isGroup: context.isGroup,
        jid: context.jid,
        prompt: userPrompt,
        senderName: context.senderName,
        toolCallsExecuted,
        tools: Object.keys(tools),
      },
    });
    replyText = formatAgentErrorMessage(error);
  }

  addChatMessage({
    content: userPrompt,
    jid: context.jid,
    role: "user",
  });

  addChatMessage({
    content: replyText,
    jid: context.jid,
    role: "assistant",
    thoughts: extractedThoughtsText || null,
    tool_calls:
      toolCallsExecuted.length > 0 ? JSON.stringify(toolCallsExecuted) : null,
  });

  return {
    reply: replyText,
    thoughts: extractedThoughtsText || undefined,
    toolCallsExecuted,
  };
};
