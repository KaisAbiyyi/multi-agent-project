import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";
import type { WebSearchQueryItem, WebSearchQueryResult, WebSearchRequestBody, WebSearchResponse } from "@/types/web-search";

export const runtime = "nodejs";

const DEFAULT_TOP_K = 3;
const SEARCH_PROVIDER = (
  process.env.SEARCH_PROVIDER ||
  process.env.NEXT_PUBLIC_SEARCH_PROVIDER ||
  "mock"
).toLowerCase();
const SEARCH_PROVIDER_API_KEY =
  process.env.SEARCH_PROVIDER_API_KEY ||
  process.env.TAVILY_API_KEY ||
  process.env.SERPAPI_API_KEY;
const SEARCH_PROVIDER_BASE_URL =
  process.env.SEARCH_PROVIDER_BASE_URL || process.env.SEARXNG_BASE_URL;
const SEARCH_PROVIDER_BASIC_AUTH =
  process.env.SEARCH_PROVIDER_BASIC_AUTH ||
  (process.env.SEARCH_PROVIDER_USERNAME && process.env.SEARCH_PROVIDER_PASSWORD
    ? `${process.env.SEARCH_PROVIDER_USERNAME}:${process.env.SEARCH_PROVIDER_PASSWORD}`
    : undefined);
const SEARCH_PROVIDER_USER_AGENT =
  process.env.SEARCH_PROVIDER_USER_AGENT ||
  process.env.NEXT_PUBLIC_SEARCH_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const SEARCH_PROVIDER_FALLBACK_BASE_URL =
  process.env.SEARCH_PROVIDER_FALLBACK_BASE_URL ||
  process.env.NEXT_PUBLIC_SEARCH_PROVIDER_FALLBACK_BASE_URL ||
  "https://searx.be";

class SearxngRequestError extends Error {
  readonly status?: number;
  readonly details?: string;
  constructor(message: string, options?: { status?: number; details?: string }) {
    super(message);
    this.name = "SearxngRequestError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

/**
 * Simple POST endpoint to proxy web search requests through the server.
 * This keeps API keys off the client and lets us normalize the response payload.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebSearchRequestBody | null;

    if (!body || !Array.isArray(body.queries) || body.queries.length === 0) {
      return jsonResponse(
        {
          error: "Missing queries",
          details: "Send an array of queries in the `queries` field.",
        },
        400
      );
    }

    const topK = Math.min(Math.max(Number(body.top_k ?? DEFAULT_TOP_K) || DEFAULT_TOP_K, 1), 10);

    const normalizedResults: WebSearchQueryResult[] = [];

    const startedAt = Date.now();

    for (const rawQuery of body.queries) {
      const query = String(rawQuery).trim();
      if (!query) {
        continue;
      }

      const items = await dispatchSearch(query, topK);
      normalizedResults.push({
        query,
        items,
      });
    }

    const payload: WebSearchResponse = {
      results: normalizedResults,
      provider: getProviderLabel(),
      tookMs: Date.now() - startedAt,
    };

    return jsonResponse(payload, 200);
  } catch (error) {
    console.error("[Search API] Unhandled error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      500
    );
  }
}

async function dispatchSearch(query: string, topK: number): Promise<WebSearchQueryItem[]> {
  switch (SEARCH_PROVIDER) {
    case "tavily":
      return searchWithTavily(query, topK);
    case "serpapi":
      return searchWithSerpApi(query, topK);
    case "searxng":
      return searchWithSearxng(query, topK);
    case "mock":
      return getMockResults(query);
    default:
      if (!SEARCH_PROVIDER_API_KEY) {
        console.warn(
          `[Search API] Provider "${SEARCH_PROVIDER}" not configured. Falling back to mock data.`
        );
        return getMockResults(query);
      }

      console.warn(`[Search API] Unknown provider "${SEARCH_PROVIDER}". Defaulting to mock.`);
      return getMockResults(query);
  }
}

async function searchWithTavily(query: string, topK: number): Promise<WebSearchQueryItem[]> {
  if (!SEARCH_PROVIDER_API_KEY) {
    throw new Error(
      "Tavily search requires SEARCH_PROVIDER_API_KEY or TAVILY_API_KEY to be set on the server."
    );
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: SEARCH_PROVIDER_API_KEY,
      query,
      max_results: topK,
      include_answer: false,
      include_raw_content: false,
      search_depth: "advanced",
    }),
  });

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(`Tavily search failed (${response.status}): ${details}`);
  }

  const json = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      published_date?: string;
      source?: string;
    }>;
  };

  if (!json.results || json.results.length === 0) {
    return [];
  }

  return json.results.slice(0, topK).map((item) => ({
    title: item.title || "Untitled result",
    url: item.url || "",
    snippet: item.content || "",
    publishedAt: item.published_date,
    source: item.source,
  }));
}

async function searchWithSerpApi(query: string, topK: number): Promise<WebSearchQueryItem[]> {
  if (!SEARCH_PROVIDER_API_KEY) {
    throw new Error(
      "SerpAPI search requires SEARCH_PROVIDER_API_KEY or SERPAPI_API_KEY to be set on the server."
    );
  }

  const params = new URLSearchParams({
    api_key: SEARCH_PROVIDER_API_KEY,
    q: query,
    num: String(topK),
    engine: "google",
  });

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(`SerpAPI search failed (${response.status}): ${details}`);
  }

  const json = (await response.json()) as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      date?: string;
      source?: string;
    }>;
  };

  if (!json.organic_results || json.organic_results.length === 0) {
    return [];
  }

  return json.organic_results.slice(0, topK).map((item) => ({
    title: item.title || "Untitled result",
    url: item.link || "",
    snippet: item.snippet || "",
    publishedAt: item.date,
    source: item.source,
  }));
}

function getMockResults(query: string): WebSearchQueryItem[] {
  return [
    {
      title: `Live search disabled for "${query}"`,
      url: "https://example.com/search-disabled",
      snippet:
        "Web search provider is not configured. Set SEARCH_PROVIDER and SEARCH_PROVIDER_API_KEY environment variables to enable live results.",
    },
  ];
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "Failed to read error payload";
  }
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getProviderLabel(): string | undefined {
  switch (SEARCH_PROVIDER) {
    case "tavily":
      return "tavily";
    case "serpapi":
      return "serpapi";
    case "searxng":
      return "searxng";
    case "mock":
      return "mock";
    default:
      return SEARCH_PROVIDER;
  }
}

async function searchWithSearxng(query: string, topK: number): Promise<WebSearchQueryItem[]> {
  if (!SEARCH_PROVIDER_BASE_URL) {
    throw new Error(
      "SearxNG search requires SEARCH_PROVIDER_BASE_URL or SEARXNG_BASE_URL to be configured."
    );
  }

  const primaryBaseUrl = normalizeBaseUrl(SEARCH_PROVIDER_BASE_URL);

  try {
    return await querySearxngInstance(primaryBaseUrl, query, topK);
  } catch (error) {
    if (
      SEARCH_PROVIDER_FALLBACK_BASE_URL &&
      normalizeBaseUrl(SEARCH_PROVIDER_FALLBACK_BASE_URL) !== primaryBaseUrl &&
      error instanceof SearxngRequestError &&
      (error.status === 403 ||
        error.status === 401 ||
        error.status === 423 ||
        typeof error.status === "undefined")
    ) {
      console.warn(
        `[Search API] Primary SearxNG instance failed (${error.status ?? "network error"}). Falling back to ${SEARCH_PROVIDER_FALLBACK_BASE_URL}. Details: ${error.details ?? error.message}`
      );

      try {
        return await querySearxngInstance(
          normalizeBaseUrl(SEARCH_PROVIDER_FALLBACK_BASE_URL),
          query,
          topK,
          false
        );
      } catch (fallbackError) {
        console.error(
          "[Search API] Fallback SearxNG instance failed:",
          fallbackError instanceof Error ? fallbackError : String(fallbackError)
        );
        throw fallbackError;
      }
    }

    throw error instanceof Error ? error : new Error(String(error));
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

async function querySearxngInstance(
  baseUrl: string,
  query: string,
  topK: number,
  includeAuth: boolean = true
): Promise<WebSearchQueryItem[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    language: "en",
    categories: "general",
    safesearch: "0",
  });

  if (topK > 0) {
    params.set("limit", String(topK));
  }

  const endpoint = new URL("/search", `${baseUrl}/`);
  const origin = endpoint.origin;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": SEARCH_PROVIDER_USER_AGENT,
    Referer: origin,
    Origin: origin,
  };

  if (includeAuth && SEARCH_PROVIDER_BASIC_AUTH) {
    const basicToken = Buffer.from(SEARCH_PROVIDER_BASIC_AUTH, "utf8").toString("base64");
    headers.Authorization = `Basic ${basicToken}`;
  } else if (includeAuth && SEARCH_PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${SEARCH_PROVIDER_API_KEY}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "POST",
      headers,
      body: params.toString(),
    });
  } catch (error) {
    throw new SearxngRequestError(
      error instanceof Error ? error.message : "Unknown network error while contacting SearxNG"
    );
  }

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new SearxngRequestError(`SearxNG responded with status ${response.status}`, {
      status: response.status,
      details: details || undefined,
    });
  }

  let json: {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      published?: string | number;
      source?: string;
    }>;
  };

  try {
    json = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        published?: string | number;
        source?: string;
      }>;
    };
  } catch (parseError) {
    throw new SearxngRequestError("Failed to parse SearxNG response as JSON", {
      details: parseError instanceof Error ? parseError.message : undefined,
    });
  }

  if (!json.results || json.results.length === 0) {
    return [];
  }

  return json.results.slice(0, topK).map((item) => ({
    title: item.title || "Untitled result",
    url: item.url || "",
    snippet: item.content || "",
    publishedAt:
      typeof item.published === "number"
        ? new Date(item.published * 1000).toISOString()
        : item.published,
    source: item.source,
  }));
}
