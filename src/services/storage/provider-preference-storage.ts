import { db } from '@/lib/db';
import type { ProviderPreference, AIProvider } from '@/types';

/**
 * Get active provider preference
 */
export async function getActiveProviderPreference(): Promise<ProviderPreference | undefined> {
  return await db.providerPreferences
    .where('isActive')
    .equals(1)
    .first();
}

/**
 * Get all provider preferences
 */
export async function getProviderPreferences(): Promise<ProviderPreference[]> {
  return await db.providerPreferences.toArray();
}

/**
 * Get provider preference by provider type
 */
export async function getProviderPreferenceByProvider(
  provider: AIProvider
): Promise<ProviderPreference | undefined> {
  return await db.providerPreferences
    .where('provider')
    .equals(provider)
    .first();
}

/**
 * Save or update provider preference
 */
export async function saveProviderPreference(
  provider: AIProvider,
  apiKeyId?: string
): Promise<ProviderPreference> {
  console.log('[Provider Preference] Saving:', { provider, apiKeyId });
  const now = new Date().toISOString();
  
  // Deactivate all other providers
  const allPrefs = await db.providerPreferences.toArray();
  console.log('[Provider Preference] Existing preferences:', allPrefs);
  
  for (const pref of allPrefs) {
    if (pref.provider !== provider) {
      await db.providerPreferences.update(pref.id, { isActive: false });
    }
  }

  // Check if preference already exists
  const existing = await getProviderPreferenceByProvider(provider);
  console.log('[Provider Preference] Existing for provider:', existing);

  if (existing) {
    // Update existing
    const updated: ProviderPreference = {
      ...existing,
      isActive: true,
      apiKeyId: apiKeyId || existing.apiKeyId,
      updatedAt: now,
    };
    await db.providerPreferences.update(existing.id, updated);
    console.log('[Provider Preference] Updated:', updated);
    return updated;
  } else {
    // Create new
    const newPref: ProviderPreference = {
      id: crypto.randomUUID(),
      provider,
      isActive: true,
      apiKeyId,
      createdAt: now,
      updatedAt: now,
    };
    await db.providerPreferences.add(newPref);
    console.log('[Provider Preference] Created new:', newPref);
    return newPref;
  }
}

/**
 * Delete provider preference
 */
export async function deleteProviderPreference(id: string): Promise<void> {
  await db.providerPreferences.delete(id);
}
