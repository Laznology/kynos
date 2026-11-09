import { describe, expect, it } from "bun:test";

import { getSettings } from "@kynos/db";
import { destr } from "destr";

import {
  buildKynosSystemPrompt,
  extractThoughts,
  formatUserPrompt,
} from "../apps/bot/src/agent/prompt";
import {
  browserAutomationTool,
  calculatorTool,
  createReminderTool,
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

  it("should expose browser automation and reject unsafe URL schemes", async () => {
    const tools = getAgentTools({ jid: "test@s.whatsapp.net" });
    expect(tools.browser_automation).toBeDefined();

    const raw = await browserAutomationTool.execute(
      { action: "open", url: "file:///etc/passwd" },
      { context: {}, messages: [], toolCallId: "test-browser-call" }
    );
    const parsed = destr<{ error: string }>(raw);
    expect(parsed.error).toContain("Only HTTP and HTTPS URLs are allowed");
  });

  it("exposes no tools when allowlist is empty", () => {
    const tools = getAgentTools({ jid: "test@s.whatsapp.net" }, []);
    expect(Object.keys(tools)).toEqual([]);
  });

  it("formats user prompt with quoted message context", () => {
    const plain = formatUserPrompt("Halo bot");
    expect(plain).toBe("Halo bot");

    const withQuote = formatUserPrompt("apa ini?", {
      sender: "628123456789:1@s.whatsapp.net",
      text: "Laporan kuartal 3 selesai",
    });
    expect(withQuote).toContain("[Quoted message from 628123456789]");
    expect(withQuote).toContain('"Laporan kuartal 3 selesai"');
    expect(withQuote).toContain("User message: apa ini?");

    const fromBot = formatUserPrompt("jelaskan lagi", {
      isFromMe: true,
      text: "Berikut langkah pertama",
    });
    expect(fromBot).toContain("[Quoted message from Kynos (you)]");
    expect(fromBot).toContain("User message: jelaskan lagi");

    const stickerOnly = formatUserPrompt("buatkan gambar serupa", {
      isSticker: true,
      sender: "628999@s.whatsapp.net",
    });
    expect(stickerOnly).toContain("[Quoted sticker from 628999]");
    expect(stickerOnly).toContain("User message: buatkan gambar serupa");

    const quoteOnly = formatUserPrompt("", {
      sender: "628111@s.whatsapp.net",
      text: "Catatan penting meeting",
    });
    expect(quoteOnly).toBe(
      '[Quoted message from 628111]:\n"Catatan penting meeting"'
    );
  });

  it("should schedule reminder and trigger sendEvent with duration and location", async () => {
    let sentEvent: {
      description?: string;
      endDate?: Date;
      isCancelled?: boolean;
      location?: { degreesLatitude: number; degreesLongitude: number; name?: string };
      name: string;
      startDate: Date;
    } | null = null;
    const tool = createReminderTool({
      jid: "user-reminder@s.whatsapp.net",
      sendEvent: (ev) => {
        sentEvent = ev;
        return Promise.resolve();
      },
    });

    const res = await tool.execute(
      { delay_minutes: 30, duration_minutes: 60, location_name: "Ruang Meeting A", task: "Meeting evaluasi" },
      { context: {}, messages: [], toolCallId: "test-reminder" }
    );
    const parsed = destr<{
      delay_minutes: number;
      duration_minutes: number;
      event_created: boolean;
      location: string;
      success: boolean;
      task: string;
    }>(res);

    expect(parsed.success).toBe(true);
    expect(parsed.task).toBe("Meeting evaluasi");
    expect(parsed.duration_minutes).toBe(60);
    expect(parsed.location).toBe("Ruang Meeting A");
    expect(parsed.event_created).toBe(true);
    expect(sentEvent).not.toBeNull();
    expect(sentEvent?.name).toBe("Meeting evaluasi");
    expect(sentEvent?.location?.name).toBe("Ruang Meeting A");
    expect(sentEvent?.endDate).toBeDefined();
  });
});
