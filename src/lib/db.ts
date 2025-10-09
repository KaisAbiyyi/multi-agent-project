import Dexie, { type EntityTable } from 'dexie';
import type { Agent, APIKey, Council, Conversation, Message, ProviderPreference } from '@/types';

// Define the database schema
class AegisDatabase extends Dexie {
  agents!: EntityTable<Agent, 'id'>;
  apiKeys!: EntityTable<APIKey, 'id'>;
  councils!: EntityTable<Council, 'id'>;
  conversations!: EntityTable<Conversation, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  providerPreferences!: EntityTable<ProviderPreference, 'id'>;

  constructor() {
    super('AegisDB');
    
    this.version(1).stores({
      agents: 'id, name, createdAt, updatedAt, modelId',
      apiKeys: 'id, provider, name, isActive, createdAt',
      councils: 'id, name, createdAt, updatedAt',
      conversations: 'id, councilId, createdAt, updatedAt',
      messages: 'id, conversationId, role, createdAt',
      providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
    });
  }
}

export const db = new AegisDatabase();
