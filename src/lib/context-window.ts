const DEFAULT_MIN_CONTEXT = 512;

export const OLLAMA_DEFAULT_CONTEXT_WINDOW = 4_096;
export const OLLAMA_MAX_CONTEXT_WINDOW = 131_072;

/**
 * Minimum allowed context window for sliders and validation
 */
export const MIN_CONTEXT_WINDOW = DEFAULT_MIN_CONTEXT;

/**
 * Determine a reasonable slider step size based on model maximum context window.
 * Uses common increments to avoid overly granular adjustments.
 */
export function getContextStep(maxContextWindow: number): number {
  if (!Number.isFinite(maxContextWindow) || maxContextWindow <= 0) {
    return DEFAULT_MIN_CONTEXT;
  }

  if (maxContextWindow <= 2_048) return 256;
  if (maxContextWindow <= 8_192) return 512;
  if (maxContextWindow <= 32_768) return 1_024;
  if (maxContextWindow <= 65_536) return 2_048;
  return 4_096;
}

/**
 * Normalize a requested context window so it stays within bounds and aligns with slider steps.
 */
export function normalizeContextWindow(
  value: number | undefined | null,
  maxContextWindow: number,
  step: number,
  minOverride = MIN_CONTEXT_WINDOW
): number {
  const safeMax = Number.isFinite(maxContextWindow) && maxContextWindow > 0
    ? maxContextWindow
    : MIN_CONTEXT_WINDOW;

  const safeStep = Number.isFinite(step) && step > 0 ? step : getContextStep(safeMax);
  const effectiveMin = Math.min(safeMax, Math.max(safeStep, minOverride, MIN_CONTEXT_WINDOW));

  const fallback = safeMax;
  const candidate = Number.isFinite(value ?? NaN) && (value as number) > 0
    ? (value as number)
    : fallback;

  const clamped = Math.min(Math.max(candidate, effectiveMin), safeMax);
  const rounded = Math.round(clamped / safeStep) * safeStep;
  return Math.min(safeMax, Math.max(effectiveMin, rounded));
}

/**
 * Coerce an unknown value into a positive integer context window when possible.
 */
export function coerceContextWindow(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const cleaned = trimmed
      .toLowerCase()
      .replace(/(tokens?|token|tok|ctx|context|length|window)/g, "")
      .replace(/[\s,_-]+/g, "")
      .trim();

    const suffixMatch = cleaned.match(/^(\d+(?:\.\d+)?)([kmgt]?)$/i);

    if (suffixMatch) {
      const numericPortion = Number(suffixMatch[1]);
      if (Number.isFinite(numericPortion) && numericPortion > 0) {
        const suffix = suffixMatch[2]?.toLowerCase() ?? "";
        const multipliers: Record<string, number> = {
          "": 1,
          k: 1024,
          m: 1024 * 1024,
          g: 1024 * 1024 * 1024,
          t: 1024 * 1024 * 1024 * 1024,
        };
        const multiplier = multipliers[suffix];

        if (multiplier) {
          return Math.floor(numericPortion * multiplier);
        }
      }
    }

    const digitsOnly = trimmed.replace(/[^0-9]+/g, "");
    if (digitsOnly.length >= 3) {
      const parsed = Number.parseInt(digitsOnly, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return undefined;
}
