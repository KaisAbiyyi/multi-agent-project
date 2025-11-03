/**
 * Chat Service
 * 
 * Manages conversations and integrates with multi-agent orchestration
 * Handles message history, agent selection, and conversation state
 */

import type { Message } from '@/types';
import type { OrchestrationResult } from '@/types/orchestration';
import { orchestrateAgents } from '../orchestration/multi-agent-orchestrator';
import { db } from '@/lib/db';

export interface SendMessageRequest {
  conversationId?: string;
  userMessage: string;
  agentIds: string[];
  enableRefinement?: boolean;
  projectId?: string;
}

export interface SendMessageResult {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  orchestrationResult: OrchestrationResult;
}

/**
 * Send a message and get response from agents
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<SendMessageResult> {
  console.log('[Chat Service] Sending message:', request);
  const startTime = Date.now();

  // Create user message
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: request.userMessage,
    timestamp: new Date().toISOString(),
  };

  try {
    // Get orchestration result
    console.log('[Chat Service] Orchestrating agents...');
    const orchestrationResult = await orchestrateAgents({
      userPrompt: request.userMessage,
      agentIds: request.agentIds,
      enableRefinement: request.enableRefinement,
    });

    // Create assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: orchestrationResult.finalResponse,
      timestamp: new Date().toISOString(),
    };

    // Save or update conversation
    const conversationId = request.conversationId || crypto.randomUUID();
    
    if (request.conversationId) {
      // Update existing conversation
      await appendMessagesToConversation(
        request.conversationId,
        [userMessage, assistantMessage]
      );
    } else {
      // Create new conversation
      await createConversation({
        id: conversationId,
        title: generateConversationTitle(request.userMessage),
        agentIds: request.agentIds,
        messages: [userMessage, assistantMessage],
        projectId: request.projectId,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[Chat Service] Message processed in ${duration}ms`);

    return {
      conversationId,
      userMessage,
      assistantMessage,
      orchestrationResult,
    };
  } catch (error) {
    console.error('[Chat Service] Error sending message:', error);
    throw error;
  }
}

/**
 * Create a new conversation
 */
async function createConversation(data: {
  id: string;
  title: string;
  agentIds: string[];
  messages: Message[];
  projectId?: string;
}): Promise<void> {
  console.log('[Chat Service] Creating new conversation:', data.id);
  
  // Store in conversations table
  await db.conversations.add({
    id: data.id,
    title: data.title,
    councilId: '', // Legacy field, keep empty for now
    messages: [],  // We'll store messages separately
    agentIds: data.agentIds,
    projectId: data.projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Store messages
  for (const message of data.messages) {
    await db.messages.add({
      ...message,
      conversationId: data.id,
    });
  }

  console.log('[Chat Service] Conversation created with', data.messages.length, 'messages');
}

/**
 * Append messages to existing conversation
 */
async function appendMessagesToConversation(
  conversationId: string,
  messages: Message[]
): Promise<void> {
  console.log('[Chat Service] Appending', messages.length, 'messages to conversation', conversationId);

  // Store messages
  for (const message of messages) {
    await db.messages.add({
      ...message,
      conversationId,
    });
  }

  // Update conversation timestamp
  await db.conversations.update(conversationId, {
    updatedAt: new Date().toISOString(),
  });

  console.log('[Chat Service] Messages appended successfully');
}

/**
 * Get conversation history
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  console.log('[Chat Service] Getting messages for conversation:', conversationId);
  
  const messages = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .toArray();

  // Sort by timestamp
  messages.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  console.log('[Chat Service] Found', messages.length, 'messages');
  return messages;
}

/**
 * Get all conversations
 */
export async function getAllConversations() {
  console.log('[Chat Service] Getting all conversations');
  
  const conversations = await db.conversations
    .orderBy('updatedAt')
    .reverse()
    .toArray();

  console.log('[Chat Service] Found', conversations.length, 'conversations');
  return conversations;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  console.log('[Chat Service] Deleting conversation:', conversationId);
  
  // Delete all messages in this conversation
  await db.messages
    .where('conversationId')
    .equals(conversationId)
    .delete();

  // Delete conversation
  await db.conversations.delete(conversationId);

  console.log('[Chat Service] Conversation deleted');
}

/**
 * Generate conversation title from first message
 */
function generateConversationTitle(firstMessage: string): string {
  // Take first 50 characters
  const truncated = firstMessage.slice(0, 50);
  return truncated.length < firstMessage.length 
    ? `${truncated}...` 
    : truncated;
}
