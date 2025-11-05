/**
 * Web search helper utilities
 *
 * Provides:
 * - Lightweight heuristic detector to decide if a prompt needs fresh web information
 * - Minimal query builder that cleans user phrasing before hitting search provider
 */

import type { WebSearchDetection, WebSearchQueryResult, WebSearchResponse } from "@/types/web-search";

const SEARCH_KEYWORDS = [
  "versi",
  "latest",
  "sekarang",
  "harga",
  "gimana",
  "cara",
  "bagaimana",
  "apa itu",
  "release",
  "rilis",
  "download",
  "changelog",
  "update",
  "enable",
  "install",
  "setup",
];

const STOP_WORDS = [
  "tolong",
  "dong",
  "please",
  "ya",
  "bang",
  "bro",
  "sis",
  "gimana",
  "bagaimana",
  "cara",
  "mohon",
];

const DOMAIN_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?(?:[-a-z0-9]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;

const SPLIT_DELIMITERS = [" dan ", " & ", " lalu ", ",", ";"];

/**
 * Determine if a message likely needs web search context.
 * This is intentionally conservative; the LLM can still answer without context.
 */
export function detectWebNeed(message: string): WebSearchDetection {
  const lower = message.toLowerCase();
  const keywordsMatched = SEARCH_KEYWORDS.filter((keyword) => lower.includes(keyword));
  DOMAIN_REGEX.lastIndex = 0;
  const hasDomain = DOMAIN_REGEX.test(message);

  const needsWeb = keywordsMatched.length > 0 || hasDomain;

  return {
    needsWeb,
    reason: needsWeb
      ? hasDomain
        ? "Detected domain or URL reference"
        : keywordsMatched.length > 0
          ? `Matched keywords: ${keywordsMatched.join(", ")}`
          : undefined
      : undefined,
    keywordsMatched,
  };
}

/**
 * Remove filler words that add noise to search queries.
 */
function stripStopWords(value: string): string {
  let cleaned = value;
  for (const word of STOP_WORDS) {
    const pattern = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Break down a user message into targeted search queries.
 * Currently splits on simple conjunctions and commas.
 */
export function buildSearchQueries(message: string): string[] {
  let working = message.toLowerCase().trim();
  working = stripStopWords(working);

  if (!working) {
    return [];
  }

  let queries: string[] = [working];

  for (const delimiter of SPLIT_DELIMITERS) {
    if (working.includes(delimiter.trim())) {
      queries = working
        .split(delimiter)
        .map((part) => stripStopWords(part))
        .map((part) => part.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      break;
    }
  }

  return Array.from(new Set(queries));
}

/**
 * Build a compact text block suitable for injecting into an LLM prompt.
 */
export function formatSearchResults(results: WebSearchResponse): string {
  if (!results.results.length) {
    return "No live web results were retrieved.";
  }

  const lines: string[] = ["Web search results:"];

  results.results.forEach((result) => {
    lines.push(buildResultBlock(result));
  });

  if (results.provider) {
    lines.push(`(Provided by ${results.provider}${typeof results.tookMs === "number" ? `, fetched in ${results.tookMs}ms` : ""})`);
  }

  return lines.join("\n");
}

function buildResultBlock(result: WebSearchQueryResult): string {
  const blockLines: string[] = [];
  blockLines.push(`Query: "${result.query}"`);

  if (result.items.length === 0) {
    blockLines.push("- No results found.");
    return blockLines.join("\n");
  }

  result.items.forEach((item, index) => {
    const rank = index + 1;
    const snippetPieces = [item.snippet];
    if (item.source) {
      snippetPieces.push(`Source: ${item.source}`);
    }
    if (item.publishedAt) {
      snippetPieces.push(`Published: ${item.publishedAt}`);
    }
    blockLines.push(
      `${rank}. ${item.title}\n   URL: ${item.url}\n   ${snippetPieces.filter(Boolean).join(" | ")}`
    );
  });

  return blockLines.join("\n");
}
