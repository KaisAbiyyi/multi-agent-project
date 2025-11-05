/**
 * Web search related type definitions
 */

export interface WebSearchQueryItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  source?: string;
}

export interface WebSearchQueryResult {
  query: string;
  items: WebSearchQueryItem[];
}

export interface WebSearchResponse {
  results: WebSearchQueryResult[];
  provider?: string;
  tookMs?: number;
}

export interface WebSearchDetection {
  needsWeb: boolean;
  reason?: string;
  keywordsMatched?: string[];
}

export interface WebSearchRequestBody {
  queries: string[];
  top_k?: number;
}
