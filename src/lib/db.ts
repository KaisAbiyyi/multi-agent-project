import Dexie, { type EntityTable } from 'dexie';
import type { Agent, APIKey, Council, Conversation, Message, ProviderPreference, AgentCombination, AIProvider } from '@/types';

// Define the database schema
class AegisDatabase extends Dexie {
  agents!: EntityTable<Agent, 'id'>;
  apiKeys!: EntityTable<APIKey, 'id'>;
  councils!: EntityTable<Council, 'id'>;
  agentCombinations!: EntityTable<AgentCombination, 'id'>;
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
      messages: 'id, conversationId, role, timestamp',
      providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
    });

    this.version(2)
      .stores({
        agents: 'id, name, createdAt, updatedAt, modelId',
        apiKeys: 'id, provider, name, isActive, createdAt',
        councils: 'id, name, createdAt, updatedAt',
        agentCombinations: 'id, name, createdAt, updatedAt',
        conversations: 'id, councilId, createdAt, updatedAt, isPinned',
        messages: 'id, conversationId, role, timestamp',
        providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
      })
      .upgrade((transaction) => {
        return transaction
          .table('conversations')
          .toCollection()
          .modify((conversation) => {
            if (typeof conversation.isPinned === 'undefined') {
              conversation.isPinned = false;
            }
          });
      });

    // Version 3: Add provider field to agents
    this.version(3)
      .stores({
        agents: 'id, name, createdAt, updatedAt, modelId, provider',
        apiKeys: 'id, provider, name, isActive, createdAt',
        councils: 'id, name, createdAt, updatedAt',
        agentCombinations: 'id, name, createdAt, updatedAt',
        conversations: 'id, councilId, createdAt, updatedAt, isPinned',
        messages: 'id, conversationId, role, timestamp',
        providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        // Migrate existing agents to have a provider field
        // Default to ollama for existing agents
        return transaction
          .table('agents')
          .toCollection()
          .modify((agent) => {
            if (!agent.provider) {
              // Try to infer provider from modelId
              if (agent.modelId) {
                if (agent.modelId.includes('ollama') || agent.modelId.startsWith('llama') || agent.modelId.startsWith('mistral')) {
                  agent.provider = 'ollama';
                } else if (agent.modelId.includes('openrouter')) {
                  agent.provider = 'openrouter';
                } else if (agent.modelId.includes('llm7')) {
                  agent.provider = 'llm7';
                } else {
                  // Default to ollama
                  agent.provider = 'ollama';
                }
              } else {
                agent.provider = 'ollama';
              }
            }
          });
      });

    // Version 4: Add isAggregator field and create default aggregator
    this.version(4)
      .stores({
        agents: 'id, name, createdAt, updatedAt, modelId, provider, isAggregator',
        apiKeys: 'id, provider, name, isActive, createdAt',
        councils: 'id, name, createdAt, updatedAt',
        agentCombinations: 'id, name, createdAt, updatedAt',
        conversations: 'id, councilId, createdAt, updatedAt, isPinned',
        messages: 'id, conversationId, role, timestamp',
        providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        const agentsTable = transaction.table('agents');
        
        // Check if aggregator already exists
        const existingAggregator = await agentsTable
          .filter(agent => agent.isAggregator === true)
          .first();

        if (!existingAggregator) {
          // Create default aggregator agent
          const now = new Date().toISOString();
          const aggregatorAgent: Agent = {
            id: 'aggregator-default',
            name: 'Aggregator',
            description: 'Default aggregator for synthesizing multi-agent responses',
            persona: 'You are Aggregator, a neutral synthesis expert. Your role is to combine multiple agent responses into a single, coherent answer. Resolve disagreements by weighing evidence, synthesize the strongest points from each perspective, and deliver a clear, comprehensive response directly to the user. Never mention the underlying debate or reference individual agents - speak naturally as if you are providing your own expert answer.',
            provider: 'ollama', // Default provider
            modelId: 'llama3.2', // Default model
            apiKeyId: undefined,
            isAggregator: true,
            createdAt: now,
            updatedAt: now,
          };

          await agentsTable.add(aggregatorAgent);
          console.log('[DB Migration v4] Created default aggregator agent');
        } else {
          // Ensure existing aggregator has the correct persona
          await agentsTable.update(existingAggregator.id, {
            isAggregator: true,
            persona: 'You are Aggregator, a neutral synthesis expert. Your role is to combine multiple agent responses into a single, coherent answer. Resolve disagreements by weighing evidence, synthesize the strongest points from each perspective, and deliver a clear, comprehensive response directly to the user. Never mention the underlying debate or reference individual agents - speak naturally as if you are providing your own expert answer.',
          });
          console.log('[DB Migration v4] Updated existing aggregator agent');
        }
      });
  }
}

export const db = new AegisDatabase();

/**
 * Get the aggregator agent
 */
export async function getAggregatorAgent(): Promise<Agent | undefined> {
  return await db.agents.filter(agent => agent.isAggregator === true).first();
}

/**
 * Update aggregator agent's provider and model
 */
export async function updateAggregatorAgent(provider: AIProvider, modelId: string, apiKeyId?: string): Promise<void> {
  const aggregator = await getAggregatorAgent();
  
  if (!aggregator) {
    throw new Error('Aggregator agent not found');
  }

  await db.agents.update(aggregator.id, {
    provider,
    modelId,
    apiKeyId,
    updatedAt: new Date().toISOString(),
  });
}

