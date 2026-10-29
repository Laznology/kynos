import type {
  AppSettings,
  AuditLog,
  BotState,
  SkillRecord,
} from "@kynos/shared";

export interface DashboardData {
  logs: AuditLog[];
  settings: AppSettings;
  skills: SkillRecord[];
  state: BotState;
}

export interface ModelOption {
  context_length?: number;
  description?: string;
  id: string;
  max_completion_tokens?: number;
  name: string;
  owned_by?: string;
}

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const url =
    typeof window === "undefined"
      ? "http://localhost:3000/api/dashboard"
      : "/api/dashboard";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard data: ${res.statusText}`);
  }
  return (await res.json()) as DashboardData;
};

export const fetchAvailableModels = async (
  baseUrl?: string,
  apiKey?: string
): Promise<ModelOption[]> => {
  const params = new URLSearchParams();
  if (baseUrl) {
    params.set("baseUrl", baseUrl);
  }
  if (apiKey !== undefined) {
    params.set("apiKey", apiKey);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const url =
    typeof window === "undefined"
      ? `http://localhost:3000/api/models${query}`
      : `/api/models${query}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data?: ModelOption[];
    models?: ModelOption[];
  };
  return json.models ?? json.data ?? [];
};

export const saveSettingsFn = async ({
  data,
}: {
  data: Partial<AppSettings>;
}): Promise<AppSettings> => {
  const res = await fetch("/api/dashboard", {
    body: JSON.stringify({ action: "save_settings", payload: data }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await res.json()) as { ok: boolean; settings: AppSettings };
  return json.settings;
};

export const toggleSkillFn = async ({
  data,
}: {
  data: { currentEnabled: boolean; name: string };
}): Promise<{ enabled: boolean; success: boolean }> => {
  const res = await fetch("/api/dashboard", {
    body: JSON.stringify({ action: "toggle_skill", payload: data }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await res.json()) as { enabled: boolean; ok: boolean };
  return { enabled: json.enabled, success: json.ok };
};

export const createSkillFn = async ({
  data,
}: {
  data: { body: string; description: string; name: string };
}): Promise<SkillRecord> => {
  const res = await fetch("/api/dashboard", {
    body: JSON.stringify({ action: "create_skill", payload: data }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await res.json()) as { ok: boolean; skill: SkillRecord };
  return json.skill;
};

export const deleteSkillFn = async ({
  data,
}: {
  data: { name: string };
}): Promise<{ success: boolean }> => {
  const res = await fetch("/api/dashboard", {
    body: JSON.stringify({ action: "delete_skill", payload: data }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await res.json()) as { ok: boolean };
  return { success: json.ok };
};

export const triggerBotRestartFn = async (): Promise<{
  message: string;
  ok: boolean;
}> => {
  const res = await fetch("/api/dashboard", {
    body: JSON.stringify({ action: "restart_bot" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const result = (await res.json()) as {
    error?: string;
    message?: string;
    ok?: boolean;
  };
  if (!res.ok || !result.ok) {
    throw new Error(result.error || "Bot restart failed");
  }
  return { message: result.message || "Bot restarting...", ok: true };
};

export const loginFn = async (
  password: string
): Promise<{ ok: boolean; error?: string }> => {
  const res = await fetch("/api/auth", {
    body: JSON.stringify({ action: "login", password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return (await res.json()) as { ok: boolean; error?: string };
};

export const logoutFn = async (): Promise<{ ok: boolean }> => {
  const res = await fetch("/api/auth", {
    body: JSON.stringify({ action: "logout" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return (await res.json()) as { ok: boolean };
};
