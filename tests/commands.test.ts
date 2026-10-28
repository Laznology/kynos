import { describe, expect, it } from "bun:test";

import { COMMAND_MAP, dispatchCommand } from "../apps/bot/src/commands";
import type { CommandContext } from "../apps/bot/src/commands";

describe("Slash Commands Dispatcher", () => {
  it("should register all expected slash commands", () => {
    expect(COMMAND_MAP.has("sticker")).toBe(true);
    expect(COMMAND_MAP.has("s")).toBe(true);
    expect(COMMAND_MAP.has("take")).toBe(true);
    expect(COMMAND_MAP.has("toimg")).toBe(true);
    expect(COMMAND_MAP.has("togif")).toBe(true);
    expect(COMMAND_MAP.has("tomp4")).toBe(true);
    expect(COMMAND_MAP.has("smeme")).toBe(true);
    expect(COMMAND_MAP.has("smemeimg")).toBe(true);
    expect(COMMAND_MAP.has("help")).toBe(true);
    expect(COMMAND_MAP.has("ping")).toBe(true);
    expect(COMMAND_MAP.has("clear")).toBe(true);
    expect(COMMAND_MAP.has("status")).toBe(true);
  });

  it("should dispatch /ping command and return latency info", async () => {
    let replyReceived = "";
    const ctx: CommandContext = {
      args: [],
      commandName: "ping",
      fullText: "/ping",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async (text) => {
        await Promise.resolve();
        replyReceived = text;
      },
      replyMedia: async () => {
        await Promise.resolve();
      },
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("ping", ctx);
    expect(dispatched).toBe(true);
    expect(replyReceived).toContain("PONG");
    expect(replyReceived).toContain("Bun");
  });

  it("should dispatch /help command and list capabilities", async () => {
    let replyReceived = "";
    const ctx: CommandContext = {
      args: [],
      commandName: "help",
      fullText: "/help",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async (text) => {
        await Promise.resolve();
        replyReceived = text;
      },
      replyMedia: async () => {
        await Promise.resolve();
      },
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("help", ctx);
    expect(dispatched).toBe(true);
    expect(replyReceived).toContain("KYNOS");
    expect(replyReceived).toContain("/s");
    expect(replyReceived).toContain("/smeme");
    expect(replyReceived).toContain("/toimg");
  });

  it("should return false for unknown commands", async () => {
    const ctx: CommandContext = {
      args: [],
      commandName: "unknown",
      fullText: "/unknown",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async () => {},
      replyMedia: async () => {},
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("unknown", ctx);
    expect(dispatched).toBe(false);
  });
});
