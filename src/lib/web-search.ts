/**
 * Web search helper utilities
 *
 * Provides:
 * - Lightweight heuristic detector to decide if a prompt needs fresh web information
 * - Minimal query builder that cleans user phrasing before hitting search provider
 */

import type { WebSearchDetection, WebSearchQueryResult, WebSearchResponse } from "@/types/web-search";
import { detectWebNeedAdvanced, detectWebNeedSync } from "./web-search-advanced";

/**
 * Multi-language search trigger keywords
 * Supports: English, Indonesian, Spanish, French, German, Italian, Portuguese, Dutch, Japanese, Korean, Chinese
 */
const SEARCH_KEYWORDS = [
  // Indonesian
  "versi", "sekarang", "harga", "gimana", "cara", "bagaimana", "apa itu", "rilis", "terbaru", "kapan", "berapa",
  
  // English
  "latest", "current", "price", "how to", "how", "what is", "when", "where", "release", "download", 
  "changelog", "update", "news", "today", "now", "recent", "new", "enable", "install", "setup",
  "version", "available", "cost", "guide", "tutorial",
  
  // Spanish
  "cómo", "qué es", "cuándo", "dónde", "precio", "último", "actual", "versión", "descargar",
  
  // French
  "comment", "qu'est-ce", "quand", "où", "prix", "dernier", "actuel", "version", "télécharger",
  
  // German
  "wie", "was ist", "wann", "wo", "preis", "neueste", "aktuell", "version", "herunterladen",
  
  // Italian
  "come", "cos'è", "quando", "dove", "prezzo", "ultimo", "attuale", "versione", "scaricare",
  
  // Portuguese
  "como", "o que é", "quando", "onde", "preço", "último", "atual", "versão", "baixar",
  
  // Dutch
  "hoe", "wat is", "wanneer", "waar", "prijs", "laatste", "huidige", "versie", "downloaden",
  
  // Japanese (romaji for easier matching)
  "最新", "価格", "方法", "いつ", "どこ", "バージョン", "ダウンロード",
  
  // Korean
  "최신", "가격", "방법", "언제", "어디", "버전", "다운로드",
  
  // Chinese (Simplified & Traditional)
  "最新", "价格", "怎么", "什么", "何时", "哪里", "版本", "下载", "現在", "如何",
];

/**
 * Multi-language filler/stop words to remove from queries
 */
const STOP_WORDS = [
  // Indonesian
  "tolong", "dong", "ya", "bang", "bro", "sis", "gimana", "bagaimana", "cara", "mohon", "nih", "sih",
  
  // English
  "please", "just", "can", "could", "would", "should", "like", "the", "a", "an",
  
  // Spanish
  "por favor", "solo", "puede", "podría",
  
  // French
  "s'il vous plaît", "juste", "peut", "pourrait",
  
  // German
  "bitte", "nur", "kann", "könnte",
  
  // Portuguese
  "por favor", "apenas", "pode", "poderia",
];

const DOMAIN_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?(?:[-a-z0-9]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;

const SPLIT_DELIMITERS = [" dan ", " & ", " lalu ", ",", ";", " and ", " y ", " et ", " und ", " e "];

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

  if (results.capturedAt) {
    lines.push(`Captured at: ${results.capturedAt}`);
  }

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
    const publishedTokens: string[] = [];
    if (item.publishedDisplay) {
      publishedTokens.push(item.publishedDisplay);
    }
    if (item.publishedAt) {
      publishedTokens.push(item.publishedAt);
    }
    if (publishedTokens.length > 0) {
      snippetPieces.push(`Published: ${publishedTokens.join(" | ")}`);
    }

    blockLines.push(
      `${rank}. ${item.title}\n   URL: ${item.url}\n   ${snippetPieces.filter(Boolean).join(" | ")}`
    );
  });

  return blockLines.join("\n");
}

/**
 * Smart web search detection with advanced pattern matching
 * 
 * This function uses the advanced detection system with language detection and translation.
 * Falls back to simple keyword-based detection if advanced detection fails.
 * 
 * @param message - User's message to analyze
 * @param useAdvanced - Whether to use advanced detection (default: true)
 * @returns Detection result with needsWeb flag and metadata
 */
export async function detectWebNeedSmart(
  message: string,
  useAdvanced: boolean = true
): Promise<WebSearchDetection & { confidence?: 'high' | 'medium' | 'low'; categories?: string[] }> {
  if (!useAdvanced) {
    // Use simple keyword-based detection
    return detectWebNeed(message);
  }

  try {
    // Try advanced detection with language detection and translation
    const advanced = await detectWebNeedAdvanced(message);
    
    return {
      needsWeb: advanced.needsWeb,
      reason: advanced.reason,
      keywordsMatched: [], // Advanced system doesn't use keyword matching
      confidence: advanced.confidence,
      categories: advanced.categories,
    };
  } catch (error) {
    console.warn('[WebSearch] Advanced detection failed, falling back to simple detection:', error);
    // Fallback to simple detection
    return detectWebNeed(message);
  }
}

/**
 * Synchronous smart detection (uses pattern-based fallback)
 * Use this when you can't use async/await
 */
export function detectWebNeedSmartSync(message: string): WebSearchDetection {
  try {
    const sync = detectWebNeedSync(message);
    return {
      needsWeb: sync.needsWeb,
      reason: sync.reason,
      keywordsMatched: [],
    };
  } catch (error) {
    console.warn('[WebSearch] Sync detection failed, falling back to keyword detection:', error);
    return detectWebNeed(message);
  }
}
