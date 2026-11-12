import {
  addUserFact,
  createSkill,
  deleteReminder,
  deleteSkill,
  deleteUserFact,
  exportDatabaseSnapshot,
  getAllReminders,
  getAllUserFacts,
  getAuditLogs,
  getBotState,
  getSettings,
  getSkills,
  importDatabaseSnapshot,
  toggleSkill,
  updateReminderStatus,
  updateSettings,
  updateUserFact,
} from "@kynos/db";
import type { AppSettings, Reminder } from "@kynos/shared";
import { createFileRoute } from "@tanstack/react-router";

import { getSessionFromRequest } from "../lib/auth";

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (!getSessionFromRequest(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (new URL(request.url).searchParams.get("export") === "database") {
          return new Response(JSON.stringify(exportDatabaseSnapshot(), null, 2), {
            headers: {
              "Content-Disposition": `attachment; filename="kynos-database-${new Date().toISOString().slice(0, 10)}.json"`,
              "Content-Type": "application/json",
            },
          });
        }
        const payload = {
          logs: getAuditLogs(100),
          memories: getAllUserFacts(),
          reminders: getAllReminders(100),
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
          if (request.headers.get("content-type")?.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("database");
            if (!(file instanceof File)) {
              return Response.json({ error: "Database file is required." }, { status: 400 });
            }
            importDatabaseSnapshot(JSON.parse(await file.text()));
            return Response.json({ ok: true, message: "Database imported successfully." });
          }
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
          if (body.action === "create_memory") {
            const { category, fact, jid } = body.payload as {
              category?: string;
              fact: string;
              jid: string;
            };
            const created = addUserFact(jid, fact, category || "general");
            return Response.json({ memory: created, ok: true });
          }
          if (body.action === "update_memory") {
            const { category, fact, id } = body.payload as {
              category?: string;
              fact: string;
              id: number;
            };
            const updated = updateUserFact(id, fact, category || "general");
            return Response.json({ memory: updated, ok: true });
          }
          if (body.action === "delete_memory") {
            const { id } = body.payload as { id: number };
            deleteUserFact(id);
            return Response.json({ ok: true });
          }
          if (body.action === "update_reminder_status") {
            const { id, status } = body.payload as {
              id: number;
              status: Reminder["status"];
            };
            const updated = updateReminderStatus(id, status);
            return Response.json({ ok: true, reminder: updated });
          }
          if (body.action === "delete_reminder") {
            const { id } = body.payload as { id: number };
            deleteReminder(id);
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
