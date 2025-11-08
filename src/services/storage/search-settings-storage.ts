/**
 * Storage service for web search settings
 */

import type { SearchProvider, SearchProviderConfig } from '@/types/web-search';

const SEARCH_SETTINGS_KEY = 'aegis_search_settings';

export interface SearchSettings {
  provider: SearchProvider;
  configs: {
    brave?: {
      apiKey?: string;
    };
    tavily?: {
      apiKey?: string;
    };
    serpapi?: {
      apiKey?: string;
    };
    searxng?: {
      baseUrl?: string;
      basicAuth?: string;
    };
  };
}

const DEFAULT_SETTINGS: SearchSettings = {
  provider: 'duckduckgo', // Default to DuckDuckGo as it doesn't require API key
  configs: {},
};

/**
 * Get current search settings from localStorage
 */
export async function getSearchSettings(): Promise<SearchSettings> {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(SEARCH_SETTINGS_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as SearchSettings;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      configs: {
        ...DEFAULT_SETTINGS.configs,
        ...parsed.configs,
      },
    };
  } catch (error) {
    console.error('[SearchSettings] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save search settings to localStorage
 */
export async function saveSearchSettings(settings: SearchSettings): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SEARCH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[SearchSettings] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get the active provider config for the current provider
 */
export async function getActiveProviderConfig(): Promise<SearchProviderConfig> {
  const settings = await getSearchSettings();
  const config: SearchProviderConfig = {
    provider: settings.provider,
  };

  switch (settings.provider) {
    case 'brave':
      config.apiKey = settings.configs.brave?.apiKey;
      break;
    case 'tavily':
      config.apiKey = settings.configs.tavily?.apiKey;
      break;
    case 'serpapi':
      config.apiKey = settings.configs.serpapi?.apiKey;
      break;
    case 'searxng':
      config.baseUrl = settings.configs.searxng?.baseUrl;
      config.basicAuth = settings.configs.searxng?.basicAuth;
      break;
    // duckduckgo and mock don't need config
  }

  return config;
}

/**
 * Update a specific provider's configuration
 */
export async function updateProviderConfig(
  provider: SearchProvider,
  config: Partial<SearchSettings['configs'][keyof SearchSettings['configs']]>
): Promise<void> {
  const settings = await getSearchSettings();
  
  if (provider === 'brave' || provider === 'tavily' || provider === 'serpapi' || provider === 'searxng') {
    settings.configs[provider] = {
      ...settings.configs[provider],
      ...config,
    };
  }

  await saveSearchSettings(settings);
}

/**
 * Set the active search provider
 */
export async function setActiveProvider(provider: SearchProvider): Promise<void> {
  const settings = await getSearchSettings();
  settings.provider = provider;
  await saveSearchSettings(settings);
}
