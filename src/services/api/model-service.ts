import type { AIProvider, AIModel } from '@/types';

/**
 * Fetch available models from Ollama local instance
 */
export async function fetchOllamaModels(): Promise<AIModel[]> {
  try {
    console.log('[Ollama Models] Fetching models from http://localhost:11434/api/tags...');
    
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      console.error('[Ollama Models] API response not OK:', response.status, response.statusText);
      throw new Error('Failed to fetch Ollama models');
    }

    const data = await response.json();
    const models = data.models || [];
    console.log('[Ollama Models] Found models:', models.length);

    return models.map((model: { name: string; details?: { parameter_size?: number } }) => ({
      id: model.name,
      provider: 'ollama' as AIProvider,
      name: model.name,
      displayName: model.name,
      contextWindow: model.details?.parameter_size || 4096,
    }));
  } catch (error) {
    console.error('[Ollama Models] Error fetching models:', error);
    console.log('[Ollama Models] Make sure Ollama is running at http://localhost:11434');
    // Return empty array if Ollama is not running
    return [];
  }
}

/**
 * Fetch available models from LLM7 API
 */
export async function fetchLLM7Models(apiKey?: string): Promise<AIModel[]> {
  try {
    console.log('[LLM7 Models] Fetching models from https://api.llm7.io/v1/models...');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      console.log('[LLM7 Models] Using API key for authentication');
    } else {
      console.log('[LLM7 Models] Fetching without API key (public access)');
    }

    const response = await fetch('https://api.llm7.io/v1/models', {
      headers,
    });

    if (!response.ok) {
      console.error('[LLM7 Models] API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch LLM7 models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[LLM7 Models] Raw API response:', data);
    
    // LLM7 API returns array directly, not wrapped in { data: [...] }
    const models = Array.isArray(data) ? data : [];
    console.log('[LLM7 Models] Parsed models count:', models.length);

    const mappedModels = models.map((model: { 
      id: string; 
      object?: string;
      created?: number;
      owned_by?: string;
      modalities?: { input?: string[] };
    }) => ({
      id: model.id,
      provider: 'llm7' as AIProvider,
      name: model.id,
      displayName: model.id,
      contextWindow: 4096, // Default context window
    }));
    
    console.log('[LLM7 Models] Mapped models:', mappedModels);
    return mappedModels;
  } catch (error) {
    console.error('[LLM7 Models] Error fetching models:', error);
    return [];
  }
}

/**
 * Fetch available models from OpenRouter
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<AIModel[]> {
  try {
    console.log('[OpenRouter Models] Fetching models from https://openrouter.ai/api/v1/models...');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      console.log('[OpenRouter Models] Using API key for authentication');
    } else {
      console.log('[OpenRouter Models] WARNING: OpenRouter requires API key for full access');
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
    });

    if (!response.ok) {
      console.error('[OpenRouter Models] API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];
    console.log('[OpenRouter Models] Found models:', models.length);

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
    console.error('[OpenRouter Models] Error fetching models:', error);
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
