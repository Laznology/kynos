import { expect, test } from "bun:test";
import {
  createClearSessionCookie,
  createSessionCookie,
  getAdminPassword,
  getSessionFromRequest,
  verifySessionToken,
} from "./auth";

test("auth: default admin password", () => {
  expect(getAdminPassword()).toBeDefined();
});

test("auth: create and verify valid session cookie", () => {
  const cookieStr = createSessionCookie();
  expect(cookieStr).toContain("kynos_session=");
  expect(cookieStr).toContain("HttpOnly");

  const token = cookieStr.match(/kynos_session=([^;]+)/)?.[1];
  expect(token).toBeDefined();
  expect(verifySessionToken(token)).toBe(true);
});

test("auth: reject tampered or invalid token", () => {
  expect(verifySessionToken(null)).toBe(false);
  expect(verifySessionToken("")).toBe(false);
  expect(verifySessionToken("invalid.token.here")).toBe(false);

  const cookieStr = createSessionCookie();
  const token = cookieStr.match(/kynos_session=([^;]+)/)?.[1]!;
  const tampered = token.slice(0, -2) + "xx";
  expect(verifySessionToken(tampered)).toBe(false);
});

test("auth: extract session from request headers", () => {
  const cookieStr = createSessionCookie();
  const token = cookieStr.match(/kynos_session=([^;]+)/)?.[1]!;

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
