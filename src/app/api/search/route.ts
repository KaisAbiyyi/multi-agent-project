import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";
import type { WebSearchQueryItem, WebSearchQueryResult, WebSearchRequestBody, WebSearchResponse } from "@/types/web-search";
import { annotateRelativeTime, resolvePublishedTimestamp, toIsoDateOnly } from "@/lib/time-utils";

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

    const runtimeDate = new Date();
    const normalizedResults: WebSearchQueryResult[] = [];
    const startedAt = Date.now();

    for (const rawQuery of body.queries) {
      const query = String(rawQuery).trim();
      if (!query) {
        continue;
      }

      const items = await dispatchSearch(query, topK, runtimeDate, body.provider, body.config);
      normalizedResults.push({
        query,
        items,
      });
    }

    const payload: WebSearchResponse = {
      results: normalizedResults,
      provider: getProviderLabel(),
      tookMs: Date.now() - startedAt,
      capturedAt: toIsoDateOnly(runtimeDate),
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

async function dispatchSearch(query: string, topK: number, runtimeDate: Date, provider?: string, config?: Partial<WebSearchRequestBody['config']>): Promise<WebSearchQueryItem[]> {
  const selectedProvider = provider || SEARCH_PROVIDER;
  
  try {
    switch (selectedProvider) {
      case "tavily":
        return await searchWithTavily(query, topK, runtimeDate, config?.apiKey);
      case "serpapi":
        return await searchWithSerpApi(query, topK, runtimeDate, config?.apiKey);
      case "searxng":
        return await searchWithSearxng(query, topK, runtimeDate, config?.baseUrl, config?.basicAuth);
      case "duckduckgo":
        return await searchWithDuckDuckGo(query, topK, runtimeDate);
      case "brave":
        return await searchWithBrave(query, topK, runtimeDate, config?.apiKey);
      case "mock":
        return getMockResults(query);
      default:
        if (!SEARCH_PROVIDER_API_KEY && selectedProvider !== 'duckduckgo') {
          console.warn(
            `[Search API] Provider "${selectedProvider}" not configured. Falling back to DuckDuckGo.`
          );
          return await searchWithDuckDuckGo(query, topK, runtimeDate);
        }

        console.warn(`[Search API] Unknown provider "${selectedProvider}". Defaulting to DuckDuckGo.`);
        return await searchWithDuckDuckGo(query, topK, runtimeDate);
    }
  } catch (error) {
    // If selected provider fails and it's not DuckDuckGo, try DuckDuckGo as fallback
    if (selectedProvider !== 'duckduckgo' && selectedProvider !== 'mock') {
      console.error(`[Search API] ${selectedProvider} failed:`, error);
      console.log('[Search API] Attempting DuckDuckGo fallback...');
      try {
        return await searchWithDuckDuckGo(query, topK, runtimeDate);
      } catch (fallbackError) {
        console.error('[Search API] DuckDuckGo fallback also failed:', fallbackError);
        // Return mock data as last resort
        return getMockResults(query);
      }
    }
    throw error;
  }
}

async function searchWithDuckDuckGo(query: string, topK: number, runtimeDate: Date): Promise<WebSearchQueryItem[]> {
  // DuckDuckGo HTML API approach - more reliable than lite version
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    no_redirect: '1',
    no_html: '1',
    skip_disambig: '1',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(`https://api.duckduckgo.com/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': SEARCH_PROVIDER_USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed (${response.status}): ${response.statusText}`);
    }

    const json = await response.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{
        Text?: string;
        FirstURL?: string;
        Icon?: { URL?: string };
      } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
    };

    const results: WebSearchQueryItem[] = [];

    // Add abstract as first result if available
    if (json.AbstractText && json.AbstractURL) {
      results.push({
        title: json.AbstractSource || 'DuckDuckGo Instant Answer',
        url: json.AbstractURL,
        snippet: annotateRelativeTime(json.AbstractText, runtimeDate),
        source: 'duckduckgo',
      });
    }

    // Add related topics
    if (json.RelatedTopics && Array.isArray(json.RelatedTopics)) {
      for (const topic of json.RelatedTopics) {
        if (results.length >= topK) break;

        // Handle nested topics
        if ('Topics' in topic && Array.isArray(topic.Topics)) {
          for (const subTopic of topic.Topics) {
            if (results.length >= topK) break;
            if (subTopic.Text && subTopic.FirstURL) {
              results.push({
                title: subTopic.Text.split(' - ')[0] || 'Related Result',
                url: subTopic.FirstURL,
                snippet: annotateRelativeTime(subTopic.Text, runtimeDate),
                source: 'duckduckgo',
              });
            }
          }
        } else if ('Text' in topic && topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Result',
            url: topic.FirstURL,
            snippet: annotateRelativeTime(topic.Text, runtimeDate),
            source: 'duckduckgo',
          });
        }
      }
    }

    // If no results from instant answer API, try HTML search as fallback
    if (results.length === 0) {
      return await searchWithDuckDuckGoHTML(query, topK, runtimeDate);
    }

    return results.slice(0, topK);
  } catch (error) {
    // If main DuckDuckGo API fails, try HTML fallback
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Search API] DuckDuckGo API timeout, trying HTML fallback');
      return await searchWithDuckDuckGoHTML(query, topK, runtimeDate);
    }
    throw error;
  }
}

async function searchWithDuckDuckGoHTML(query: string, topK: number, runtimeDate: Date): Promise<WebSearchQueryItem[]> {
  // Fallback to HTML scraping if instant answer API doesn't return results
  const params = new URLSearchParams({
    q: query,
    kl: 'us-en',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': SEARCH_PROVIDER_USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML search failed (${response.status})`);
    }

    const html = await response.text();
    
    // Parse HTML to extract search results
    const results: WebSearchQueryItem[] = [];
    
    // Extract result links and snippets
    const resultPattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    
    let match;
    let count = 0;
    while ((match = resultPattern.exec(html)) !== null && count < topK) {
      const url = match[1]?.trim();
      const title = match[2]?.trim() || 'Untitled';
      const snippetHtml = match[3] || '';
      const snippet = snippetHtml.replace(/<[^>]+>/g, '').trim();
      
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        continue;
      }
      
      results.push({
        title,
        url,
        snippet: annotateRelativeTime(snippet, runtimeDate),
        source: 'duckduckgo',
      });
      count++;
    }

    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('DuckDuckGo search timeout - please try again or switch to another provider');
    }
    throw error;
  }
}

async function searchWithBrave(query: string, topK: number, runtimeDate: Date, apiKey?: string): Promise<WebSearchQueryItem[]> {
  const key = apiKey || SEARCH_PROVIDER_API_KEY;
  
  if (!key) {
    throw new Error(
      'Brave search requires an API key. Set SEARCH_PROVIDER_API_KEY or provide apiKey in config.'
    );
  }

  const params = new URLSearchParams({
    q: query,
    count: String(topK),
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': key,
    },
  });

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(`Brave search failed (${response.status}): ${details}`);
  }

  const json = await response.json() as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        age?: string;
        extra_snippets?: string[];
      }>;
    };
  };

  if (!json.web?.results || json.web.results.length === 0) {
    return [];
  }

  return json.web.results.slice(0, topK).map((item) => {
    const snippet = annotateRelativeTime(item.description || '', runtimeDate);
    const { iso, display } = resolvePublishedTimestamp(item.age, runtimeDate);

    return {
      title: item.title || 'Untitled result',
      url: item.url || '',
      snippet,
      publishedAt: iso,
      publishedDisplay: display,
      source: 'brave',
    };
  });
}

async function searchWithTavily(query: string, topK: number, runtimeDate: Date, apiKey?: string): Promise<WebSearchQueryItem[]> {
  const key = apiKey || SEARCH_PROVIDER_API_KEY;
  
  if (!key) {
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

  return json.results.slice(0, topK).map((item) => {
    const snippet = annotateRelativeTime(item.content || "", runtimeDate);
    const { iso, display } = resolvePublishedTimestamp(item.published_date, runtimeDate);

    return {
      title: item.title || "Untitled result",
      url: item.url || "",
      snippet,
      publishedAt: iso,
      publishedDisplay: display,
      source: item.source,
    };
  });
}

async function searchWithSerpApi(query: string, topK: number, runtimeDate: Date, apiKey?: string): Promise<WebSearchQueryItem[]> {
  const key = apiKey || SEARCH_PROVIDER_API_KEY;
  
  if (!key) {
    throw new Error(
      "SerpAPI search requires SEARCH_PROVIDER_API_KEY or SERPAPI_API_KEY to be set on the server."
    );
  }

  const params = new URLSearchParams({
    api_key: key,
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

  return json.organic_results.slice(0, topK).map((item) => {
    const snippet = annotateRelativeTime(item.snippet || "", runtimeDate);
    const { iso, display } = resolvePublishedTimestamp(item.date, runtimeDate);

    return {
      title: item.title || "Untitled result",
      url: item.link || "",
      snippet,
      publishedAt: iso,
      publishedDisplay: display,
      source: item.source,
    };
  });
}

function getMockResults(query: string): WebSearchQueryItem[] {
  return [
    {
      title: `Web search temporarily unavailable for: "${query}"`,
      url: "https://github.com/yourusername/multi-agent-project",
      snippet:
        "The selected search provider is currently unavailable. You can configure a different provider in Settings > Search. Available options: DuckDuckGo (no setup required), Brave Search, SearxNG, or others.",
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
    case "duckduckgo":
      return "duckduckgo";
    case "brave":
      return "brave";
    case "mock":
      return "mock";
    default:
      return SEARCH_PROVIDER;
  }
}

async function searchWithSearxng(query: string, topK: number, runtimeDate: Date, baseUrl?: string, basicAuth?: string): Promise<WebSearchQueryItem[]> {
  const configuredBaseUrl = baseUrl || SEARCH_PROVIDER_BASE_URL;
  
  if (!configuredBaseUrl) {
    throw new Error(
      "SearxNG search requires SEARCH_PROVIDER_BASE_URL or SEARXNG_BASE_URL to be configured."
    );
  }

  const primaryBaseUrl = normalizeBaseUrl(configuredBaseUrl);

  try {
    return await querySearxngInstance(primaryBaseUrl, query, topK, true, runtimeDate, basicAuth);
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
          false,
          runtimeDate,
          undefined
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
  includeAuth: boolean = true,
  referenceDate: Date,
  customBasicAuth?: string
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
  for (const [key, value] of params.entries()) {
    endpoint.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": SEARCH_PROVIDER_USER_AGENT,
    Referer: origin,
    Origin: origin,
    "X-Forwarded-For": "127.0.0.1",
    "X-Real-IP": "127.0.0.1",
  };

  const authToUse = customBasicAuth || SEARCH_PROVIDER_BASIC_AUTH;
  
  if (includeAuth && authToUse) {
    const basicToken = Buffer.from(authToUse, "utf8").toString("base64");
    headers.Authorization = `Basic ${basicToken}`;
  } else if (includeAuth && SEARCH_PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${SEARCH_PROVIDER_API_KEY}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "GET",
      headers,
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

  return json.results.slice(0, topK).map((item) => {
    const snippet = annotateRelativeTime(item.content || "", referenceDate);
    const { iso, display } = resolvePublishedTimestamp(item.published, referenceDate);

    return {
      title: item.title || "Untitled result",
      url: item.url || "",
      snippet,
      publishedAt: iso,
      publishedDisplay: display,
      source: item.source,
    };
  });
}
