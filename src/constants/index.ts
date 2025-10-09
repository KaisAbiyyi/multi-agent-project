/**
 * Application-wide constants
 */

import { AIProvider } from "@/types";

/**
 * Supported AI providers
 */
export const AI_PROVIDERS: Record<
  AIProvider,
  {
    name: string;
    baseURL: string;
    requiresAPIKey: boolean;
    supportsStreaming: boolean;
    isLocal: boolean;
  }
> = {
  ollama: {
    name: "Ollama (Local)",
    baseURL: "http://localhost:11434/v1",
    requiresAPIKey: false,
    supportsStreaming: true,
    isLocal: true,
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    requiresAPIKey: true,
    supportsStreaming: true,
    isLocal: false,
  },
  llm7: {
    name: "LLM7",
    baseURL: "https://api.llm7.io/v1",
    requiresAPIKey: true,
    supportsStreaming: true,
    isLocal: false,
  },
};

/**
 * Default model configurations
 */
export const DEFAULT_MODELS = [
  // OpenAI
  {
    id: "gpt-4-turbo",
    provider: "openai" as AIProvider,
    name: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    contextWindow: 128000,
    costPer1kTokens: { input: 0.01, output: 0.03 },
  },
  {
    id: "gpt-4",
    provider: "openai" as AIProvider,
    name: "gpt-4",
    displayName: "GPT-4",
    contextWindow: 8192,
    costPer1kTokens: { input: 0.03, output: 0.06 },
  },
  {
    id: "gpt-3.5-turbo",
    provider: "openai" as AIProvider,
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    contextWindow: 16385,
    costPer1kTokens: { input: 0.0005, output: 0.0015 },
  },
  // Anthropic
  {
    id: "claude-3-opus",
    provider: "anthropic" as AIProvider,
    name: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    contextWindow: 200000,
    costPer1kTokens: { input: 0.015, output: 0.075 },
  },
  {
    id: "claude-3-sonnet",
    provider: "anthropic" as AIProvider,
    name: "claude-3-sonnet-20240229",
    displayName: "Claude 3 Sonnet",
    contextWindow: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  // Groq
  {
    id: "llama-3.1-70b",
    provider: "groq" as AIProvider,
    name: "llama-3.1-70b-versatile",
    displayName: "Llama 3.1 70B",
    contextWindow: 8192,
    costPer1kTokens: { input: 0.00059, output: 0.00079 },
  },
  {
    id: "mixtral-8x7b",
    provider: "groq" as AIProvider,
    name: "mixtral-8x7b-32768",
    displayName: "Mixtral 8x7B",
    contextWindow: 32768,
    costPer1kTokens: { input: 0.00024, output: 0.00024 },
  },
];

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS = {
  theme: "system" as const,
  streamingEnabled: true,
  showTokenUsage: true,
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  API_KEYS: "aegis_api_keys",
  AGENTS: "aegis_agents",
  COUNCILS: "aegis_councils",
  CONVERSATIONS: "aegis_conversations",
  SETTINGS: "aegis_settings",
  ENCRYPTION_KEY: "aegis_encryption_key",
} as const;

/**
 * API request timeout (ms)
 */
export const API_TIMEOUT = 60000; // 60 seconds

/**
 * Maximum retries for failed API requests
 */
export const MAX_RETRIES = 3;

/**
 * Debounce delay for autosave (ms)
 */
export const AUTOSAVE_DELAY = 1000;
