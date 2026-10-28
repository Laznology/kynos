import { tool } from "ai";
import { z } from "zod";

const cleanHtmlText = (raw: string): string =>
  raw
    .replaceAll(/<[^>]+>/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

const extractDuckDuckGoUrl = (rawHref: string): string => {
  const stripped = rawHref.replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/u, "");
  try {
    return decodeURIComponent(stripped.split("&")[0]);
  } catch {
    return stripped;
  }
};

const parseSearchResultBlock = (
  block: string
): { title: string; snippet: string; url: string } | null => {
  const titleMatch =
    block.match(
      /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="(?<url>[^"]+)"[^>]*>(?<text>[\s\S]*?)<\/a>/iu
    ) ||
    block.match(
      /<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="(?<url>[^"]+)"[^>]*>(?<text>[\s\S]*?)<\/a>/iu
    ) ||
    block.match(
      /<a[^>]*href="(?<url>[^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>(?<text>[\s\S]*?)<\/a>/iu
    );

  let url = "";
  let title = "";
  if (titleMatch?.groups) {
    url = extractDuckDuckGoUrl(titleMatch.groups.url);
    title = cleanHtmlText(titleMatch.groups.text);
  }

  const snippetMatch = block.match(
    /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(?<snippet>[\s\S]*?)<\/a>/iu
  );
  const snippet = snippetMatch?.groups?.snippet
    ? cleanHtmlText(snippetMatch.groups.snippet)
    : "";

  if (!title && !snippet) {
    return null;
  }

  return {
    snippet: snippet || title,
    title: title || "Result",
    url,
  };
};
export const webSearchTool = tool({
  description:
    "Search the web for up-to-date information, news, documentation, or facts.",
  execute: async ({ query }) => {
    const q = query.trim();
    if (!q) {
      return JSON.stringify({ error: "Missing query parameter" });
    }

    try {
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        }
      );

      if (!res.ok) {
        return JSON.stringify({
          error: `Search request failed with status ${res.status}`,
        });
      }

      const html = await res.text();
      const results: { title: string; snippet: string; url: string }[] = [];

      const resultBlocks = html
        .split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/iu)
        .slice(1);
      for (const block of resultBlocks) {
        if (results.length >= 5) {
          break;
        }
        const item = parseSearchResultBlock(block);
        if (item) {
          results.push(item);
        }
      }

      if (results.length === 0) {
        return JSON.stringify({
          message:
            "No instant results found. Try rephrasing your search query.",
          query: q,
          results: [],
        });
      }

      return JSON.stringify({ count: results.length, query: q, results });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: msg, query: q });
    }
  },
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
});
