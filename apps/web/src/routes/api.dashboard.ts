import {
  createSkill,
  deleteSkill,
  getAuditLogs,
  getBotState,
  getSettings,
  getSkills,
  toggleSkill,
  updateSettings,
} from "@kynos/db";
import type { AppSettings } from "@kynos/shared";
import { createFileRoute } from "@tanstack/react-router";

import { getSessionFromRequest } from "../lib/auth";

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (!getSessionFromRequest(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const payload = {
          logs: getAuditLogs(100),
          settings: getSettings(),
          skills: getSkills(),
          state: getBotState(),
        };
        return Response.json(payload);
      },
      POST: async ({ request }) => {
        if (!getSessionFromRequest(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const body = (await request.json()) as {
            action: string;
            payload?: unknown;
          };
          if (body.action === "save_settings") {
            const updated = updateSettings(
              body.payload as Partial<AppSettings>
            );
            return Response.json({ ok: true, settings: updated });
          }
          if (body.action === "toggle_skill") {
            const { name, currentEnabled } = body.payload as {
              name: string;
              currentEnabled: boolean;
            };
            const next = !currentEnabled;
            const updated = toggleSkill(name, next);
            return Response.json({ enabled: updated.enabled, ok: true });
          }
          if (body.action === "create_skill") {
            const {
              name,
              description,
              body: skillBody,
            } = body.payload as {
              name: string;
              description: string;
              body: string;
            };
            const created = createSkill({
              body: skillBody,
              description,
              name,
              source: "user",
            });
            return Response.json({ ok: true, skill: created });
          }
          if (body.action === "delete_skill") {
            const { name } = body.payload as { name: string };
            deleteSkill(name);
            return Response.json({ ok: true });
          }
          if (body.action === "restart_bot") {
            const restart = await fetch(
              "http://localhost:3001/api/bot/restart",
              {
                method: "POST",
              }
            );
            if (!restart.ok) {
              return Response.json(
                { error: "Bot restart request failed" },
                { status: 502 }
              );
            }
            return Response.json({ message: "Bot restarting...", ok: true });
          }
          return Response.json({ error: "Unknown action" }, { status: 400 });
        } catch (error) {
          return Response.json(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
