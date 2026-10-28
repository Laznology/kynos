import { describe, expect, it } from "bun:test";

import {
  initDatabase,
  getSettings,
  updateSettings,
  getBotState,
  updateBotState,
  addUserFact,
  getUserFacts,
  deleteUserFact,
  addReminder,
  getDueReminders,
  markReminderSent,
  addChatMessage,
  getChatHistory,
  clearChatHistory,
  addAuditLog,
  getAuditLogs,
} from "@kynos/db";
import { AVAILABLE_TOOLS } from "@kynos/shared";

describe("Database Repository (Drizzle ORM)", () => {
  initDatabase();

  it("should initialize default settings and persist updates", () => {
    const s = getSettings();
    expect(s.ai_provider).toBe("openrouter");
    expect(s.bot_prefix).toBe("/");

    const updated = updateSettings({
      ai_temperature: 0.9,
      sticker_pack_name: "TestPack",
    });
    expect(updated.ai_temperature).toBe(0.9);
    expect(updated.sticker_pack_name).toBe("TestPack");

    const reloaded = getSettings();
    expect(reloaded.ai_temperature).toBe(0.9);
    expect(reloaded.sticker_pack_name).toBe("TestPack");

    const withGroups = updateSettings({
      allowed_groups: ["12036aaa@g.us", "not-a-group"],
    });
    expect(withGroups.allowed_groups).toEqual(["12036aaa@g.us"]);
    updateSettings({ allowed_groups: [] });
    expect(getSettings().allowed_groups).toEqual([]);
  });

  it("normalizes allowed_users into bare whatsapp JIDs", () => {
    const normalized = updateSettings({
      allowed_users: [
        "+62 812-3456-7890",
        "628999@s.whatsapp.net",
        "12036a@g.us",
        "abc",
      ],
    });
    expect(normalized.allowed_users).toEqual([
      "6281234567890@s.whatsapp.net",
      "628999@s.whatsapp.net",
    ]);
    updateSettings({ allowed_users: [] });
    expect(getSettings().allowed_users).toEqual([]);
  });

  it("keeps tools_enabled as unique registry ids and honors an empty list", () => {
    const dirty = updateSettings({
      tools_enabled: [
        "web_search",
        "web_search",
        "Web Search",
        "Calculator",
        "calculator",
        "not_a_tool",
      ],
    });
    expect(dirty.tools_enabled).toEqual(["web_search", "calculator"]);

    const cleared = updateSettings({ tools_enabled: [] });
    expect(cleared.tools_enabled).toEqual([]);

    const allIds = AVAILABLE_TOOLS.map((t) => t.id);
    updateSettings({ tools_enabled: allIds });
    expect(getSettings().tools_enabled).toEqual(allIds);
  });

  it("should update and fetch bot state", () => {
    updateBotState({ qr_code: "data:test_qr", status: "qr_ready" });
    const state = getBotState();
    expect(state.status).toBe("qr_ready");
    expect(state.qr_code).toBe("data:test_qr");

    updateBotState({ phone_number: "62811111", status: "connected" });
    const connectedState = getBotState();
    expect(connectedState.status).toBe("connected");
    expect(connectedState.phone_number).toBe("62811111");
  });

  it("should store and retrieve user facts", () => {
    const testJid = "user1@s.whatsapp.net";
    const fact = addUserFact(testJid, "Prefers concise replies", "preference");
    expect(fact.id).toBeDefined();

    const facts = getUserFacts(testJid);
    expect(facts.length).toBeGreaterThanOrEqual(1);
    expect(facts.some((f) => f.fact === "Prefers concise replies")).toBe(true);

    deleteUserFact(fact.id as number);
    const factsAfter = getUserFacts(testJid);
    expect(factsAfter.some((f) => f.id === fact.id)).toBe(false);
  });

  it("should manage reminders and due queue", () => {
    const testJid = "user2@s.whatsapp.net";
    const reminder = addReminder(
      testJid,
      "Check database backups",
      Date.now() - 5000
    );
    expect(reminder.status).toBe("pending");

    const due = getDueReminders();
    expect(due.some((r) => r.id === reminder.id)).toBe(true);

    markReminderSent(reminder.id as number);
    const dueAfter = getDueReminders();
    expect(dueAfter.some((r) => r.id === reminder.id)).toBe(false);
  });

  it("should handle chat history storage and clearing", () => {
    const testJid = "chat_test@s.whatsapp.net";
    clearChatHistory(testJid);

    addChatMessage({ content: "Hello Kynos", jid: testJid, role: "user" });
    addChatMessage({
      content: "Hello, how can I assist?",
      jid: testJid,
      role: "assistant",
    });

    const history = getChatHistory(testJid);
    expect(history.length).toBe(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");

    clearChatHistory(testJid);
    expect(getChatHistory(testJid).length).toBe(0);
  });

  it("should append audit logs", () => {
    addAuditLog("info", "system", "Unit test audit event", { test: true });
    const logs = getAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.message === "Unit test audit event")).toBe(true);
  });
});
