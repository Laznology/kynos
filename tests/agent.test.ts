import { describe, expect, it } from "bun:test";

import { getSettings } from "@kynos/db";
import { destr } from "destr";

import {
  buildKynosSystemPrompt,
  extractThoughts,
} from "../apps/bot/src/agent/prompt";
import {
  calculatorTool,
  datetimeTool,
  getAgentTools,
} from "../apps/bot/src/agent/tools";

describe("Agent Core & Tools (Vercel AI SDK)", () => {
  it("should evaluate math with calculatorTool safely without eval", async () => {
    const raw = await calculatorTool.execute(
      { expression: "(50 * 2) + sqrt(100) - 2^3" },
      { context: {}, messages: [], toolCallId: "test-call-1" }
    );
    const parsed = destr<{ result: number }>(raw);
    expect(parsed.result).toBe(102);

    const errRaw = await calculatorTool.execute(
      { expression: "10 / 0" },
      { context: {}, messages: [], toolCallId: "test-call-2" }
    );
    const errParsed = destr<{ error: string }>(errRaw);
    expect(errParsed.error).toContain("Division by zero");
  });

  it("should query time and timezone with datetimeTool", async () => {
    const raw = await datetimeTool.execute(
      { timezone: "Asia/Jakarta" },
      { context: {}, messages: [], toolCallId: "test-call-3" }
    );
    const parsed = destr<{ timezone: string; unix: number; formatted: string }>(
      raw
    );
    expect(parsed.timezone).toBe("Asia/Jakarta");
    expect(parsed.unix).toBeGreaterThan(0);
    expect(parsed.formatted).toBeDefined();
  });

  it("should construct contextual system prompt without markdown tables or emojis", () => {
    const settings = getSettings();
    const prompt = buildKynosSystemPrompt(
      settings,
      { isGroup: false, jid: "tester@s.whatsapp.net", senderName: "Alice" },
      [
        {
          category: "work",
          created_at: Date.now(),
          fact: "Works on backend",
          id: 1,
          jid: "tester@s.whatsapp.net",
        },
      ],
      [
        {
          body: "Check tests",
          createdAt: Date.now(),
          description: "Review pull requests",
          enabled: true,
          id: 1,
          name: "code-review",
          source: "agent",
          updatedAt: Date.now(),
          version: 1,
        },
      ]
    );

    expect(prompt).toContain("Kynos");
    expect(prompt).toContain("tester@s.whatsapp.net");
    expect(prompt).toContain("Works on backend");
    expect(prompt).toContain("code-review");
    expect(prompt).toContain("<thought>");
  });

  it("should extract internal thoughts from model raw output", () => {
    const raw =
      "<thought>Need to verify user identity before continuing.</thought>Identity verified.";
    const { thoughts, cleanText } = extractThoughts(raw);
    expect(thoughts).toBe("Need to verify user identity before continuing.");
    expect(cleanText).toBe("Identity verified.");

    const rawNoThoughts = "Straight response without reasoning block.";
    const parsedNoThoughts = extractThoughts(rawNoThoughts);
    expect(parsedNoThoughts.thoughts).toBeUndefined();
    expect(parsedNoThoughts.cleanText).toBe(
      "Straight response without reasoning block."
    );
  });

  it("should filter enabled tools based on configuration", () => {
    const tools = getAgentTools({ jid: "test@s.whatsapp.net" }, [
      "calculator",
      "datetime",
    ]);
    expect(tools.calculator).toBeDefined();
    expect(tools.datetime).toBeDefined();
    expect(tools.web_search).toBeUndefined();
  });

  it("exposes no tools when the allowlist is empty", () => {
    const tools = getAgentTools({ jid: "test@s.whatsapp.net" }, []);
    expect(Object.keys(tools)).toEqual([]);
  });
});
