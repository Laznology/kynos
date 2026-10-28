import type { ToolSet } from "ai";

import type { AgentContext } from "../types";
import { calculatorTool } from "./calculator";
import { datetimeTool } from "./datetime";
import { createMemoryTool } from "./memory";
import { createReminderTool } from "./reminder";
import { skillManageTool } from "./skill-manage";
import { summarizeTool } from "./summarize";
import { weatherTool } from "./weather";
import { webSearchTool } from "./web-search";

export const getAgentTools = (
  context: AgentContext,
  enabledToolNames?: string[]
): ToolSet => {
  const all: ToolSet = {
    calculator: calculatorTool,
    datetime: datetimeTool,
    memory: createMemoryTool(context),
    reminder: createReminderTool(context),
    skill_manage: skillManageTool,
    summarize: summarizeTool,
    weather: weatherTool,
    web_search: webSearchTool,
  };

  if (!enabledToolNames || enabledToolNames.length === 0) {
    return all;
  }

  const enabledSet = new Set(enabledToolNames);
  const filtered: ToolSet = {};

  for (const [key, value] of Object.entries(all)) {
    if (enabledSet.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

export { calculatorTool } from "./calculator";
export { datetimeTool } from "./datetime";
export { createMemoryTool } from "./memory";
export { createReminderTool } from "./reminder";
export { skillManageTool } from "./skill-manage";
export { summarizeTool } from "./summarize";
export { weatherTool } from "./weather";
export { webSearchTool } from "./web-search";
