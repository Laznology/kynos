import { describe, expect, it } from "bun:test";

import { isBotTriggered, isGroupAllowed } from "../apps/bot/src/gating";

const BOT_ID = "62812345678:99@s.whatsapp.net";
const BOT_JID = "62812345678@s.whatsapp.net";

describe("Group gating", () => {
  it("empty allowlist admits every group, non-empty restricts by JID", () => {
    expect(isGroupAllowed([], "12036aaa@g.us")).toBe(true);
    expect(isGroupAllowed(["12036aaa@g.us"], "12036aaa@g.us")).toBe(true);
    expect(isGroupAllowed(["12036aaa@g.us"], "12036bbb@g.us")).toBe(false);
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
