import { getSettings } from "@kynos/db";
import { createFileRoute } from "@tanstack/react-router";

import { getSessionFromRequest } from "../lib/auth";
export interface ModelItem {
  context_length?: number;
  description?: string;
  id: string;
  max_completion_tokens?: number;
  name?: string;
  owned_by?: string;
}

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
 if (!getSessionFromRequest(request)) {
 return Response.json({ error: "Unauthorized" }, { status: 401 });
 }
        try {
          const url = new URL(request.url);
          const currentSettings = getSettings();

          const queryBaseUrl = url.searchParams.get("baseUrl");
          const queryApiKey = url.searchParams.get("apiKey");

          const rawBaseUrl =
            queryBaseUrl ||
            currentSettings.ai_base_url ||
            "https://openrouter.ai/api/v1";
          const baseUrl = rawBaseUrl.replace(/\/+$/u, "");

          let apiKey = currentSettings.ai_api_key || "";
          if (queryApiKey !== null) {
            apiKey = queryApiKey;
          }

          const targetUrl = `${baseUrl}/models`;

          const headers: Record<string, string> = {
            Accept: "application/json",
            "User-Agent": "Kynos-Agent/1.0",
          };

          if (apiKey.trim()) {
            headers.Authorization = `Bearer ${apiKey.trim()}`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12_000);

          try {
            const res = await fetch(targetUrl, {
              headers,
              method: "GET",
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errBody = await res.text().catch(() => "");
              const status =
                res.status >= 400 && res.status < 600 ? res.status : 502;
              return Response.json(
                {
                  error: `Upstream error ${res.status}: ${res.statusText}. ${errBody.slice(0, 200)}`,
                  models: [],
                  ok: false,
                },
                { status }
              );
            }

            const json = (await res.json()) as {
              data?: {
                context_length?: number;
                id: string;
                max_completion_tokens?: number;
                name?: string;
                owned_by?: string;
              }[];
              models?: { id: string; name?: string }[];
            };

            let rawList: {
              context_length?: number;
              id: string;
              max_completion_tokens?: number;
              name?: string;
              owned_by?: string;
            }[] = [];

            if (Array.isArray(json.data)) {
              rawList = json.data;
            } else if (Array.isArray(json.models)) {
              rawList = json.models;
            }

            const models: ModelItem[] = rawList.map((m) => ({
              context_length: m.context_length,
              id: m.id,
              max_completion_tokens: m.max_completion_tokens,
              name: m.name || m.id,
              owned_by: m.owned_by,
            }));

            // Sort alphabetically by ID
            models.sort((a, b) => a.id.localeCompare(b.id));

            return Response.json({
              count: models.length,
              models,
              ok: true,
            });
          } catch (error) {
            clearTimeout(timeoutId);
            return Response.json(
              {
                error: error instanceof Error ? error.message : String(error),
                models: [],
                ok: false,
              },
              { status: 504 }
            );
          }
        } catch (error) {
          return Response.json(
            {
              error: error instanceof Error ? error.message : String(error),
              models: [],
              ok: false,
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
