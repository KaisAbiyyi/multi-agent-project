import { NextRequest } from 'next/server';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatRequestPayload = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
};

/**
 * Proxy endpoint for OpenRouter API to handle CORS and server-side requests
 */
export async function POST(request: NextRequest) {
  try {
    const payload: ChatRequestPayload = await request.json();

    console.log('[OpenRouter API] Processing request for model:', payload.model);

    // Get API key from headers (required for OpenRouter)
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) {
      console.error('[OpenRouter API] No API key provided');
      return new Response(
        JSON.stringify({ 
          error: 'API key is required for OpenRouter',
          details: 'Please add your OpenRouter API key in Settings'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Aegis',
    };

    const endpoint = `${OPENROUTER_BASE_URL}/chat/completions`;

    console.log('[OpenRouter API] Forwarding request to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        stream: payload.stream ?? true,
        ...(payload.temperature && { temperature: payload.temperature }),
        ...(payload.max_tokens && { max_tokens: payload.max_tokens }),
      }),
    });

    console.log('[OpenRouter API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter API] Error response:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `OpenRouter API error (${response.status}): ${errorText}`,
          status: response.status 
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle streaming response
    if (payload.stream) {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed !== 'data: [DONE]') {
                  controller.enqueue(encoder.encode(trimmed + '\n'));
                }
              }
            }
          } catch (error) {
            console.error('[OpenRouter API] Stream error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OpenRouter API] Request failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to communicate with OpenRouter API'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
