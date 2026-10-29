import { expect, test } from "bun:test";

import {
  createClearSessionCookie,
  createSessionCookie,
  getAdminPassword,
  getSessionFromRequest,
  verifySessionToken,
} from "./auth";

test("auth: getAdminPassword returns configured password or default admin", () => {
  const pwd = getAdminPassword();
  expect(typeof pwd).toBe("string");
  expect(pwd.length).toBeGreaterThan(0);
});

test("auth: create and verify valid session cookie", () => {
  const cookieStr = createSessionCookie();
  expect(cookieStr).toContain("kynos_session=");
  expect(cookieStr).toContain("HttpOnly");

  const match = cookieStr.match(/kynos_session=(?<token>[^;]+)/u);
  const token = match?.groups?.token;
  expect(token).toBeDefined();
  if (!token) {
    throw new Error("Missing token");
  }
  expect(verifySessionToken(token)).toBe(true);
});

test("auth: reject tampered or invalid token", () => {
  expect(verifySessionToken(null)).toBe(false);
  expect(verifySessionToken("")).toBe(false);
  expect(verifySessionToken("invalid.token.here")).toBe(false);

  const cookieStr = createSessionCookie();
  const match = cookieStr.match(/kynos_session=(?<token>[^;]+)/u);
  const token = match?.groups?.token;
  expect(token).toBeDefined();
  if (!token) {
    throw new Error("Missing token");
  }
  const tampered = `${token.slice(0, -2)}xx`;
  expect(verifySessionToken(tampered)).toBe(false);
});

test("auth: extract session from request headers", () => {
  const cookieStr = createSessionCookie();
  const match = cookieStr.match(/kynos_session=(?<token>[^;]+)/u);
  const token = match?.groups?.token;
  expect(token).toBeDefined();
  if (!token) {
    throw new Error("Missing token");
  }
  const validReq = new Request("http://localhost:3000/api/dashboard", {
    headers: {
      cookie: `other=foo; kynos_session=${token}; bar=baz`,
    },
  });
  expect(getSessionFromRequest(validReq)).toBe(true);

  const invalidReq = new Request("http://localhost:3000/api/dashboard", {
    headers: {
      cookie: "other=foo; bar=baz",
    },
  });
  expect(getSessionFromRequest(invalidReq)).toBe(false);
});

test("auth: clear session cookie format", () => {
  const clearCookie = createClearSessionCookie();
  expect(clearCookie).toContain("Max-Age=0");
});
