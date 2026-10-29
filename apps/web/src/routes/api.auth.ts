import { createFileRoute } from "@tanstack/react-router";

import {
  createClearSessionCookie,
  createSessionCookie,
  getAdminPassword,
  getSessionFromRequest,
} from "../lib/auth";

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const authenticated = getSessionFromRequest(request);
        return Response.json({ authenticated });
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            action?: string;
            password?: string;
          };

          if (body.action === "logout") {
            return Response.json(
              { ok: true },
              {
                headers: {
                  "Set-Cookie": createClearSessionCookie(),
                },
              }
            );
          }

          if (body.action === "login") {
            const expected = getAdminPassword();
            if (body.password === expected) {
              return Response.json(
                { ok: true },
                {
                  headers: {
                    "Set-Cookie": createSessionCookie(),
                  },
                }
              );
            }
            return Response.json(
              { error: "Incorrect password", ok: false },
              { status: 401 }
            );
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
