import { db } from '@/lib/db';
import type { Agent } from '@/types';

/**
 * Get all agents from IndexedDB
 */
export async function getAgents(): Promise<Agent[]> {
  return await db.agents.orderBy('createdAt').reverse().toArray();
}

/**
 * Get a single agent by ID
 */
export async function getAgentById(id: string): Promise<Agent | undefined> {
  return await db.agents.get(id);
}

/**
 * Create a new agent
 */
export async function createAgent(
  data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Agent> {
  const now = new Date().toISOString();
  const newAgent: Agent = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  await db.agents.add(newAgent);
  return newAgent;
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  id: string,
  updates: Partial<Omit<Agent, 'id' | 'createdAt'>>
): Promise<Agent | undefined> {
  const existing = await db.agents.get(id);
  if (!existing) {
    throw new Error('Agent not found');
  }

  const updated: Agent = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await db.agents.update(id, updated);
  return updated;
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string): Promise<void> {
  await db.agents.delete(id);
}

/**
 * Duplicate an agent
 */
export async function duplicateAgent(id: string): Promise<Agent> {
  const agent = await db.agents.get(id);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const now = new Date().toISOString();
  const duplicate: Agent = {
    ...agent,
    id: crypto.randomUUID(),
    name: `${agent.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };

  await db.agents.add(duplicate);
  return duplicate;
}

/**
 * Export agents to JSON
 */
export async function exportAgents(agentIds?: string[]): Promise<string> {
  let agents: Agent[];
  
  if (agentIds && agentIds.length > 0) {
    agents = await Promise.all(
      agentIds.map(id => db.agents.get(id))
    ).then(results => results.filter((a): a is Agent => a !== undefined));
  } else {
    agents = await db.agents.toArray();
  }

  return JSON.stringify(agents, null, 2);
}

/**
 * Import agents from JSON
 */
export async function importAgents(jsonData: string): Promise<Agent[]> {
  try {
    const data = JSON.parse(jsonData);
    const agents = Array.isArray(data) ? data : [data];
    
    const imported: Agent[] = [];
    const now = new Date().toISOString();

    for (const agentData of agents) {
      const newAgent: Agent = {
        ...agentData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      
      await db.agents.add(newAgent);
      imported.push(newAgent);
    }

    return imported;
  } catch {
    throw new Error('Invalid JSON data');
  }
}

/**
 * Search agents by name, description, or persona
 */
export async function searchAgents(query: string): Promise<Agent[]> {
  const lowerQuery = query.toLowerCase();
  const allAgents = await db.agents.toArray();
  
  return allAgents.filter((agent: Agent) => 
    agent.name.toLowerCase().includes(lowerQuery) ||
    agent.description?.toLowerCase().includes(lowerQuery) ||
    agent.persona.toLowerCase().includes(lowerQuery)
  );
}
