import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  getAuditLogs,
  getBotState,
  getSettings,
  getSkills,
} from "@kynos/db";

import { verifySessionToken } from "./auth";
import type { DashboardData } from "./server-api";

export const getDashboardDataFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const cookie = getRequestHeader("cookie");
    let token: string | null = null;
    if (cookie) {
      for (const part of cookie.split(/;\s*/)) {
        const eq = part.indexOf("=");
        if (eq === -1) continue;
        if (part.slice(0, eq) === "kynos_session") {
          token = part.slice(eq + 1);
          break;
        }
      }
    }

    if (!token || !verifySessionToken(token)) {
      throw new Error("UNAUTHORIZED");
    }

    return {
      logs: getAuditLogs(20),
      settings: getSettings(),
      skills: getSkills(),
      state: getBotState(),
    };
  }
);
