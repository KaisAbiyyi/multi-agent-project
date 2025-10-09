/**
 * Core type definitions for Aegis platform
 * These types define the data models used throughout the application
 */

/**
 * Supported AI Provider types
 */
export type AIProvider = "openai" | "openrouter" | "groq" | "ollama" | "anthropic";

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
  persona: string; // System prompt/instructions
  modelId: string; // Reference to AIModel
  apiKeyId: string; // Reference to APIKey
  temperature?: number;
  maxTokens?: number;
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
 * Message in a conversation
 */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string; // If from a specific agent
  timestamp: string;
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
  councilId: string; // Reference to Council
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
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
}

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  API_KEYS: "aegis_api_keys",
  AGENTS: "aegis_agents",
  COUNCILS: "aegis_councils",
  CONVERSATIONS: "aegis_conversations",
  SETTINGS: "aegis_settings",
  ENCRYPTION_KEY: "aegis_encryption_key",
} as const;
