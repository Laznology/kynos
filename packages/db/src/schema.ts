import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
  key: text("key").primaryKey(),
  updatedAt: integer("updated_at").notNull(),
  value: text("value").notNull(),
});

export const botStateTable = sqliteTable("bot_state", {
  id: integer("id").primaryKey(),
  lastConnected: integer("last_connected"),
  pairingCode: text("pairing_code"),
  phoneNumber: text("phone_number"),
  qrCode: text("qr_code"),
  status: text("status").notNull().default("disconnected"),
  updatedAt: integer("updated_at").notNull(),
});

export const chatMemoryTable = sqliteTable(
  "chat_memory",
  {
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    jid: text("jid").notNull(),
    role: text("role").notNull(),
    thoughts: text("thoughts"),
    toolCallId: text("tool_call_id"),
    toolCalls: text("tool_calls"),
  },
  (table) => [index("idx_chat_memory_jid").on(table.jid, table.createdAt)]
);

export const userFactsTable = sqliteTable(
  "user_facts",
  {
    category: text("category").notNull().default("general"),
    createdAt: integer("created_at").notNull(),
    fact: text("fact").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    jid: text("jid").notNull(),
  },
  (table) => [index("idx_user_facts_jid").on(table.jid)]
);

export const remindersTable = sqliteTable(
  "reminders",
  {
    createdAt: integer("created_at").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    jid: text("jid").notNull(),
    remindAt: integer("remind_at").notNull(),
    status: text("status").notNull().default("pending"),
    task: text("task").notNull(),
  },
  (table) => [index("idx_reminders_status").on(table.status, table.remindAt)]
);

export const auditLogsTable = sqliteTable(
  "audit_logs",
  {
    category: text("category").notNull(),
    createdAt: integer("created_at").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    level: text("level").notNull(),
    message: text("message").notNull(),
    metadata: text("metadata"),
  },
  (table) => [index("idx_audit_logs_created").on(table.createdAt)]
);

export const skillsTable = sqliteTable(
  "skills",
  {
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
    description: text("description").notNull(),
    enabled: integer("enabled").notNull().default(1),
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    source: text("source").notNull().default("agent"),
    updatedAt: integer("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [index("idx_skills_name").on(table.name)]
);
