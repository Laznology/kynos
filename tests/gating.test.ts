import { describe, expect, it } from "bun:test";

import {
  buildAccessDeniedReply,
  isBotTriggered,
  isGroupAllowed,
  isUserAllowed,
  shouldSendDenial,
} from "../apps/bot/src/gating";

const BOT_ID = "62812345678:99@s.whatsapp.net";
const BOT_JID = "62812345678@s.whatsapp.net";

describe("Group gating", () => {
  it("empty allowlist blocks every group", () => {
    expect(isGroupAllowed([], "12036aaa@g.us")).toBe(false);
    expect(isGroupAllowed(["12036aaa@g.us"], "12036aaa@g.us")).toBe(true);
    expect(isGroupAllowed(["12036aaa@g.us"], "12036bbb@g.us")).toBe(false);
  });

  it("private chats are gated by the user allowlist", () => {
    expect(isUserAllowed([], BOT_JID)).toBe(false);
    expect(isUserAllowed([BOT_JID], BOT_JID)).toBe(true);
    expect(isUserAllowed([BOT_JID], "628999@s.whatsapp.net")).toBe(false);
  });

  it("denial reply is throttled per chat", () => {
    expect(shouldSendDenial("12036aaa@g.us", 1000)).toBe(true);
    expect(shouldSendDenial("12036aaa@g.us", 2000)).toBe(false);
    expect(shouldSendDenial("12036aaa@g.us", 600_000 + 5000)).toBe(true);
    expect(shouldSendDenial("12036bbb@g.us", 1000)).toBe(true);
  });

  it("denial reply carries the target id and owner handle", () => {
    const group = buildAccessDeniedReply(
      "@ilazer",
      "12036aaa@g.us",
      "628999@s.whatsapp.net",
      true
    );
    expect(group).toContain("12036aaa@g.us");
    expect(group).toContain("@ilazer");
    expect(group).not.toContain("628999");

    const dm = buildAccessDeniedReply(
      "@ilazer",
      "628999@s.whatsapp.net",
      "628999@s.whatsapp.net",
      false
    );
    expect(dm).toContain("628999");
  });

  it("mention or quote of the bot triggers, others do not", () => {
    expect(isBotTriggered({ mentionedJid: [BOT_JID] }, BOT_ID)).toBe(true);
    expect(isBotTriggered({ participant: BOT_JID }, BOT_ID)).toBe(true);
    expect(
      isBotTriggered({ mentionedJid: ["628999@s.whatsapp.net"] }, BOT_ID)
    ).toBe(false);
    expect(
      isBotTriggered({ participant: "628999@s.whatsapp.net" }, BOT_ID)
    ).toBe(false);
    expect(isBotTriggered(undefined, BOT_ID)).toBe(false);
    expect(isBotTriggered({}, BOT_ID)).toBe(false);
  });
});
