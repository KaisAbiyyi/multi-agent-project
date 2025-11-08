/**
 * Web search related type definitions
 */

export type SearchProvider = 'searxng' | 'duckduckgo' | 'brave' | 'tavily' | 'serpapi' | 'mock';

export interface SearchProviderConfig {
  provider: SearchProvider;
  apiKey?: string; // For Brave, Tavily, SerpAPI
  baseUrl?: string; // For SearxNG
  basicAuth?: string; // For SearxNG
}

export interface WebSearchQueryItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  publishedDisplay?: string;
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
  capturedAt?: string;
}

export interface WebSearchDetection {
  needsWeb: boolean;
  reason?: string;
  keywordsMatched?: string[];
}

export interface WebSearchRequestBody {
  queries: string[];
  top_k?: number;
  provider?: SearchProvider;
  config?: Partial<SearchProviderConfig>;
}

export interface WebSearchCitation {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
  publishedDisplay?: string;
  query: string;
}
