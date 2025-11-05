import type { WebSearchRequestBody, WebSearchResponse } from "@/types/web-search";

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

  const body: WebSearchRequestBody = {
    queries,
    top_k: topK,
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
    throw new Error(
      errorPayload?.error ||
        `Web search failed with status ${response.status}: ${response.statusText}`
    );
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
