'use server';

import { NextRequest } from 'next/server';
import { Ollama } from 'ollama';

const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL ?? 'llama3';
const DEFAULT_CONTEXT_WINDOW = Number.parseInt(process.env.OLLAMA_CONTEXT_WINDOW ?? '32768', 10);

const textEncoder = new TextEncoder();

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatHistoryMessage = {
  role?: ChatRole;
  content?: string;
};

type ChatRequestPayload = {
  model?: string;
  prompt?: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
  history?: ChatHistoryMessage[];
  stream?: boolean;
};

function buildMessages(payload: ChatRequestPayload): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    return payload.messages;
  }

  if (Array.isArray(payload.history)) {
    for (const item of payload.history) {
      if (!item?.content) continue;
      const role: ChatRole = item.role === 'assistant' || item.role === 'system' ? item.role : 'user';
      messages.push({ role, content: item.content });
    }
  }

  if (payload.systemPrompt?.trim()) {
    messages.unshift({ role: 'system', content: payload.systemPrompt.trim() });
  }

  if (payload.prompt?.trim()) {
    messages.push({ role: 'user', content: payload.prompt.trim() });
  }

  return messages;
}

export async function POST(request: NextRequest) {
  let payload: ChatRequestPayload;

  try {
    payload = await request.json();
  } catch (error) {
    console.error('[Ollama API] Invalid JSON payload', error);
    return new Response('Invalid JSON payload.', { status: 400 });
  }

  const prompt = payload.prompt?.trim();
  const hasMessages = Array.isArray(payload.messages) && payload.messages.length > 0;

  if (!prompt && !hasMessages) {
    return new Response('Prompt or messages are required.', { status: 400 });
  }

  const model = typeof payload.model === 'string' && payload.model.trim().length > 0
    ? payload.model.trim()
    : DEFAULT_MODEL;

  const messages = buildMessages(payload);

  if (messages.length === 0) {
    return new Response('No messages to send to Ollama.', { status: 400 });
  }

  const client = new Ollama({ host: DEFAULT_OLLAMA_HOST });
  const streamMode = payload.stream !== false;

  try {
    if (!streamMode) {
      const response = await client.chat({
        model,
        messages,
        stream: false,
        options: {
          num_ctx: DEFAULT_CONTEXT_WINDOW,
        },
      });

      const content = response?.message?.content ?? '';

      return Response.json({
        content,
        model,
      });
    }

    const iterator = await client.chat({
      model,
      messages,
      stream: true,
      options: {
        num_ctx: DEFAULT_CONTEXT_WINDOW,
      },
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const abortHandler = () => {
          try {
            client.abort();
          } catch (error) {
            console.warn('[Ollama API] Failed to abort stream', error);
          }
          controller.error(new DOMException('Operation aborted', 'AbortError'));
        };

        if (request.signal.aborted) {
          abortHandler();
          return;
        }

        request.signal.addEventListener('abort', abortHandler, { once: true });

        try {
          for await (const part of iterator) {
            const content = part?.message?.content ?? '';
            const chunk = {
              message: { content },
              done: Boolean(part?.done),
            };

            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

            if (part?.done) {
              controller.enqueue(textEncoder.encode('data: {"done":true}\n\n'));
              controller.enqueue(textEncoder.encode('data: [DONE]\n\n'));
              break;
            }
          }
        } catch (error) {
          console.error('[Ollama API] Streaming error', error);
          controller.error(error);
          return;
        } finally {
          request.signal.removeEventListener('abort', abortHandler);
        }

        controller.close();
      },
      cancel(reason) {
        console.warn('[Ollama API] Stream cancelled', reason);
        try {
          client.abort();
        } catch (error) {
          console.warn('[Ollama API] Failed to abort after cancel', error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Ollama API] Request failed', error);
    const message = error instanceof Error ? error.message : 'Unexpected Ollama error.';
    return new Response(message, { status: 500 });
  }
}
