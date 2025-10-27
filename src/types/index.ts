/**
 * Core type definitions for Aegis platform
 * These types define the data models used throughout the application
 */

/**
 * Supported AI Provider types
 */
export type AIProvider = "ollama" | "openrouter" | "llm7";

/**
 * API Key configuration
 */
export interface APIKey {
  id: string;
  provider: AIProvider;
  name: string; // User-friendly name for the key
  key: string; // Encrypted API key
  baseURL?: string; // For custom endpoints (e.g., Ollama)
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

/**
 * AI Model configuration
 */
export interface AIModel {
  id: string;
  provider: AIProvider;
  name: string; // Model name (e.g., "gpt-4", "claude-3-opus")
  displayName: string; // User-friendly display name
  contextWindow: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

/**
 * Agent configuration
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  persona?: string; // Optional system prompt/instructions
  provider: AIProvider; // Each agent can use different provider
  modelId: string; // Reference to AIModel
  apiKeyId?: string; // Reference to APIKey (optional - e.g., Ollama doesn't need it, LLM7 is optional)
  isAggregator?: boolean; // Special aggregator agent - cannot be deleted, persona is fixed
  createdAt: string;
  updatedAt: string;
}

/**
 * Council (collection of agents working together)
 */
export interface Council {
  id: string;
  name: string;
  description?: string;
  agentIds: string[]; // Array of agent IDs
  synthesisPrompt?: string; // Optional prompt for synthesizing agent responses
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent Combination - Saved set of agents for quick reuse
 */
export interface AgentCombination {
  id: string;
  name: string;
  description?: string;
  agentIds: string[]; // Array of agent IDs in this combination
  createdAt: string;
  updatedAt: string;
}

/**
 * Message in a conversation
 */
export type MessageStage = "initial" | "refined" | "final";

export interface Message {
  id: string;
  conversationId?: string; // Reference to conversation
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string; // If from a specific agent
  timestamp: string;
  stage?: MessageStage;
  stageLabel?: string;
  initialContent?: string;
  authorLabel?: string;
  isHidden?: boolean;
}

/**
 * Agent response during council execution
 */
export interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  latency?: number; // Response time in ms
  error?: string;
}

/**
 * Conversation/Chat session
 */
export interface Conversation {
  id: string;
  title: string;
  councilId?: string; // Optional reference to Council (for multi-agent)
  agentIds?: string[]; // Selected agents participating in the conversation
  messages?: Message[]; // Populated when loading conversation
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  isPinned?: boolean; // Pin conversation to top of list
}

/**
 * Application settings
 */
export interface AppSettings {
  theme: "light" | "dark" | "system";
  streamingEnabled: boolean;
  showTokenUsage: boolean;
  defaultTemperature: number;
  defaultMaxTokens: number;
  // Provider preferences
  activeProvider: AIProvider;
  providerConfigs: {
    ollama: {
      enabled: boolean;
    };
    openrouter: {
      enabled: boolean;
      apiKeyId?: string;
    };
    llm7: {
      enabled: boolean;
      useApiKey: boolean;
      apiKeyId?: string;
    };
  };
}

/**
 * Provider preference configuration
 */
export interface ProviderPreference {
  id: string;
  provider: AIProvider;
  isActive: boolean;
  apiKeyId?: string; // Optional for Ollama, required for OpenRouter, optional for LLM7
  createdAt: string;
  updatedAt: string;
}

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  API_KEYS: "aegis_api_keys",
  AGENTS: "aegis_agents",
  COUNCILS: "aegis_councils",
  AGENT_COMBINATIONS: "aegis_agent_combinations",
  CONVERSATIONS: "aegis_conversations",
  SETTINGS: "aegis_settings",
  ENCRYPTION_KEY: "aegis_encryption_key",
} as const;
