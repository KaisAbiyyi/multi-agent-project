import type { AIProvider, AIModel } from '@/types';

/**
 * Fetch available models from Ollama local instance
 */
export async function fetchOllamaModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Failed to fetch Ollama models');
    }

    const data = await response.json();
    const models = data.models || [];

    return models.map((model: { name: string; details?: { parameter_size?: number } }) => ({
      id: model.name,
      provider: 'ollama' as AIProvider,
      name: model.name,
      displayName: model.name,
      contextWindow: model.details?.parameter_size || 4096,
    }));
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    // Return empty array if Ollama is not running
    return [];
  }
}

/**
 * Fetch available models from LLM7 API
 */
export async function fetchLLM7Models(apiKey?: string): Promise<AIModel[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://api.llm7.io/v1/models', {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LLM7 models');
    }

    const data = await response.json();
    const models = data.data || [];

    return models.map((model: { id: string; context_length?: number }) => ({
      id: model.id,
      provider: 'llm7' as AIProvider,
      name: model.id,
      displayName: model.id,
      contextWindow: model.context_length || 4096,
    }));
  } catch (error) {
    console.error('Error fetching LLM7 models:', error);
    return [];
  }
}

/**
 * Fetch available models from OpenRouter
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<AIModel[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenRouter models');
    }

    const data = await response.json();
    const models = data.data || [];

    return models.map((model: { 
      id: string; 
      name?: string; 
      context_length?: number;
      pricing?: { prompt: string; completion: string };
    }) => ({
      id: model.id,
      provider: 'openrouter' as AIProvider,
      name: model.id,
      displayName: model.name || model.id,
      contextWindow: model.context_length || 4096,
      costPer1kTokens: model.pricing ? {
        input: parseFloat(model.pricing.prompt) * 1000,
        output: parseFloat(model.pricing.completion) * 1000,
      } : undefined,
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

/**
 * Fetch models based on provider
 */
export async function fetchModelsByProvider(
  provider: AIProvider,
  apiKey?: string
): Promise<AIModel[]> {
  switch (provider) {
    case 'ollama':
      return fetchOllamaModels();
    case 'llm7':
      return fetchLLM7Models(apiKey);
    case 'openrouter':
      return fetchOpenRouterModels(apiKey);
    default:
      return [];
  }
}
