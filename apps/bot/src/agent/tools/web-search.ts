import { tool } from "ai";
import { z } from "zod";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

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

const parseSearchResultBlock = (block: string): SearchResult | null => {
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

  return { snippet: snippet || title, title: title || "Result", url };
};

const searchDuckDuckGo = async (query: string): Promise<SearchResult[]> => {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`DuckDuckGo request failed with status ${res.status}`);
  }

  const html = await res.text();
  const results: SearchResult[] = [];
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
  return results;
};

const searchTavily = async (
  query: string,
  apiKey: string
): Promise<SearchResult[]> => {
  const res = await fetch("https://api.tavily.com/search", {
    body: JSON.stringify({
      api_key: apiKey,
      include_answer: false,
      max_results: 5,
      query,
      search_depth: "basic",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Tavily request failed with status ${res.status}`);
  }
  const payload = (await res.json()) as {
    results?: { content?: string; title?: string; url?: string }[];
  };
  return (payload.results || []).map((item) => ({
    snippet: item.content || item.title || "",
    title: item.title || "Result",
    url: item.url || "",
  }));
};

const mergeResults = (groups: SearchResult[][]): SearchResult[] => {
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = item.url || `${item.title}:${item.snippet}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
  }
  return merged.slice(0, 8);
};

export const createWebSearchTool = (tavilyApiKey = "") =>
  tool({
    description:
      "Search the web for up-to-date information using DuckDuckGo. If a Tavily API key is configured, query both providers in parallel and merge their results.",
    execute: async ({ query }) => {
      const q = query.trim();
      if (!q) {
        return JSON.stringify({ error: "Missing query parameter" });
      }

      try {
        const searches = [searchDuckDuckGo(q)];
        if (tavilyApiKey.trim()) {
          searches.push(searchTavily(q, tavilyApiKey.trim()));
        }
        const settled = await Promise.allSettled(searches);
        const results = mergeResults(
          settled
            .filter(
              (item): item is PromiseFulfilledResult<SearchResult[]> =>
                item.status === "fulfilled"
            )
            .map((item) => item.value)
        );
        const providerNames = tavilyApiKey.trim()
          ? ["duckduckgo", "tavily"]
          : ["duckduckgo"];
        const providerErrors = settled.flatMap((item, index) =>
          item.status === "rejected"
            ? [
                {
                  error:
                    item.reason instanceof Error
                      ? item.reason.message
                      : String(item.reason),
                  provider: providerNames[index],
                },
              ]
            : []
        );
        if (results.length === 0) {
          return JSON.stringify({
            message:
              "Search providers returned no results. Try rephrasing your query.",
            providerErrors,
            query: q,
            results: [],
          });
        }

        return JSON.stringify({
          count: results.length,
          providerErrors,
          providers: providerNames,
          query: q,
          results,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: msg, query: q });
      }
    },
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    strict: true,
  });

export const webSearchTool = createWebSearchTool();
