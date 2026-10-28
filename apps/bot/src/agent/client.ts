import { createOpenAI } from "@ai-sdk/openai";
import type { AppSettings } from "@kynos/shared";

// Some proxies/local routers default to streaming SSE unless stream: false is explicitly set.
// Standard AI SDK generateText expects JSON response for non-streaming calls.
const customFetch: typeof fetch = async (url, init) => {
  if (init?.body && typeof init.body === "string") {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>;
      if (parsed.stream === undefined) {
        parsed.stream = false;
        init.body = JSON.stringify(parsed);
      }
    } catch {
      // Leave unparsed body as-is
    }
  }
  return await fetch(url, init);
};

export const getLanguageModel = (settings: AppSettings) => {
  let baseURL = settings.ai_base_url;
  const apiKey = settings.ai_api_key || "dummy-key";
  const headers: Record<string, string> = {};

  if (settings.ai_provider === "openrouter") {
    baseURL ||= "https://openrouter.ai/api/v1";
    headers["HTTP-Referer"] = "https://kynos.local";
    headers["X-Title"] = "Kynos WhatsApp Agent";
  } else if (settings.ai_provider === "groq") {
    baseURL ||= "https://api.groq.com/openai/v1";
  } else if (settings.ai_provider === "ollama") {
    baseURL ||= "http://127.0.0.1:11434/v1";
  } else if (settings.ai_provider === "openai") {
    baseURL ||= "https://api.openai.com/v1";
  }

  const provider = createOpenAI({
    apiKey,
    baseURL,
    compatibility: "compatible",
    fetch: customFetch,
    headers,
  });

  return provider.chat(settings.ai_model);
};
