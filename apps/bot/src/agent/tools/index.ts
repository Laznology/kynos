import type { AppSettings } from "@kynos/shared";
import type { ToolSet } from "ai";

import type { AgentContext } from "../types";
import { browserAutomationTool } from "./browser";
import { calculatorTool } from "./calculator";
import { datetimeTool } from "./datetime";
import { createMemoryTool } from "./memory";
import { createReminderTool } from "./reminder";
import { skillManageTool } from "./skill-manage";
import { summarizeTool } from "./summarize";
import { weatherTool } from "./weather";
import { createWebSearchTool, webSearchTool } from "./web-search";

export const getAgentTools = (
  context: AgentContext,
  enabledToolIds?: string[],
  settings?: Pick<AppSettings, "tavily_api_key">
): ToolSet => {
  const all: ToolSet = {
    browser_automation: browserAutomationTool,
    calculator: calculatorTool,
    datetime: datetimeTool,
    memory: createMemoryTool(context),
    reminder: createReminderTool(context),
    skill_manage: skillManageTool,
    summarize: summarizeTool,
    weather: weatherTool,
    web_search: settings
      ? createWebSearchTool(settings.tavily_api_key)
      : webSearchTool,
  };

  if (!enabledToolIds) {
    return all;
  }

  const enabledSet = new Set(enabledToolIds);
  const filtered: ToolSet = {};

  for (const [key, value] of Object.entries(all)) {
    if (enabledSet.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

export { calculatorTool } from "./calculator";
export { browserAutomationTool } from "./browser";
export { datetimeTool } from "./datetime";
export { createMemoryTool } from "./memory";
export { createReminderTool } from "./reminder";
export { skillManageTool } from "./skill-manage";
export { summarizeTool } from "./summarize";
export { weatherTool } from "./weather";
export { webSearchTool } from "./web-search";
export { createWebSearchTool } from "./web-search";
