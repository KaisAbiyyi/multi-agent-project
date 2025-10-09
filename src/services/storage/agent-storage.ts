/**
 * Agent storage service
 * Handles CRUD operations for agents in localStorage
 */

import { Agent } from "@/types";
import { STORAGE_KEYS } from "@/constants";

/**
 * Get all agents from localStorage
 */
export function getAgents(): Agent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AGENTS);
    if (!stored) return [];
    return JSON.parse(stored) as Agent[];
  } catch (error) {
    console.error("Error loading agents:", error);
    return [];
  }
}

/**
 * Get a single agent by ID
 */
export function getAgentById(id: string): Agent | null {
  const agents = getAgents();
  return agents.find((agent) => agent.id === id) || null;
}

/**
 * Save agents to localStorage
 */
function saveAgents(agents: Agent[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  } catch (error) {
    console.error("Error saving agents:", error);
    throw new Error("Failed to save agents");
  }
}

/**
 * Create a new agent
 */
export function createAgent(agentData: Omit<Agent, "id" | "createdAt" | "updatedAt">): Agent {
  const agents = getAgents();

  const newAgent: Agent = {
    ...agentData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  agents.push(newAgent);
  saveAgents(agents);

  return newAgent;
}

/**
 * Update an existing agent
 */
export function updateAgent(id: string, updates: Partial<Omit<Agent, "id" | "createdAt">>): Agent {
  const agents = getAgents();
  const index = agents.findIndex((agent) => agent.id === id);

  if (index === -1) {
    throw new Error(`Agent with id ${id} not found`);
  }

  const updatedAgent: Agent = {
    ...agents[index]!,
    ...updates,
    id: agents[index]!.id, // Preserve the original ID
    createdAt: agents[index]!.createdAt, // Preserve creation date
    updatedAt: new Date().toISOString(),
  };

  agents[index] = updatedAgent;
  saveAgents(agents);

  return updatedAgent;
}

/**
 * Delete an agent
 */
export function deleteAgent(id: string): boolean {
  const agents = getAgents();
  const filteredAgents = agents.filter((agent) => agent.id !== id);

  if (filteredAgents.length === agents.length) {
    return false; // Agent not found
  }

  saveAgents(filteredAgents);
  return true;
}

/**
 * Duplicate an agent
 */
export function duplicateAgent(id: string): Agent {
  const agent = getAgentById(id);

  if (!agent) {
    throw new Error(`Agent with id ${id} not found`);
  }

  const duplicatedAgent = createAgent({
    name: `${agent.name} (Copy)`,
    description: agent.description,
    persona: agent.persona,
    modelId: agent.modelId,
    apiKeyId: agent.apiKeyId,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
  });

  return duplicatedAgent;
}

/**
 * Export agents to JSON
 */
export function exportAgents(agentIds?: string[]): string {
  const agents = getAgents();
  const toExport = agentIds ? agents.filter((agent) => agentIds.includes(agent.id)) : agents;

  return JSON.stringify(toExport, null, 2);
}

/**
 * Import agents from JSON
 */
export function importAgents(jsonData: string): Agent[] {
  try {
    const importedAgents = JSON.parse(jsonData) as Agent[];
    const currentAgents = getAgents();

    // Generate new IDs for imported agents to avoid conflicts
    const newAgents = importedAgents.map((agent) => ({
      ...agent,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const allAgents = [...currentAgents, ...newAgents];
    saveAgents(allAgents);

    return newAgents;
  } catch (error) {
    console.error("Error importing agents:", error);
    throw new Error("Invalid agent data format");
  }
}

/**
 * Search agents by name or description
 */
export function searchAgents(query: string): Agent[] {
  const agents = getAgents();
  const lowercaseQuery = query.toLowerCase();

  return agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(lowercaseQuery) ||
      agent.description?.toLowerCase().includes(lowercaseQuery)
  );
}
