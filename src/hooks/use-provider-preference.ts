import { useState, useEffect } from 'react';
import type { ProviderPreference, AIProvider } from '@/types';
import {
  getActiveProviderPreference,
  saveProviderPreference,
  getProviderPreferences,
} from '@/services/storage/provider-preference-storage';

export function useProviderPreference() {
  const [activeProvider, setActiveProvider] = useState<ProviderPreference | undefined>();
  const [allPreferences, setAllPreferences] = useState<ProviderPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = async () => {
    console.log('[useProviderPreference] Loading preferences...');
    setIsLoading(true);
    try {
      const [active, all] = await Promise.all([
        getActiveProviderPreference(),
        getProviderPreferences(),
      ]);
      console.log('[useProviderPreference] Loaded:', { active, all });
      setActiveProvider(active);
      setAllPreferences(all);
    } catch (error) {
      console.error('Failed to load provider preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const setActive = async (provider: AIProvider, apiKeyId?: string) => {
    console.log('[useProviderPreference] Setting active provider:', { provider, apiKeyId });
    try {
      const updated = await saveProviderPreference(provider, apiKeyId);
      console.log('[useProviderPreference] Provider saved, updating state...');
      setActiveProvider(updated);
      await loadPreferences(); // Reload to update all preferences
    } catch (error) {
      console.error('Failed to set active provider:', error);
      throw error;
    }
  };

  return {
    activeProvider,
    allPreferences,
    isLoading,
    setActiveProvider: setActive,
    refresh: loadPreferences,
  };
}
