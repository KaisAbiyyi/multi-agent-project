/**
 * AI API Client Service
 * 
 * Handles communication with AI providers (Ollama, OpenRouter, LLM7)
 * Supports different API formats and authentication methods
 */

import type { Agent, AIProvider } from '@/types';
import { AI_PROVIDERS } from '@/constants';

export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: AIProvider;
}

/**
 * Call AI model with given prompt and agent configuration
 */
export async function callAIModel(
  agent: Agent,
  request: CompletionRequest,
  apiKey?: string
): Promise<CompletionResponse> {
  console.log(`[AI Client] Calling ${agent.modelId} for agent ${agent.name}`);
  
  const provider = getProviderFromModelId(agent.modelId);
  const providerConfig = AI_PROVIDERS[provider];
  
  const startTime = Date.now();
  
  try {
    // Build request based on provider
    const response = await fetch(`${providerConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        model: agent.modelId,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? agent.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? agent.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Client] API error for ${agent.name}:`, response.status, errorText);
      throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`[AI Client] Response from ${agent.name} received in ${duration}ms`);
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: agent.modelId,
      provider,
    };
  } catch (error) {
    console.error(`[AI Client] Error calling ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Get provider from model ID
 * Model IDs are prefixed or have unique patterns
 */
function getProviderFromModelId(modelId: string): AIProvider {
  // Ollama models are typically simple names like "llama2", "mistral", etc.
  // OpenRouter models often have "/" like "openai/gpt-4"
  // LLM7 models are from our known list
  
  // This is a simple heuristic - you might want to make this more robust
  if (modelId.includes('/')) {
    return 'openrouter';
  }
  
  // Check if it's a known LLM7 model
  const llm7Models = ['deepseek-v3.1', 'deepseek-reasoning', 'gemini-2.5-flash-lite', 'gpt-5-mini', 'bidara'];
  if (llm7Models.some(m => modelId.includes(m))) {
    return 'llm7';
  }
  
  // Default to ollama for simple names
  return 'ollama';
}
