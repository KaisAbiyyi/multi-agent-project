import { db } from '@/lib/db';
import type { APIKey } from '@/types';

/**
 * Get all API keys
 */
export async function getAPIKeys(): Promise<APIKey[]> {
  return await db.apiKeys.orderBy('createdAt').reverse().toArray();
}

/**
 * Get a single API key by ID
 */
export async function getAPIKeyById(id: string): Promise<APIKey | undefined> {
  return await db.apiKeys.get(id);
}

/**
 * Create a new API key
 */
export async function createAPIKey(
  data: Omit<APIKey, 'id' | 'createdAt'>
): Promise<APIKey> {
  const now = new Date().toISOString();
  const newKey: APIKey = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
  };

  await db.apiKeys.add(newKey);
  return newKey;
}

/**
 * Update an existing API key
 */
export async function updateAPIKey(
  id: string,
  updates: Partial<Omit<APIKey, 'id' | 'createdAt'>>
): Promise<APIKey | undefined> {
  const existing = await db.apiKeys.get(id);
  if (!existing) {
    throw new Error('API key not found');
  }

  const updated: APIKey = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
  };

  await db.apiKeys.update(id, updated);
  return updated;
}

/**
 * Delete an API key
 */
export async function deleteAPIKey(id: string): Promise<void> {
  await db.apiKeys.delete(id);
}

/**
 * Get active API keys for a specific provider
 */
export async function getActiveAPIKeysByProvider(
  provider: string
): Promise<APIKey[]> {
  return await db.apiKeys
    .where('provider')
    .equals(provider)
    .and((key) => key.isActive === true)
    .toArray();
}

/**
 * Test API key connection
 */
export async function testAPIKey(id: string): Promise<boolean> {
  const apiKey = await db.apiKeys.get(id);
  if (!apiKey) {
    throw new Error('API key not found');
  }

  // TODO: Implement actual API testing logic based on provider
  // For now, just return true
  return true;
}
