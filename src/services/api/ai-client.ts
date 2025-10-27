/**
 * AI API Client Service
 * 
 * Handles communication with AI providers (Ollama, OpenRouter, LLM7)
 * Supports different API formats and authentication methods
 */

import type { Agent, AIProvider } from '@/types';
import { AI_PROVIDERS, API_TIMEOUT } from '@/constants';

export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  history?: ConversationHistoryEntry[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: AIProvider;
}

export type StreamCallback = (chunk: string, done: boolean) => void;

export interface ConversationHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

function buildConversationMessages(request: CompletionRequest): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];

  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }

  if (Array.isArray(request.history)) {
    for (const entry of request.history) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }

  messages.push({ role: 'user', content: request.prompt });
  return messages;
}

/**
 * Call AI model with streaming support
 */
export async function callAIModelStreaming(
  agent: Agent,
  request: CompletionRequest,
  onChunk: StreamCallback,
  apiKey?: string,
  abortController?: AbortController
): Promise<void> {
  console.log(`[AI Client] Streaming from ${agent.modelId} (${agent.provider}) for agent ${agent.name}`);

  // Use agent's provider field directly instead of inferring from model ID
  const provider = agent.provider;
  const providerConfig = AI_PROVIDERS[provider];

  const controller = abortController || new AbortController();
  
  // Use inactivity timeout instead of absolute timeout
  // This allows long responses as long as data keeps coming
  let inactivityTimeoutId: NodeJS.Timeout | null = null;
  const INACTIVITY_TIMEOUT = 30000; // 30 seconds of no data = timeout
  
  const resetInactivityTimeout = () => {
    if (inactivityTimeoutId) {
      clearTimeout(inactivityTimeoutId);
    }
    inactivityTimeoutId = setTimeout(() => {
      console.warn('[AI Client] Inactivity timeout - no data received for 30s');
      controller.abort();
    }, INACTIVITY_TIMEOUT);
  };
  
  // Start the inactivity timer
  resetInactivityTimeout();

  const isOllama = provider === 'ollama';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(apiKey && !isOllama && { Authorization: `Bearer ${apiKey}` }),
  };

  // Note: Provider-specific headers are now handled by proxy endpoints
  // OpenRouter headers are set in /api/openrouter/chat route
  // LLM7 headers are set in /api/llm7/chat route

  const conversationMessages = buildConversationMessages(request);

  // Use proxy endpoints for all providers to avoid CORS issues
  const endpoint = provider === 'ollama' 
    ? '/api/ollama/chat'
    : provider === 'llm7'
    ? '/api/llm7/chat'
    : provider === 'openrouter'
    ? '/api/openrouter/chat'
    : `${providerConfig.baseURL}/chat/completions`; // fallback for unknown providers

  const body = isOllama
    ? JSON.stringify({
        model: agent.modelId,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        history: request.history,
        messages: conversationMessages,
        stream: true,
      })
    : JSON.stringify({
        model: agent.modelId,
        messages: conversationMessages,
        stream: true,
      });

  try {
    console.log(`[AI Client] Fetching from endpoint: ${endpoint}`);
    console.log(`[AI Client] Provider: ${provider}, Model: ${agent.modelId}`);
    console.log(`[AI Client] Headers:`, { ...headers, Authorization: headers.Authorization ? '***' : undefined });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body,
    });

    console.log(`[AI Client] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Client] API error response:`, errorText);
      
      // Provide more user-friendly error messages
      let userMessage = `AI API error (${response.status}): ${errorText}`;
      
      if (errorText.includes('llama runner process has terminated')) {
        userMessage = `Model failed to load. This usually means:\n• The model ran out of memory\n• The model file is corrupted\n• Ollama needs to be restarted\n\nTry:\n1. Restart Ollama\n2. Use a smaller model\n3. Free up system memory`;
      } else if (errorText.includes('model not found')) {
        userMessage = `Model not found. Please pull the model first using:\nollama pull ${agent.modelId}`;
      } else if (errorText.includes('connection refused') || errorText.includes('ECONNREFUSED')) {
        userMessage = `Cannot connect to ${provider === 'ollama' ? 'Ollama' : 'AI provider'}. Make sure the service is running.`;
      }
      
      throw new Error(userMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onChunk('', true);
        break;
      }

      // Reset inactivity timeout since we received data
      resetInactivityTimeout();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const jsonStr = trimmed.slice(6);
            const data = JSON.parse(jsonStr);
            if (data?.error) {
              throw new Error(
                typeof data.error === 'string'
                  ? data.error
                  : data.error.message || 'AI provider returned an error'
              );
            }

            if (provider === 'ollama') {
              const content = data.message?.content || '';
              if (content) {
                onChunk(content, false);
                // Reset timeout on each content chunk
                resetInactivityTimeout();
              }
              if (data.done) {
                onChunk('', true);
                return;
              }
            } else {
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                onChunk(content, false);
                // Reset timeout on each content chunk
                resetInactivityTimeout();
              }

              const finishReason = data.choices?.[0]?.finish_reason;
              if (finishReason) {
                onChunk('', true);
                return;
              }
            }
          } catch (e) {
            console.warn('[AI Client] Failed to parse SSE data:', trimmed, e);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[AI Client] Streaming error for ${agent.name}:`, error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: No response from ${provider} after 30 seconds`);
      } else if (error.message === 'Failed to fetch') {
        // Network error - could be CORS, network down, or invalid endpoint
        if (provider === 'llm7') {
          throw new Error(
            `Network error connecting to LLM7 (${providerConfig.baseURL}). ` +
            `Please check: 1) Your internet connection, 2) LLM7 service is available, ` +
            `3) API key is valid (if required). Original error: ${error.message}`
          );
        } else if (provider === 'openrouter') {
          throw new Error(
            `Network error connecting to OpenRouter. ` +
            `Please check: 1) Your internet connection, 2) API key is valid, ` +
            `3) OpenRouter service is available. Original error: ${error.message}`
          );
        } else {
          throw new Error(
            `Network error connecting to ${provider}. ` +
            `Please check your connection and try again. Original error: ${error.message}`
          );
        }
      }
    }
    
    throw error;
  } finally {
    // Clean up inactivity timeout
    if (inactivityTimeoutId) {
      clearTimeout(inactivityTimeoutId);
    }
  }
}

/**
 * Call AI model with given prompt and agent configuration
 */
export async function callAIModel(
  agent: Agent,
  request: CompletionRequest,
  apiKey?: string
): Promise<CompletionResponse> {
  console.log(`[AI Client] Calling ${agent.modelId} (${agent.provider}) for agent ${agent.name}`);

  // Use agent's provider field directly instead of inferring from model ID
  const provider = agent.provider;
  const providerConfig = AI_PROVIDERS[provider];

  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  const isOllama = provider === 'ollama';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(apiKey && !isOllama && { Authorization: `Bearer ${apiKey}` }),
  };

  // Provider-specific headers are now handled by proxy endpoints

  const conversationMessages = buildConversationMessages(request);

  // Use proxy endpoints for all providers to avoid CORS issues
  const endpoint = provider === 'ollama' 
    ? '/api/ollama/chat'
    : provider === 'llm7'
    ? '/api/llm7/chat'
    : provider === 'openrouter'
    ? '/api/openrouter/chat'
    : `${providerConfig.baseURL}/chat/completions`; // fallback for unknown providers

  const body = isOllama
    ? JSON.stringify({
        model: agent.modelId,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        history: request.history,
        messages: conversationMessages,
        stream: false,
      })
    : JSON.stringify({
        model: agent.modelId,
        messages: conversationMessages,
      });

  try {
    let content: string;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Client] API error for ${agent.name}:`, response.status, errorText);
      throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (isOllama) {
      content = data.content || '';
    } else {
      content = data.choices?.[0]?.message?.content || '';
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Client] Response from ${agent.name} received in ${duration}ms`);

    return {
      content,
      model: agent.modelId,
      provider,
    };
  } catch (error) {
    console.error(`[AI Client] Error calling ${agent.name}:`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get provider from model ID (DEPRECATED)
 * 
 * @deprecated This function is no longer used. The provider is now stored
 * directly in the agent.provider field. Kept for backward compatibility.
 * 
 * Model IDs are prefixed or have unique patterns
 */
export function getProviderFromModelId(modelId: string): AIProvider {
  // Ollama models are typically simple names like "llama2", "mistral", etc.
  // OpenRouter models often have "/" like "openai/gpt-4"
  // LLM7 models are from our known list
  
  // This is a simple heuristic - you might want to make this more robust
  if (modelId.includes('/')) {
    return 'openrouter';
  }
  
  // Check if it's a known LLM7 model
  const llm7Models = [
    'deepseek-v3.1', 
    'deepseek-reasoning', 
    'gemini-2.5-flash-lite', 
    'gemini-search',
    'gpt-5-mini', 
    'gpt-5-nano',
    'gpt-5-chat', // Legacy model name
    'mistral-small',
    'mistral-naughty',
    'bidara'
  ];
  if (llm7Models.some(m => modelId.includes(m))) {
    return 'llm7';
  }
  
  // Default to ollama for simple names
  return 'ollama';
}
