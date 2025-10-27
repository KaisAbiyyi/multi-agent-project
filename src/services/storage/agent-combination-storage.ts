import { db } from '@/lib/db';
import type { AgentCombination } from '@/types';

interface AgentCombinationPayload {
  name: string;
  agentIds: string[];
  description?: string;
}

export async function getAgentCombinations(): Promise<AgentCombination[]> {
  return db.agentCombinations.orderBy('createdAt').reverse().toArray();
}

export async function getAgentCombination(
  id: string
): Promise<AgentCombination | undefined> {
  return db.agentCombinations.get(id);
}

export async function createAgentCombination(
  payload: AgentCombinationPayload
): Promise<AgentCombination> {
  const now = new Date().toISOString();
  const combination: AgentCombination = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    agentIds: payload.agentIds,
    createdAt: now,
    updatedAt: now,
  };

  await db.agentCombinations.add(combination);
  return combination;
}

export async function updateAgentCombination(
  id: string,
  updates: Partial<Omit<AgentCombination, 'id' | 'createdAt'>>
): Promise<AgentCombination | undefined> {
  const existing = await db.agentCombinations.get(id);
  if (!existing) {
    return undefined;
  }

  const next: AgentCombination = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await db.agentCombinations.put(next);
  return next;
}

export async function deleteAgentCombination(id: string): Promise<void> {
  await db.agentCombinations.delete(id);
}

export async function upsertAgentCombinationByName(
  payload: AgentCombinationPayload
): Promise<AgentCombination> {
  const existing = await db.agentCombinations
    .where('name')
    .equals(payload.name.trim())
    .first();

  if (!existing) {
    return createAgentCombination(payload);
  }

  return (
    (await updateAgentCombination(existing.id, {
      ...payload,
      name: payload.name.trim(),
    })) ?? (await createAgentCombination(payload))
  );
}
