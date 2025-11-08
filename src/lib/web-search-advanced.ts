/**
 * Advanced Web Search Detection System
 * 
 * Features:
 * - Language detection using franc-min
 * - Translation to English for unified regex matching
 * - Comprehensive regex patterns for various query types
 * - Fallback to keyword-based detection
 */

import { franc } from 'franc-min';
import { translate } from '@vitalets/google-translate-api';

/**
 * Advanced regex patterns for detecting web search needs (English-based)
 * These patterns cover various categories of queries that require real-time web data
 */
const SEARCH_PATTERNS = [
  // 1. Current events / news / people
  {
    category: 'current_events',
    patterns: [
      /\b(who|what|when|where|how)\s+(is|was|are|were)\s+(the\s+)?(president|prime minister|ceo|governor|mayor|artist|official|actor|actress|singer|player|athlete)\b/i,
      /\b(news|update|breaking|latest|recent|trending|viral)\b/i,
      /\b(today|this week|this month|yesterday|currently|now)\b/i,
      /\b(when)\s+(is|was|will be|did)\s+(released|launch|coming out|premiere|announced)\b/i,
      /\b(who won|who is winning|result of|score of)\b/i,
    ],
  },

  // 2. Pricing, products, specifications
  {
    category: 'products_pricing',
    patterns: [
      /\b(price|cost|how much|pricing)\s+(of|for)?\s+\w+/i,
      /\b(specs|specifications|features|review|reviews)\s+(of|for)?\s+\w+/i,
      /\b(compare|comparison|vs|versus|better|cheaper|best)\s+\w+/i,
      /\b(buy|purchase|sell|available|in stock|order)\s+\w+/i,
      /\b(discount|sale|deal|offer|promo)\b/i,
    ],
  },

  // 3. Weather, time, location
  {
    category: 'weather_time_location',
    patterns: [
      /\b(weather|temperature|forecast|climate|rain|sunny|storm)\s+(today|tomorrow|in\s+\w+|now)\b/i,
      /\b(what time|current time|time now)\s+(in|at)?\s+\w+/i,
      /\b(location|address|place|where is|map of)\s+\w+/i,
      /\b(directions|route|how to get to)\s+\w+/i,
    ],
  },

  // 4. Events, schedules, entertainment
  {
    category: 'events_schedule',
    patterns: [
      /\b(when|where)\s+(is|was)\s+(the\s+)?(concert|event|match|game|film|movie|show|conference|seminar|webinar)\b/i,
      /\b(schedule|timetable|lineup)\s+(of|for)\s+(train|flight|bus|movie|game|concert)\b/i,
      /\b(tickets|booking|registration)\s+(for|to)\s+\w+/i,
      /\b(live stream|watch online|stream)\s+\w+/i,
    ],
  },

  // 5. Finance, economy, crypto
  {
    category: 'finance_economy',
    patterns: [
      /\b(price|value|rate)\s+(of|for)?\s+(bitcoin|crypto|btc|eth|stock|shares|gold|silver|forex)\b/i,
      /\b(exchange rate|currency|conversion)\s+\w+/i,
      /\b(market|economy|inflation|gdp|unemployment)\s+(news|data|report|update)\b/i,
      /\b(stock market|dow jones|nasdaq|s&p|nikkei)\b/i,
    ],
  },

  // 6. Academic, research, papers
  {
    category: 'academic_research',
    patterns: [
      /\b(paper|journal|research|study|thesis|dissertation|article)\s+(on|about)\s+\w+/i,
      /\b(academic|scientific|scholarly)\s+(source|reference|citation)\b/i,
      /\b(case study|literature review|meta-analysis)\s+(of|on)\s+\w+/i,
      /\b(doi|arxiv|pubmed|google scholar)\b/i,
    ],
  },

  // 7. Statistics, data, demographics
  {
    category: 'statistics_data',
    patterns: [
      /\b(population|demographic|census|statistics|data)\s+(of|in|for)\s+(\w+|\d{4})\b/i,
      /\b(how many|number of|total|count)\s+\w+\s+(in|at|during)\s+\d{4}\b/i,
      /\b(cases|deaths|infections|confirmed)\s+(of|in)\s+\w+/i,
      /\b(growth rate|percentage|ratio)\s+(of|in)\s+\w+/i,
    ],
  },

  // 8. Technology, software, versions
  {
    category: 'technology',
    patterns: [
      /\b(version|release|update|patch)\s+(of|for)?\s+\w+/i,
      /\b(latest|newest|current)\s+(version|release)\s+(of|for)?\s+\w+/i,
      /\b(changelog|release notes|what's new)\s+(in|for)?\s+\w+/i,
      /\b(download|install|setup|configure)\s+\w+/i,
      /\b(compatibility|support|works with)\s+\w+/i,
    ],
  },

  // 9. Legal, regulations, laws
  {
    category: 'legal_regulations',
    patterns: [
      /\b(law|regulation|policy|rule|statute)\s+(on|about|regarding)\s+\w+/i,
      /\b(legal|illegal|permitted|allowed|banned)\s+(in|at)\s+\w+/i,
      /\b(court case|lawsuit|verdict|ruling)\s+(on|about)\s+\w+/i,
      /\b(visa|immigration|passport)\s+(requirement|rules|process)\b/i,
    ],
  },

  // 10. Travel, tourism, hotels
  {
    category: 'travel_tourism',
    patterns: [
      /\b(hotel|accommodation|resort|hostel)\s+(in|at|near)\s+\w+/i,
      /\b(flight|flights|airline)\s+(to|from)\s+\w+/i,
      /\b(travel|visit|trip|vacation)\s+(to|in)\s+\w+/i,
      /\b(tourist|attraction|sightseeing|landmark)\s+(in|at)\s+\w+/i,
      /\b(visa requirement|entry requirement)\s+(for|to)\s+\w+/i,
    ],
  },

  // 11. Health, medical, symptoms
  {
    category: 'health_medical',
    patterns: [
      /\b(symptom|symptoms|side effect|effects)\s+(of|for)\s+\w+/i,
      /\b(treatment|cure|remedy|medicine)\s+(for|of)\s+\w+/i,
      /\b(hospital|clinic|doctor)\s+(in|at|near)\s+\w+/i,
      /\b(covid|pandemic|outbreak|epidemic)\s+(in|at|update)\b/i,
      /\b(vaccine|vaccination|immunization)\s+(for|against)\s+\w+/i,
    ],
  },

  // 12. Sports, games, scores
  {
    category: 'sports_games',
    patterns: [
      /\b(score|result|final|standings)\s+(of|for)\s+\w+/i,
      /\b(match|game|tournament|championship)\s+(today|yesterday|live)\b/i,
      /\b(player|team|roster|lineup)\s+(stats|statistics|performance)\b/i,
      /\b(transfer|trade|signing|contract)\s+(news|rumors)\b/i,
    ],
  },

  // 13. URLs and domains (always needs web context)
  {
    category: 'url_domain',
    patterns: [
      /\b(?:https?:\/\/)?(?:www\.)?[-a-z0-9]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi,
    ],
  },
];

/**
 * Language code mapping for franc to ISO 639-1
 */
const LANG_CODE_MAP: Record<string, string> = {
  'eng': 'en',
  'ind': 'id',
  'spa': 'es',
  'fra': 'fr',
  'deu': 'de',
  'ita': 'it',
  'por': 'pt',
  'nld': 'nl',
  'jpn': 'ja',
  'kor': 'ko',
  'cmn': 'zh',
  'zho': 'zh',
};

/**
 * Detect language of the message
 */
function detectLanguage(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  // Pattern-based detection for all languages (works better for short queries)
  const patterns = {
    id: /\b(siapa|apa|dimana|kapan|berapa|gimana|bagaimana|yang|dengan|untuk|dari|adalah|ini|itu|dong|ya|nih|sekarang|harga|terbaru|cuaca|hari ini)\b/,
    es: /\b(¿|qué|cuál|dónde|cuándo|cómo|precio|hoy|ahora)\b/,
    fr: /\b(qu'est|où|quand|comment|quel|prix|aujourd'hui|maintenant)\b/,
    de: /\b(wie|was|wo|wann|welche|preis|heute|jetzt)\b/,
    pt: /\b(o que|quando|onde|como|qual|preço|hoje|agora)\b/,
    it: /\b(cos'è|quando|dove|come|quale|prezzo|oggi|adesso)\b/,
    ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
    ko: /[\uAC00-\uD7AF]/,
    zh: /[\u4E00-\u9FFF]/,
  };
  
  // Check patterns first (most reliable for short queries)
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerMsg)) {
      return lang;
    }
  }
  
  // Fallback to franc for longer messages
  if (message.length >= 20) {
    const langCode = franc(message);
    if (langCode !== 'und') {
      return LANG_CODE_MAP[langCode] || 'en';
    }
  }
  
  // Default to English
  return 'en';
}

/**
 * Translate message to English for regex matching
 */
async function translateToEnglish(message: string, fromLang: string): Promise<string> {
  // If already English, return as-is
  if (fromLang === 'en') {
    return message;
  }

  try {
    const result = await translate(message, { from: fromLang, to: 'en' });
    return result.text;
  } catch (error) {
    console.warn('[WebSearch] Translation failed, using original message:', error);
    return message;
  }
}

/**
 * Check if translated message matches any search patterns
 */
function matchSearchPatterns(translatedMessage: string): {
  matches: boolean;
  categories: string[];
  matchedPatterns: number;
} {
  const categories: string[] = [];
  let matchedPatterns = 0;

  for (const { category, patterns } of SEARCH_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(translatedMessage)) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
        matchedPatterns++;
      }
    }
  }

  return {
    matches: matchedPatterns > 0,
    categories,
    matchedPatterns,
  };
}

/**
 * Advanced web search detection with language detection and translation
 */
export async function detectWebNeedAdvanced(message: string): Promise<{
  needsWeb: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  detectedLanguage: string;
  categories: string[];
  matchedPatterns: number;
}> {
  // Detect language
  const detectedLang = detectLanguage(message);
  
  // Translate to English
  const translatedMessage = await translateToEnglish(message, detectedLang);
  
  // Match against patterns
  const patternMatch = matchSearchPatterns(translatedMessage);

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (patternMatch.matchedPatterns >= 3) {
    confidence = 'high';
  } else if (patternMatch.matchedPatterns >= 1) {
    confidence = 'medium';
  }

  // Build reason string
  const reason = patternMatch.matches
    ? `Detected ${patternMatch.categories.join(', ')} queries (${patternMatch.matchedPatterns} pattern matches)`
    : undefined;

  return {
    needsWeb: patternMatch.matches,
    confidence,
    reason,
    detectedLanguage: detectedLang,
    categories: patternMatch.categories,
    matchedPatterns: patternMatch.matchedPatterns,
  };
}

/**
 * Synchronous fallback detection (uses old keyword-based approach)
 * Use this when async detection is not suitable
 */
export function detectWebNeedSync(message: string): {
  needsWeb: boolean;
  reason?: string;
} {
  const lower = message.toLowerCase();
  
  // Quick pattern checks (non-translated)
  const hasUrl = /\b(?:https?:\/\/)?(?:www\.)?[-a-z0-9]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi.test(message);
  const hasTimeReference = /\b(today|now|current|latest|recent|this week|yesterday)\b/i.test(lower);
  const hasQuestion = /\b(what is|who is|when is|where is|how much|how many)\b/i.test(lower);
  const hasPricing = /\b(price|cost|harga|pricing)\b/i.test(lower);
  
  const needsWeb = hasUrl || (hasTimeReference && hasQuestion) || hasPricing;
  
  return {
    needsWeb,
    reason: needsWeb ? 'Quick pattern match (URL, time reference, or pricing detected)' : undefined,
  };
}
