import { mkdir } from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import { z } from "zod";

const MAX_TEXT_LENGTH = 12_000;
const MAX_SCREENSHOT_BYTES = 1_500_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_TRACE_DIR = "data/browser-traces";

const isTraceEnabled = (): boolean => process.env.KYNOS_BROWSER_TRACE === "on";

const safeTraceName = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9._-]/gu, "-").slice(0, 80) || "browser-call";

const redactedUrl = (url: URL): string => {
  const safe = new URL(url.toString());
  safe.username = "";
  safe.password = "";
  safe.search = "";
  safe.hash = "";
  return safe.toString();
};

const startBrowserTrace = async (
  context: BrowserContext,
  toolCallId: string
): Promise<string | undefined> => {
  if (!isTraceEnabled()) {
    return undefined;
  }

  const traceDir = DEFAULT_TRACE_DIR;
  await mkdir(traceDir, { recursive: true });
  const tracePath = path.join(
    traceDir,
    `${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${safeTraceName(toolCallId)}.zip`
  );
  await context.tracing.start({
    screenshots: false,
    snapshots: false,
    sources: false,
  });
  return tracePath;
};

const stopBrowserTrace = async (
  context: BrowserContext,
  tracePath: string | undefined
): Promise<void> => {
  if (tracePath) {
    await context.tracing.stop({ path: tracePath });
  }
};

const validateActionInput = (
  action: string,
  selector: string | undefined,
  text: string | undefined
): string | undefined => {
  if ((action === "click" || action === "fill") && !selector) {
    return "selector is required for this action";
  }
  if (action === "fill" && text === undefined) {
    return "text is required for the fill action";
  }
  return undefined;
};

const validateUrl = (rawUrl: string): URL => {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }
  return url;
};

const trimText = (text: string): string => {
  const clean = text.replaceAll(/\s+/gu, " ").trim();
  return clean.length > MAX_TEXT_LENGTH
    ? `${clean.slice(0, MAX_TEXT_LENGTH)}... (truncated)`
    : clean;
};

const pageUrl = (rawUrl: string): string => {
  try {
    return redactedUrl(validateUrl(rawUrl));
  } catch {
    return rawUrl;
  }
};

const captureScreenshot = async (
  page: Page,
  fullPage: boolean | undefined,
  tracePath: string | undefined
) => {
  const screenshot = await page.screenshot({
    fullPage: fullPage ?? false,
    type: "png",
  });
  if (screenshot.byteLength > MAX_SCREENSHOT_BYTES) {
    return {
      bytes: screenshot.byteLength,
      error: "Screenshot is too large to return",
      maxBytes: MAX_SCREENSHOT_BYTES,
    };
  }
  return {
    action: "screenshot",
    bytes: screenshot.byteLength,
    contentType: "image/png",
    dataUrl: `data:image/png;base64,${screenshot.toString("base64")}`,
    title: await page.title(),
    url: pageUrl(page.url()),
    ...(tracePath ? { trace_path: tracePath } : {}),
  };
};

const browserInputSchema = z.object({
  action: z
    .enum(["open", "extract_text", "click", "fill", "screenshot"])
    .describe("Browser action to perform"),
  fullPage: z
    .boolean()
    .optional()
    .describe("Capture the full page for the screenshot action"),
  selector: z
    .string()
    .trim()
    .max(500)
    .optional()
    .describe("CSS selector for click or fill"),
  text: z
    .string()
    .max(5000)
    .optional()
    .describe("Text to enter for the fill action"),
  url: z.string().url().describe("HTTP or HTTPS URL to open"),
});

export const browserAutomationTool = tool({
  description:
    "Safely automate a public web page. Open a URL, extract visible text, click a CSS selector, fill a form field, or capture a screenshot. Do not use it for logins, purchases, or other sensitive actions.",
  execute: async (
    { action, url: rawUrl, selector, text, fullPage },
    { toolCallId }
  ) => {
    let url: URL;
    try {
      url = validateUrl(rawUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: message });
    }

    const inputError = validateActionInput(action, selector, text);
    if (inputError) {
      return JSON.stringify({ error: inputError });
    }

    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
      headless: true,
    });
    let context: BrowserContext | undefined;
    let tracePath: string | undefined;

    try {
      context = await browser.newContext({
        viewport: { height: 900, width: 1280 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
      tracePath = await startBrowserTrace(context, toolCallId);
      await page.goto(url.toString(), {
        timeout: DEFAULT_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      if (action === "click") {
        await page.locator(selector as string).click();
        await page.waitForLoadState("domcontentloaded").catch(() => null);
      } else if (action === "fill") {
        await page.locator(selector as string).fill(text as string);
      }

      if (action === "screenshot") {
        return JSON.stringify(
          await captureScreenshot(page, fullPage, tracePath)
        );
      }

      return JSON.stringify({
        action,
        text: trimText((await page.locator("body").textContent()) || ""),
        title: await page.title(),
        url: pageUrl(page.url()),
        ...(tracePath ? { trace_path: tracePath } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        action,
        error: message,
        url: pageUrl(rawUrl),
        ...(tracePath ? { trace_path: tracePath } : {}),
      });
    } finally {
      if (context) {
        await stopBrowserTrace(context, tracePath);
      }
      await context?.close();
      await browser.close();
    }
  },
  inputSchema: browserInputSchema,
  strict: true,
});

export { redactedUrl, safeTraceName };
