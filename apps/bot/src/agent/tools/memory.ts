import { addUserFact, deleteUserFact, getUserFacts } from "@kynos/db";
import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "../types";

export const createMemoryTool = (context: AgentContext) =>
  tool({
    description:
      "Remember or recall facts and preferences about the user in this conversation for persistent cross-session memory.",
    execute: async ({ action, fact, category, fact_id }) => {
      await Promise.resolve();
      try {
        if (action === "save") {
          const factText = fact?.trim() || "";
          if (!factText) {
            return JSON.stringify({
              error: "Missing 'fact' parameter for save action",
            });
          }
          const cat = category?.trim() || "general";
          const saved = addUserFact(context.jid, factText, cat);
          return JSON.stringify({
            fact: saved,
            message: "Fact remembered",
            success: true,
          });
        }

        if (action === "delete") {
          const id = fact_id ?? -1;
          if (id <= 0) {
            return JSON.stringify({
              error: "Missing or invalid 'fact_id' parameter for delete action",
            });
          }
          deleteUserFact(id);
          return JSON.stringify({
            message: `Fact #${id} removed`,
            success: true,
          });
        }

        const facts = getUserFacts(context.jid);
        return JSON.stringify({
          count: facts.length,
          facts: facts.map((f) => ({
            category: f.category,
            fact: f.fact,
            id: f.id,
            saved_at: new Date(f.created_at).toISOString(),
          })),
          jid: context.jid,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: msg });
      }
    },
    inputSchema: z.object({
      action: z
        .enum(["save", "recall", "delete"])
        .describe(
          "Operation: 'save' to store a new fact, 'recall' to retrieve known facts, 'delete' to remove a fact by ID"
        ),
      category: z
        .string()
        .optional()
        .describe("Category tag, e.g. 'preference', 'identity', 'work'"),
      fact: z
        .string()
        .optional()
        .describe("The fact to remember (required if action is 'save')"),
      fact_id: z
        .number()
        .optional()
        .describe(
          "The numeric ID of the fact to delete (required if action is 'delete')"
        ),
    }),
  });
