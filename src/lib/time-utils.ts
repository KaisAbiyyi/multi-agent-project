/**
 * Time normalization and formatting helpers.
 *
 * Provides utilities to:
 * - Build runtime date directives for prompts
 * - Annotate relative time phrases inside snippets
 * - Resolve published timestamps into ISO strings and human-readable labels
 */

const HUMAN_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

type RelativeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

const UNIT_IN_MS: Record<RelativeUnit, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000, // Approximation is acceptable for contextual hints
  year: 365 * 24 * 60 * 60 * 1000,
};

const RELATIVE_REGEX = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/gi;

/**
 * Format a JS Date into a human readable label (e.g. "November 5, 2025").
 */
export function formatHumanDate(date: Date): string {
  return HUMAN_DATE_FORMAT.format(date);
}

/**
 * Build a directive that tells the LLM what the current runtime date is.
 * The returned string is appended to system prompts.
 */
export function buildRuntimeDateDirective(date: Date): string {
  const iso = date.toISOString();
  const human = formatHumanDate(date);
  return [
    "Current date context:",
    `- Localized: ${human}`,
    `- ISO: ${iso}`,
    "",
    "Treat references to \"today\", \"now\", or relative time in the user's prompt or search results in relation to this runtime date.",
    "When citing external sources, prefer explicit dates from the source; if only relative phrases are provided, clarify them using this runtime date.",
  ].join("\n");
}

/**
 * Annotate relative time phrases like "3 days ago" with approximate calendar dates.
 */
export function annotateRelativeTime(text: string, reference: Date): string {
  if (!text) {
    return text;
  }

  let updated = text.replace(RELATIVE_REGEX, (match, value, unitRaw) => {
    const unit = unitRaw.toLowerCase() as RelativeUnit;
    const quantity = Number.parseInt(value, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return match;
    }

    const offsetMs = UNIT_IN_MS[unit];
    if (!offsetMs) {
      return match;
    }

    const approxDate = new Date(reference.getTime() - quantity * offsetMs);
    return `${match} (approx. ${formatHumanDate(approxDate)})`;
  });

  updated = updated.replace(/\btoday\b/gi, (match) => `${match} (${formatHumanDate(reference)})`);

  updated = updated.replace(/\byesterday\b/gi, (match) => {
    const date = new Date(reference.getTime() - UNIT_IN_MS.day);
    return `${match} (${formatHumanDate(date)})`;
  });

  updated = updated.replace(/\blast week\b/gi, (match) => {
    const date = new Date(reference.getTime() - UNIT_IN_MS.week);
    return `${match} (${formatHumanDate(date)})`;
  });

  updated = updated.replace(/\blast month\b/gi, (match) => {
    const date = new Date(reference.getTime() - UNIT_IN_MS.month);
    return `${match} (${formatHumanDate(date)})`;
  });

  updated = updated.replace(/\blast year\b/gi, (match) => {
    const date = new Date(reference.getTime() - UNIT_IN_MS.year);
    return `${match} (${formatHumanDate(date)})`;
  });

  return updated;
}

/**
 * Attempt to resolve a "published" field coming back from the search provider.
 * Returns both an ISO string and a human readable label when possible.
 */
export function resolvePublishedTimestamp(
  published: unknown,
  reference: Date
): { iso?: string; display?: string } {
  if (published === null || typeof published === "undefined") {
    return {};
  }

  if (typeof published === "number" && Number.isFinite(published)) {
    // SearxNG may return epoch seconds
    const date = published > 10_000 ? new Date(published) : new Date(published * 1000);
    return {
      iso: date.toISOString(),
      display: formatHumanDate(date),
    };
  }

  if (typeof published === "string") {
    const trimmed = published.trim();
    if (!trimmed) {
      return {};
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && trimmed.length >= 4) {
      const date = numeric > 10_000 ? new Date(numeric) : new Date(numeric * 1000);
      return {
        iso: date.toISOString(),
        display: formatHumanDate(date),
      };
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.valueOf())) {
      return {
        iso: date.toISOString(),
        display: formatHumanDate(date),
      };
    }

    // Relative phrase fallback (e.g. "2 days ago")
    const annotated = annotateRelativeTime(trimmed, reference);
    return { display: annotated };
  }

  return {};
}

/**
 * Convenience helper to format a Date as ISO without milliseconds (for cleaner display).
 */
export function toIsoDateOnly(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}
