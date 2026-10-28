import {
  createSkill,
  deleteSkill,
  getSkillByName,
  getSkills,
  patchSkill,
  updateSkill,
} from "@kynos/db";
import { tool } from "ai";
import { z } from "zod";

export const skillManageTool = tool({
  description:
    "Autonomous self-evolution and skill manager. Use this to create, update, patch, read, list, or delete reusable procedural skills, guidelines, or learned workflows.",
  execute: async ({ action, name, description, body }) => {
    await Promise.resolve();
    try {
      if (action === "list") {
        const list = getSkills();
        return JSON.stringify({
          count: list.length,
          skills: list.map((s) => ({
            description: s.description,
            enabled: s.enabled,
            name: s.name,
            version: s.version,
          })),
        });
      }

      const cleanName = name?.trim().toLowerCase();

      if (!cleanName) {
        return JSON.stringify({
          error: "Missing 'name' parameter for skill operation",
        });
      }

      if (action === "read") {
        const skill = getSkillByName(cleanName as string);
        if (!skill) {
          return JSON.stringify({ error: `Skill '${cleanName}' not found` });
        }
        return JSON.stringify({
          body: skill.body,
          description: skill.description,
          enabled: skill.enabled,
          name: skill.name,
          version: skill.version,
        });
      }

      if (action === "create") {
        if (!description || !body) {
          return JSON.stringify({
            error:
              "Parameters 'description' and 'body' are required for action 'create'",
          });
        }
        const created = createSkill({
          body,
          description,
          name: cleanName as string,
          source: "agent",
        });
        return JSON.stringify({
          message: `Skill '${created.name}' v${created.version} created`,
          skill: created,
          success: true,
        });
      }

      if (action === "update") {
        if (!body) {
          return JSON.stringify({
            error: "Parameter 'body' is required for action 'update'",
          });
        }
        const updated = updateSkill({
          body,
          description,
          name: cleanName as string,
        });
        return JSON.stringify({
          message: `Skill '${updated.name}' evolved to v${updated.version}`,
          skill: updated,
          success: true,
        });
      }

      if (action === "patch") {
        if (!body) {
          return JSON.stringify({
            error:
              "Parameter 'body' containing incremental notes or steps is required for action 'patch'",
          });
        }
        const patched = patchSkill(cleanName as string, body);
        return JSON.stringify({
          message: `Skill '${patched.name}' patched to v${patched.version}`,
          skill: patched,
          success: true,
        });
      }

      if (action === "delete") {
        const deleted = deleteSkill(cleanName as string);
        return JSON.stringify({
          message: deleted
            ? `Skill '${cleanName}' deleted`
            : `Skill '${cleanName}' not found`,
          success: deleted,
        });
      }

      return JSON.stringify({ error: `Unknown action: ${action}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: msg });
    }
  },
  inputSchema: z.object({
    action: z
      .enum(["create", "update", "patch", "delete", "list", "read"])
      .describe("Action to perform on procedural skills"),
    body: z
      .string()
      .optional()
      .describe(
        "Markdown content containing steps, rules, or domain procedure (required for create, update, patch)"
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Clear explanation of what the skill does and when to invoke it (required for create)"
      ),
    name: z
      .string()
      .optional()
      .describe(
        "Kebab-case skill identifier (required for create, update, patch, delete, read)"
      ),
  }),
});
