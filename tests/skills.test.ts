import { describe, expect, it } from "bun:test";

import {
  createSkill,
  deleteSkill,
  getSkillByName,
  patchSkill,
  toggleSkill,
} from "@kynos/db";
import { destr } from "destr";

import { skillManageTool } from "../apps/bot/src/agent/tools/skill-manage";

describe("Autonomous Skill Self-Evolution", () => {
  const skillName = "unit-deploy-flow";

  it("should create, patch, read, and version skills via database repository", () => {
    deleteSkill(skillName);

    const created = createSkill({
      body: "Step 1: Run linter. Step 2: Run tests.",
      description: "Standard deployment pipeline verification",
      name: skillName,
      source: "agent",
    });
    expect(created.name).toBe(skillName);
    expect(created.version).toBe(1);

    const patched = patchSkill(skillName, "Step 3: Check production health.");
    expect(patched.version).toBe(2);
    expect(patched.body).toContain("Step 3");

    const readBack = getSkillByName(skillName);
    expect(readBack).not.toBeNull();
    expect(readBack?.version).toBe(2);

    const toggled = toggleSkill(skillName, false);
    expect(toggled.enabled).toBe(false);

    deleteSkill(skillName);
    expect(getSkillByName(skillName)).toBeNull();
  });

  it("should execute self-evolution actions via skill_manage tool", async () => {
    const toolSkill = "agent-git-helper";
    deleteSkill(toolSkill);

    const createRes = await skillManageTool.execute(
      {
        action: "create",
        body: "Format: feat(scope): subject in lowercase.",
        description: "Clean git commit conventions without emojis",
        name: toolSkill,
      },
      { context: {}, messages: [], toolCallId: "test-call-1" }
    );
    const createParsed = destr<{
      success: boolean;
      skill: { version: number };
    }>(createRes);
    expect(createParsed.success).toBe(true);
    expect(createParsed.skill.version).toBe(1);

    const patchRes = await skillManageTool.execute(
      {
        action: "patch",
        body: "Rule: Never leave commented out code.",
        name: toolSkill,
      },
      { context: {}, messages: [], toolCallId: "test-call-2" }
    );
    const patchParsed = destr<{ success: boolean; skill: { version: number } }>(
      patchRes
    );
    expect(patchParsed.success).toBe(true);
    expect(patchParsed.skill.version).toBe(2);

    const listRes = await skillManageTool.execute(
      { action: "list" },
      { context: {}, messages: [], toolCallId: "test-call-3" }
    );
    const listParsed = destr<{ skills: { name: string }[] }>(listRes);
    expect(
      listParsed.skills.some((s: { name: string }) => s.name === toolSkill)
    ).toBe(true);

    const deleteRes = await skillManageTool.execute(
      { action: "delete", name: toolSkill },
      { context: {}, messages: [], toolCallId: "test-call-4" }
    );
    const deleteParsed = destr<{ success: boolean }>(deleteRes);
    expect(deleteParsed.success).toBe(true);
  });
});
