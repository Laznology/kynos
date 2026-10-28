import { tool } from "ai";
import { z } from "zod";

export const summarizeTool = tool({
  description:
    "Fetch web page content from a given URL to read, analyze, or summarize its contents.",
  execute: async ({ url }) => {
    const rawUrl = url.trim();
    if (
      !rawUrl ||
      (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://"))
    ) {
      return JSON.stringify({
        error: "Invalid URL provided. Must start with http:// or https://",
      });
    }

    try {
      const res = await fetch(rawUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain",
          "User-Agent": "Mozilla/5.0 (compatible; KynosBot/1.0)",
        },
      });

      if (!res.ok) {
        return JSON.stringify({
          error: `Failed to fetch URL, HTTP status ${res.status}`,
        });
      }

      const html = await res.text();

      const titleMatch = html.match(
        /<title[^>]*>(?<title>[\s\S]*?)<\/title>/iu
      );
      const title = titleMatch?.groups?.title
        ? titleMatch.groups.title.replaceAll(/\s+/gu, " ").trim()
        : "Untitled Document";

      const cleanedHtml = html
        .replaceAll(/<!--[\s\S]*?-->/gu, "")
        .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/giu, "")
        .replaceAll(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/giu, "")
        .replaceAll(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/giu, "")
        .replaceAll(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/giu, "")
        .replaceAll(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/giu, "");

      const textMatches =
        cleanedHtml.match(
          /<(?<tag>p|h[1-6]|li|article)[^>]*>(?<content>[\s\S]*?)<\/\k<tag>>/giu
        ) || [];
      const extractedParagraphs: string[] = [];

      for (const item of textMatches) {
        const plain = item
          .replaceAll(/<[^>]+>/gu, " ")
          .replaceAll(/\s+/gu, " ")
          .trim();
        if (plain.length > 20) {
          extractedParagraphs.push(plain);
        }
      }

      let extractedText = extractedParagraphs.join("\n\n");
      if (!extractedText) {
        extractedText = cleanedHtml
          .replaceAll(/<[^>]+>/gu, " ")
          .replaceAll(/\s+/gu, " ")
          .trim();
      }

      const maxChars = 4000;
      const truncated = extractedText.length > maxChars;
      const safeContent = extractedText.slice(0, maxChars);

      return JSON.stringify({
        content: safeContent,
        title,
        truncated,
        url: rawUrl,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: msg, url: rawUrl });
    }
  },
  inputSchema: z.object({
    url: z
      .string()
      .describe("The complete HTTP/HTTPS URL to fetch and summarize"),
  }),
});
