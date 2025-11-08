import type { WebSearchRequestBody, WebSearchResponse } from "@/types/web-search";
import { getActiveProviderConfig } from "@/services/storage/search-settings-storage";

interface ExecuteWebSearchOptions {
  queries: string[];
  topK?: number;
  signal?: AbortSignal;
}

/**
 * Call the internal search endpoint. Returns normalized search results.
 */
export async function executeWebSearch(
  options: ExecuteWebSearchOptions
): Promise<WebSearchResponse> {
  const { queries, topK = 3, signal } = options;

  if (!Array.isArray(queries) || queries.length === 0) {
    return { results: [] };
  }

  // Get user's search provider settings
  const providerConfig = await getActiveProviderConfig();

  const body: WebSearchRequestBody = {
    queries,
    top_k: topK,
    provider: providerConfig.provider,
    config: {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      basicAuth: providerConfig.basicAuth,
    },
  };

  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const errorMessage = (errorPayload?.error as string) ||
        `Web search failed with status ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data as WebSearchResponse;
}

async function safeParseJSON(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
