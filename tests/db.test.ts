import { describe, expect, it } from "bun:test";

import {
  addAuditLog,
  addChatMessage,
  addReminder,
  addUserFact,
  clearChatHistory,
  deleteReminder,
  deleteUserFact,
  exportDatabaseSnapshot,
  getAllReminders,
  getAllUserFacts,
  getAuditLogs,
  getBotState,
  getChatHistory,
  getDueReminders,
  getSettings,
  getUserFacts,
  initDatabase,
  importDatabaseSnapshot,
  markReminderSent,
  updateBotState,
  updateReminderStatus,
  updateSettings,
  updateUserFact,
} from "@kynos/db";
import { AVAILABLE_TOOLS, normalizeMaxOutputTokens } from "@kynos/shared";

describe("Database Repository (Drizzle ORM)", () => {
  initDatabase();

  it("should export and import a complete database snapshot", () => {
    const snapshot = exportDatabaseSnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.tables.settings.length).toBeGreaterThan(0);
    expect(snapshot.tables.botState).toHaveLength(1);

    importDatabaseSnapshot(snapshot);
    expect(exportDatabaseSnapshot().tables.settings.length).toBe(
      snapshot.tables.settings.length
    );
  });

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

  it("normalizes max output tokens to an integer", () => {
    expect(normalizeMaxOutputTokens("65.536")).toBe(65_536);
    expect(normalizeMaxOutputTokens(65.536)).toBe(65_536);
    expect(normalizeMaxOutputTokens(2048)).toBe(2048);
    expect(normalizeMaxOutputTokens("invalid")).toBe(2048);
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

  it("should store, retrieve, update, and delete user facts", () => {
    const testJid = "user1@s.whatsapp.net";
    const fact = addUserFact(testJid, "Prefers concise replies", "preference");
    expect(fact.id).toBeDefined();

    const facts = getUserFacts(testJid);
    expect(facts.length).toBeGreaterThanOrEqual(1);
    expect(facts.some((f) => f.fact === "Prefers concise replies")).toBe(true);

    const allFacts = getAllUserFacts();
    expect(allFacts.some((f) => f.id === fact.id)).toBe(true);

    const updated = updateUserFact(fact.id as number, "Prefers super concise replies", "custom");
    expect(updated).not.toBeNull();
    expect(updated?.fact).toBe("Prefers super concise replies");
    expect(updated?.category).toBe("custom");

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

    const all = getAllReminders(100);
    expect(all.some((r) => r.id === reminder.id)).toBe(true);

    const updated = updateReminderStatus(reminder.id as number, "cancelled");
    expect(updated?.status).toBe("cancelled");

    markReminderSent(reminder.id as number);
    const dueAfter = getDueReminders();
    expect(dueAfter.some((r) => r.id === reminder.id)).toBe(false);

    deleteReminder(reminder.id as number);
    const allAfter = getAllReminders(100);
    expect(allAfter.some((r) => r.id === reminder.id)).toBe(false);
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
