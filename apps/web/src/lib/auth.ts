import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const COOKIE_NAME = "kynos_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

const ensureEnvLoaded = (): void => {
  if (process.env.ADMIN_PASSWORD) {
    return;
  }
  let dir = process.cwd();
  for (let i = 0; i < 4; i += 1) {
    const envFile = path.join(dir, ".env");
    if (existsSync(envFile)) {
      try {
        const content = readFileSync(envFile, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            continue;
          }
          const eq = trimmed.indexOf("=");
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim();
            if (process.env[k] === undefined) {
              process.env[k] = v;
            }
          }
        }
      } catch {
        // Ignore read error
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
};

const getSecret = (): string => {
  ensureEnvLoaded();
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "kynos-insecure-admin-secret"
  );
};

export const getAdminPassword = (): string => {
  ensureEnvLoaded();
  return process.env.ADMIN_PASSWORD || "admin";
};

const sign = (data: string): string =>
  createHmac("sha256", getSecret()).update(data).digest("hex");

export const createSessionCookie = (): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `authenticated:${expiresAt}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}.${signature}`).toString("base64url");
  const secureFlag = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SEC};${secureFlag}`;
};

export const createClearSessionCookie = (): string =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

export const verifySessionToken = (token?: string | null): boolean => {
  if (!token) {
    return false;
  }
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const [authTag, expiresAtStr, signature] = raw.split(/[.:]/u);
    if (authTag !== "authenticated" || !expiresAtStr || !signature) {
      return false;
    }
    const expiresAt = Math.trunc(Number(expiresAtStr));
    if (Number.isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expectedPayload = `${authTag}:${expiresAtStr}`;
    const expectedSig = sign(expectedPayload);
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
};

export const getSessionFromRequest = (request: Request): boolean => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return false;
  }
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  return verifySessionToken(cookies[COOKIE_NAME]);
};
