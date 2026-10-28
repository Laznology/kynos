import {
  addAuditLog,
  addChatMessage,
  getChatHistory,
  getSettings,
  getSkills,
  getUserFacts,
} from "@kynos/db";
import { generateText, stepCountIs } from "ai";

import { getLanguageModel } from "./client";
import { formatAgentErrorMessage } from "./error-handler";
import { buildKynosSystemPrompt, extractThoughts } from "./prompt";
import { getAgentTools } from "./tools";
import type { AgentContext, AgentRunResult } from "./types";

interface ModelMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    addAuditLog("error", "agent", `AI execution error: ${errorMsg}`, {
      jid: context.jid,
      prompt: userPrompt,
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
