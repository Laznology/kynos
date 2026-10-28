export type BotStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "qr_ready";

export interface BotState {
  id: number;
  status: BotStatus;
  qr_code: string | null;
  pairing_code: string | null;
  phone_number: string | null;
  last_connected: number | null;
  updated_at: number;
}

export type AIProvider = "openrouter" | "openai" | "groq" | "ollama" | "custom";
export type ReasoningEffort = "low" | "medium" | "high";
export type AutoReplyMode = "all" | "mention" | "dm_only";

export interface AppSettings {
  ai_provider: AIProvider;
  ai_model: string;
  ai_api_key: string;
  ai_base_url: string;
  ai_temperature: number;
  ai_max_tokens: number;
  ai_reasoning_effort: ReasoningEffort;
  ai_system_prompt: string;
  bot_prefix: string;
  auto_reply_mode: AutoReplyMode;
  sticker_pack_name: string;
  sticker_pack_author: string;
  tools_enabled: string[];
}

export interface ChatMessage {
  id?: number;
  jid: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  thoughts?: string | null;
  tool_calls?: string | null;
  tool_call_id?: string | null;
  created_at: number;
}

export interface UserFact {
  id?: number;
  jid: string;
  fact: string;
  category: string;
  created_at: number;
}

export interface Reminder {
  id?: number;
  jid: string;
  task: string;
  remind_at: number;
  status: "pending" | "sent" | "cancelled";
  created_at: number;
}

export interface AuditLog {
  id: number;
  level: "info" | "warn" | "error";
  category: "bot" | "agent" | "command" | "media" | "system";
  message: string;
  metadata?: string | null;
  created_at: number;
}

export interface SkillRecord {
  id: number;
  name: string;
  description: string;
  body: string;
  version: number;
  enabled: boolean;
  source: "agent" | "user";
  createdAt: number;
  updatedAt: number;
}

export interface ToolExecutionResult {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  success: boolean;
  error?: string;
}

export interface KynosAgentResponse {
  content: string;
  thoughts?: string;
  toolCalls?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  }[];
}

export const AI_MODEL_PRESETS = [
  {
    description:
      "Open-weights reasoning model with multi-step tool capability.",
    id: "nousresearch/hermes-3-llama-3.1-70b",
    name: "Hermes 3 Llama 3.1 70B",
    provider: "openrouter",
  },
  {
    description: "Frontier parameter reasoning model for deep analysis.",
    id: "nousresearch/hermes-3-llama-3.1-405b",
    name: "Hermes 3 Llama 3.1 405B",
    provider: "openrouter",
  },
  {
    description: "Fast lightweight model for general tasks.",
    id: "nousresearch/hermes-3-llama-3.1-8b",
    name: "Hermes 3 Llama 3.1 8B",
    provider: "openrouter",
  },
  {
    description: "High performance instruction model for general queries.",
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "openrouter",
  },
  {
    description:
      "Frontier reasoning model with comprehensive chain-of-thought.",
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
  },
  {
    description: "OpenAI flagship multi-modal model.",
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openrouter",
  },
  {
    description: "Sub-second fast inference via Groq LPU.",
    id: "llama-3.3-70b-versatile",
    name: "Groq Llama 3.3 70B Versatile",
    provider: "groq",
  },
  {
    description: "Locally hosted model via Ollama endpoint.",
    id: "hermes3:latest",
    name: "Local Ollama Hermes 3",
    provider: "ollama",
  },
] as const;

export const AVAILABLE_TOOLS = [
  {
    description: "Search DuckDuckGo for live internet info",
    id: "web_search",
    name: "Web Search",
  },
  {
    description: "Safe math expression solver",
    id: "calculator",
    name: "Calculator",
  },
  {
    description: "Current time and date query",
    id: "datetime",
    name: "DateTime & Timezone",
  },
  {
    description: "Real-time weather via Open-Meteo",
    id: "weather",
    name: "Weather Forecast",
  },
  {
    description: "Fetch URL content and summarize",
    id: "summarize",
    name: "Web Summarizer",
  },
  {
    description: "Schedule WhatsApp alert reminders",
    id: "reminder",
    name: "Reminder Scheduler",
  },
  {
    description: "Remember facts about users across chats",
    id: "memory",
    name: "User Fact Memory",
  },
  {
    description:
      "Autonomously create, update, patch, and manage procedural skills",
    id: "skill_manage",
    name: "Self-Evolution & Skill Manager",
  },
] as const;
