import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type {
  AIProvider,
  AppSettings,
  AuditLog,
  AutoReplyMode,
  BotState,
  BotStatus,
  ChatMessage,
  ReasoningEffort,
  Reminder,
  SkillRecord,
  UserFact,
} from "@kynos/shared";
import { defu } from "defu";
import { destr } from "destr";
import { asc, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

export {
  settingsTable,
  botStateTable,
  chatMemoryTable,
  userFactsTable,
  remindersTable,
  auditLogsTable,
  skillsTable,
} from "./schema";

const findWorkspaceRoot = (startDir: string): string => {
  let curr = startDir;
  while (curr !== "/" && curr !== ".") {
    try {
      const pkgPath = path.join(curr, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces) {
          return curr;
        }
      }
    } catch {
      // Ignore reading error
    }
    const parent = path.dirname(curr);
    if (parent === curr) {
      break;
    }
    curr = parent;
  }
  return startDir;
};

const getDbPath = (): string => {
  if (process.env.KYNOS_DB_PATH) {
    return process.env.KYNOS_DB_PATH;
  }
  const baseDir =
    process.env.KYNOS_DATA_DIR ||
    path.join(findWorkspaceRoot(process.cwd()), "data");
  mkdirSync(baseDir, { recursive: true });
  const filename =
    process.env.NODE_ENV === "test" ? "kynos.test.sqlite" : "kynos.sqlite";
  return path.join(baseDir, filename);
};

const DB_PATH = getDbPath();
export const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

let initialized = false;

export const initDatabase = (): void => {
  if (initialized) {
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT NOT NULL DEFAULT 'disconnected',
      qr_code TEXT,
      pairing_code TEXT,
      phone_number TEXT,
      last_connected INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      thoughts TEXT,
      tool_calls TEXT,
      tool_call_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_memory_jid ON chat_memory(jid, created_at);

    CREATE TABLE IF NOT EXISTS user_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT NOT NULL,
      fact TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_facts_jid ON user_facts(jid);

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT NOT NULL,
      task TEXT NOT NULL,
      remind_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status, remind_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      body TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'agent',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
  `);

  const existingState = db
    .select()
    .from(schema.botStateTable)
    .where(eq(schema.botStateTable.id, 1))
    .get();

  if (!existingState) {
    db.insert(schema.botStateTable)
      .values({
        id: 1,
        lastConnected: null,
        pairingCode: null,
        phoneNumber: null,
        qrCode: null,
        status: "disconnected",
        updatedAt: Date.now(),
      })
      .run();
  }

  const defaults: Record<string, string> = {
    ai_api_key: "",
    ai_base_url: "https://openrouter.ai/api/v1",
    ai_max_tokens: "2048",
    ai_model: "nousresearch/hermes-3-llama-3.1-70b",
    ai_provider: "openrouter",
    ai_reasoning_effort: "medium",
    ai_system_prompt: `You are Kynos, an autonomous WhatsApp AI assistant. You solve user queries with structured multi-step reasoning and integrated tools. You analyze problems step-by-step inside <thought>...</thought> tags before producing your final answer. You adapt fluently to the user's language (Indonesian or English). You are concise, precise, and objective. When external or real-time data is required, you invoke your available tools. You have a self-evolution mechanism via skill_manage to create, update, or patch skills when discovering reusable workflows.`,
    ai_temperature: "0.7",
    auto_reply_mode: "all",
    bot_prefix: "/",
    sticker_pack_author: "Kynos Bot",
    sticker_pack_name: "Kynos",
    tools_enabled: JSON.stringify([
      "web_search",
      "calculator",
      "datetime",
      "weather",
      "summarize",
      "reminder",
      "memory",
      "skill_manage",
    ]),
  };

  const now = Date.now();
  for (const [key, val] of Object.entries(defaults)) {
    const existing = db
      .select()
      .from(schema.settingsTable)
      .where(eq(schema.settingsTable.key, key))
      .get();

    if (!existing) {
      db.insert(schema.settingsTable)
        .values({ key, updatedAt: now, value: val })
        .run();
    }
  }

  initialized = true;
};

const parseProvider = (val: string | undefined): AIProvider => {
  if (
    val === "openai" ||
    val === "groq" ||
    val === "ollama" ||
    val === "custom"
  ) {
    return val;
  }
  return "openrouter";
};

const parseReasoningEffort = (val: string | undefined): ReasoningEffort => {
  if (val === "low" || val === "high") {
    return val;
  }
  return "medium";
};

const parseAutoReply = (val: string | undefined): AutoReplyMode => {
  if (val === "mention" || val === "dm_only") {
    return val;
  }
  return "all";
};

export const getSettings = (): AppSettings => {
  initDatabase();
  const rows = db.select().from(schema.settingsTable).all();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    map[r.key] = destr(r.value);
  }

  const merged = defu(map, {
    ai_api_key: "",
    ai_base_url: "https://openrouter.ai/api/v1",
    ai_max_tokens: 2048,
    ai_model: "nousresearch/hermes-3-llama-3.1-70b",
    ai_provider: "openrouter",
    ai_reasoning_effort: "medium",
    ai_system_prompt:
      "You are Kynos, an autonomous WhatsApp AI assistant. You solve user queries with structured multi-step reasoning and integrated tools. You analyze problems step-by-step inside <thought>...</thought> tags before producing your final answer. You adapt fluently to the user's language (Indonesian or English). You are concise, precise, and objective. When external or real-time data is required, you invoke your available tools. You have a self-evolution mechanism via skill_manage to create, update, or patch skills when discovering reusable workflows.",
    ai_temperature: 0.7,
    auto_reply_mode: "all",
    bot_prefix: "/",
    sticker_pack_author: "Kynos Bot",
    sticker_pack_name: "Kynos",
    tools_enabled: [
      "web_search",
      "calculator",
      "datetime",
      "weather",
      "summarize",
      "reminder",
      "memory",
      "skill_manage",
    ],
  });

  return {
    ai_api_key: String(merged.ai_api_key),
    ai_base_url: String(merged.ai_base_url),
    ai_max_tokens: Number(merged.ai_max_tokens),
    ai_model: String(merged.ai_model),
    ai_provider: parseProvider(String(merged.ai_provider)),
    ai_reasoning_effort: parseReasoningEffort(
      String(merged.ai_reasoning_effort)
    ),
    ai_system_prompt: String(merged.ai_system_prompt),
    ai_temperature: Number(merged.ai_temperature),
    auto_reply_mode: parseAutoReply(String(merged.auto_reply_mode)),
    bot_prefix: String(merged.bot_prefix),
    sticker_pack_author: String(merged.sticker_pack_author),
    sticker_pack_name: String(merged.sticker_pack_name),
    tools_enabled: Array.isArray(merged.tools_enabled)
      ? merged.tools_enabled.map(String)
      : [],
  };
};

export const updateSettings = (partial: Partial<AppSettings>): AppSettings => {
  initDatabase();
  const now = Date.now();

  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) {
      const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
      db.insert(schema.settingsTable)
        .values({ key: k, updatedAt: now, value: valStr })
        .onConflictDoUpdate({
          set: { updatedAt: now, value: valStr },
          target: schema.settingsTable.key,
        })
        .run();
    }
  }

  return getSettings();
};

export const getBotState = (): BotState => {
  initDatabase();
  const row = db
    .select()
    .from(schema.botStateTable)
    .where(eq(schema.botStateTable.id, 1))
    .get();

  if (!row) {
    return {
      id: 1,
      last_connected: null,
      pairing_code: null,
      phone_number: null,
      qr_code: null,
      status: "disconnected",
      updated_at: Date.now(),
    };
  }
  return {
    id: row.id,
    last_connected: row.lastConnected,
    pairing_code: row.pairingCode,
    phone_number: row.phoneNumber,
    qr_code: row.qrCode,
    status: (row.status as BotStatus) || "disconnected",
    updated_at: row.updatedAt,
  };
};

export const updateBotState = (
  partial: Partial<Omit<BotState, "id">>
): BotState => {
  initDatabase();
  const current = getBotState();
  const updated: BotState = {
    ...current,
    ...partial,
    updated_at: Date.now(),
  };

  db.update(schema.botStateTable)
    .set({
      lastConnected: updated.last_connected,
      pairingCode: updated.pairing_code,
      phoneNumber: updated.phone_number,
      qrCode: updated.qr_code,
      status: updated.status,
      updatedAt: updated.updated_at,
    })
    .where(eq(schema.botStateTable.id, 1))
    .run();

  return updated;
};

export const getChatHistory = (jid: string, limit = 15): ChatMessage[] => {
  initDatabase();
  const rows = db
    .select()
    .from(schema.chatMemoryTable)
    .where(eq(schema.chatMemoryTable.jid, jid))
    .orderBy(desc(schema.chatMemoryTable.createdAt))
    .limit(limit)
    .all();

  return rows.toReversed().map((r) => ({
    content: r.content,
    created_at: r.createdAt,
    id: r.id,
    jid: r.jid,
    role: (r.role as ChatMessage["role"]) || "user",
    thoughts: r.thoughts,
    tool_call_id: r.toolCallId,
    tool_calls: r.toolCalls,
  }));
};

export const addChatMessage = (
  msg: Omit<ChatMessage, "id" | "created_at"> & { created_at?: number }
): ChatMessage => {
  initDatabase();
  const createdAt = msg.created_at || Date.now();
  const inserted = db
    .insert(schema.chatMemoryTable)
    .values({
      content: msg.content,
      createdAt,
      jid: msg.jid,
      role: msg.role,
      thoughts: msg.thoughts || null,
      toolCallId: msg.tool_call_id || null,
      toolCalls: msg.tool_calls || null,
    })
    .returning()
    .get();

  return {
    ...msg,
    created_at: createdAt,
    id: inserted.id,
  };
};

export const clearChatHistory = (jid: string): void => {
  initDatabase();
  db.delete(schema.chatMemoryTable)
    .where(eq(schema.chatMemoryTable.jid, jid))
    .run();
};

export const getUserFacts = (jid: string): UserFact[] => {
  initDatabase();
  const rows = db
    .select()
    .from(schema.userFactsTable)
    .where(eq(schema.userFactsTable.jid, jid))
    .orderBy(asc(schema.userFactsTable.createdAt))
    .all();

  return rows.map((r) => ({
    category: r.category,
    created_at: r.createdAt,
    fact: r.fact,
    id: r.id,
    jid: r.jid,
  }));
};

export const addUserFact = (
  jid: string,
  fact: string,
  category = "general"
): UserFact => {
  initDatabase();
  const now = Date.now();
  const inserted = db
    .insert(schema.userFactsTable)
    .values({
      category,
      createdAt: now,
      fact,
      jid,
    })
    .returning()
    .get();

  return {
    category,
    created_at: now,
    fact,
    id: inserted.id,
    jid,
  };
};

export const deleteUserFact = (id: number): void => {
  initDatabase();
  db.delete(schema.userFactsTable)
    .where(eq(schema.userFactsTable.id, id))
    .run();
};

export const addReminder = (
  jid: string,
  task: string,
  remindAt: number
): Reminder => {
  initDatabase();
  const now = Date.now();
  const inserted = db
    .insert(schema.remindersTable)
    .values({
      createdAt: now,
      jid,
      remindAt,
      status: "pending",
      task,
    })
    .returning()
    .get();

  return {
    created_at: now,
    id: inserted.id,
    jid,
    remind_at: remindAt,
    status: "pending",
    task,
  };
};

export const getDueReminders = (): Reminder[] => {
  initDatabase();
  const now = Date.now();
  const rows = db
    .select()
    .from(schema.remindersTable)
    .where(lte(schema.remindersTable.remindAt, now))
    .orderBy(asc(schema.remindersTable.remindAt))
    .all();

  return rows
    .filter((r) => r.status === "pending")
    .map((r) => ({
      created_at: r.createdAt,
      id: r.id,
      jid: r.jid,
      remind_at: r.remindAt,
      status: (r.status as Reminder["status"]) || "pending",
      task: r.task,
    }));
};

export const markReminderSent = (id: number): void => {
  initDatabase();
  db.update(schema.remindersTable)
    .set({ status: "sent" })
    .where(eq(schema.remindersTable.id, id))
    .run();
};

export const addAuditLog = (
  level: "info" | "warn" | "error",
  category: "bot" | "agent" | "command" | "media" | "system",
  message: string,
  metadata?: unknown
): AuditLog => {
  initDatabase();
  const now = Date.now();
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  const inserted = db
    .insert(schema.auditLogsTable)
    .values({
      category,
      createdAt: now,
      level,
      message,
      metadata: metaStr,
    })
    .returning()
    .get();

  return {
    category,
    created_at: now,
    id: inserted.id,
    level,
    message,
    metadata: metaStr,
  };
};

export const getAuditLogs = (limit = 50): AuditLog[] => {
  initDatabase();
  const rows = db
    .select()
    .from(schema.auditLogsTable)
    .orderBy(desc(schema.auditLogsTable.createdAt))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    category: (r.category as AuditLog["category"]) || "system",
    created_at: r.createdAt,
    id: r.id,
    level: (r.level as AuditLog["level"]) || "info",
    message: r.message,
    metadata: r.metadata,
  }));
};

export const getSkills = (onlyEnabled = false): SkillRecord[] => {
  initDatabase();
  const query = db
    .select()
    .from(schema.skillsTable)
    .orderBy(desc(schema.skillsTable.updatedAt));

  const rows = query.all();

  return rows
    .filter((r) => (onlyEnabled ? r.enabled === 1 : true))
    .map((r) => ({
      body: r.body,
      createdAt: r.createdAt,
      description: r.description,
      enabled: r.enabled === 1,
      id: r.id,
      name: r.name,
      source: (r.source as "agent" | "user") || "agent",
      updatedAt: r.updatedAt,
      version: r.version,
    }));
};

export const getSkillByName = (name: string): SkillRecord | null => {
  initDatabase();
  const row = db
    .select()
    .from(schema.skillsTable)
    .where(eq(schema.skillsTable.name, name))
    .get();

  if (!row) {
    return null;
  }

  return {
    body: row.body,
    createdAt: row.createdAt,
    description: row.description,
    enabled: row.enabled === 1,
    id: row.id,
    name: row.name,
    source: (row.source as "agent" | "user") || "agent",
    updatedAt: row.updatedAt,
    version: row.version,
  };
};

export const createSkill = (params: {
  name: string;
  description: string;
  body: string;
  source?: "agent" | "user";
}): SkillRecord => {
  initDatabase();
  const now = Date.now();
  const cleanName = params.name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]/gu, "-");

  const existing = getSkillByName(cleanName);
  if (existing) {
    throw new Error(
      `Skill '${cleanName}' already exists. Use action 'update' or 'patch'.`
    );
  }

  const inserted = db
    .insert(schema.skillsTable)
    .values({
      body: params.body.trim(),
      createdAt: now,
      description: params.description.trim(),
      enabled: 1,
      name: cleanName,
      source: params.source || "agent",
      updatedAt: now,
      version: 1,
    })
    .returning()
    .get();

  return {
    body: inserted.body,
    createdAt: inserted.createdAt,
    description: inserted.description,
    enabled: inserted.enabled === 1,
    id: inserted.id,
    name: inserted.name,
    source: (inserted.source as "agent" | "user") || "agent",
    updatedAt: inserted.updatedAt,
    version: inserted.version,
  };
};

export const updateSkill = (params: {
  name: string;
  description?: string;
  body: string;
}): SkillRecord => {
  initDatabase();
  const cleanName = params.name.trim().toLowerCase();
  const existing = getSkillByName(cleanName);
  if (!existing) {
    throw new Error(`Skill '${cleanName}' does not exist.`);
  }

  const now = Date.now();
  const newVersion = existing.version + 1;
  const newDesc = params.description?.trim() || existing.description;

  db.update(schema.skillsTable)
    .set({
      body: params.body.trim(),
      description: newDesc,
      updatedAt: now,
      version: newVersion,
    })
    .where(eq(schema.skillsTable.name, cleanName))
    .run();

  return {
    ...existing,
    body: params.body.trim(),
    description: newDesc,
    updatedAt: now,
    version: newVersion,
  };
};

export const patchSkill = (name: string, appendBody: string): SkillRecord => {
  initDatabase();
  const cleanName = name.trim().toLowerCase();
  const existing = getSkillByName(cleanName);
  if (!existing) {
    throw new Error(`Skill '${cleanName}' does not exist.`);
  }

  const now = Date.now();
  const newBody = `${existing.body}\n\n${appendBody.trim()}`;
  const newVersion = existing.version + 1;

  db.update(schema.skillsTable)
    .set({
      body: newBody,
      updatedAt: now,
      version: newVersion,
    })
    .where(eq(schema.skillsTable.name, cleanName))
    .run();

  return {
    ...existing,
    body: newBody,
    updatedAt: now,
    version: newVersion,
  };
};

export const deleteSkill = (name: string): boolean => {
  initDatabase();
  const cleanName = name.trim().toLowerCase();
  const deleted = db
    .delete(schema.skillsTable)
    .where(eq(schema.skillsTable.name, cleanName))
    .returning()
    .all();

  return deleted.length > 0;
};

export const toggleSkill = (name: string, enabled: boolean): SkillRecord => {
  initDatabase();
  const cleanName = name.trim().toLowerCase();
  const existing = getSkillByName(cleanName);
  if (!existing) {
    throw new Error(`Skill '${cleanName}' does not exist.`);
  }

  const now = Date.now();
  db.update(schema.skillsTable)
    .set({
      enabled: enabled ? 1 : 0,
      updatedAt: now,
    })
    .where(eq(schema.skillsTable.name, cleanName))
    .run();

  return {
    ...existing,
    enabled,
    updatedAt: now,
  };
};
