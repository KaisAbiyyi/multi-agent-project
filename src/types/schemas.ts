/**
 * Zod validation schemas for Aegis data models
 * Used for form validation and data integrity
 */

import { z } from "zod";

/**
 * AI Provider schema
 */
export const AIProviderSchema = z.enum(["ollama", "openrouter", "llm7"]);

/**
 * API Key validation schema
 */
export const APIKeySchema = z.object({
  id: z.string().uuid(),
  provider: AIProviderSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  key: z.string().min(1, "API key is required"),
  baseURL: z.string().url("Invalid URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  lastUsed: z.string().datetime().optional(),
});

/**
 * Create API Key form schema (without auto-generated fields)
 */
export const CreateAPIKeySchema = APIKeySchema.omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

/**
 * AI Model validation schema
 */
export const AIModelSchema = z.object({
  id: z.string().min(1),
  provider: AIProviderSchema,
  name: z.string().min(1, "Model name is required"),
  displayName: z.string().min(1, "Display name is required"),
  contextWindow: z.number().int().positive(),
  costPer1kTokens: z
    .object({
      input: z.number().nonnegative(),
      output: z.number().nonnegative(),
    })
    .optional(),
});

/**
 * Agent validation schema
 */
export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Agent name is required")
    .max(100, "Name is too long")
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      "Name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  description: z.string().max(500, "Description is too long").optional(),
  persona: z
    .string()
    .max(5000, "Persona is too long")
    .optional()
    .or(z.literal("")), // Persona is now optional - can be empty string or undefined
  provider: AIProviderSchema, // Each agent has its own provider
  modelId: z.string().min(1, "Model is required"),
  apiKeyId: z.string().optional(), // API key is optional (e.g., Ollama doesn't need it, LLM7 is optional)
  isAggregator: z.boolean().optional(), // Special aggregator agent flag
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Create Agent form schema (without auto-generated fields)
 */
export const CreateAgentSchema = AgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Update Agent form schema (all fields optional except ID)
 */
export const UpdateAgentSchema = AgentSchema.partial().required({ id: true });

/**
 * Council validation schema
 */
export const CouncilSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Council name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  agentIds: z
    .array(z.string().uuid())
    .min(1, "At least one agent is required")
    .max(10, "Maximum 10 agents per council"),
  synthesisPrompt: z.string().max(2000, "Synthesis prompt is too long").optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Create Council form schema
 */
export const CreateCouncilSchema = CouncilSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Message validation schema
 */
export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required"),
  agentId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
});

/**
 * Conversation validation schema
 */
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  councilId: z.string().uuid(),
  messages: z.array(MessageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archived: z.boolean().optional().default(false),
});

/**
 * Application settings validation schema
 */
export const AppSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  streamingEnabled: z.boolean(),
  showTokenUsage: z.boolean(),
  defaultTemperature: z.number().min(0).max(2),
  defaultMaxTokens: z.number().int().positive().max(128000),
});

// Export types inferred from schemas
export type APIKeyInput = z.infer<typeof CreateAPIKeySchema>;
export type AgentInput = z.infer<typeof CreateAgentSchema>;
export type AgentUpdateInput = z.infer<typeof UpdateAgentSchema>;
export type CouncilInput = z.infer<typeof CreateCouncilSchema>;
export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;
