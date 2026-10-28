import { describe, expect, it } from "bun:test";

import { getSettings, updateSettings } from "@kynos/db";

describe("Dashboard Database & Settings Layer", () => {
  it("should fetch settings from database", () => {
    const s = getSettings();
    expect(s.ai_provider).toBeDefined();
    expect(s.ai_model).toBeDefined();
  });

  it("should mutate settings in database", () => {
    const updated = updateSettings({ ai_temperature: 0.65 });
    expect(updated.ai_temperature).toBe(0.65);

    const check = getSettings();
    expect(check.ai_temperature).toBe(0.65);
  });
});
