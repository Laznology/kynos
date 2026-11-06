import { tool } from "ai";
import { chromium } from "playwright";
import { z } from "zod";

const MAX_TEXT_LENGTH = 12_000;
const MAX_SCREENSHOT_BYTES = 1_500_000;
const DEFAULT_TIMEOUT_MS = 15_000;

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
    return validateUrl(rawUrl).toString();
  } catch {
    return rawUrl;
  }
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
  execute: async ({ action, url: rawUrl, selector, text, fullPage }) => {
    let url: URL;
    try {
      url = validateUrl(rawUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: message });
    }

    if ((action === "click" || action === "fill") && !selector) {
      return JSON.stringify({ error: "selector is required for this action" });
    }
    if (action === "fill" && text === undefined) {
      return JSON.stringify({ error: "text is required for the fill action" });
    }

    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
      headless: true,
    });

    try {
      const page = await browser.newPage({
        viewport: { height: 900, width: 1280 },
      });
      page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
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
        const screenshot = await page.screenshot({
          fullPage: fullPage ?? false,
          type: "png",
        });
        if (screenshot.byteLength > MAX_SCREENSHOT_BYTES) {
          return JSON.stringify({
            bytes: screenshot.byteLength,
            error: "Screenshot is too large to return",
            maxBytes: MAX_SCREENSHOT_BYTES,
          });
        }
        return JSON.stringify({
          action,
          bytes: screenshot.byteLength,
          contentType: "image/png",
          dataUrl: `data:image/png;base64,${screenshot.toString("base64")}`,
          title: await page.title(),
          url: page.url(),
        });
      }

      return JSON.stringify({
        action,
        text: trimText((await page.locator("body").textContent()) || ""),
        title: await page.title(),
        url: page.url(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ action, error: message, url: pageUrl(rawUrl) });
    } finally {
      await browser.close();
    }
  },
  inputSchema: browserInputSchema,
  strict: true,
});
