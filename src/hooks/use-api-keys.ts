'use client';

import { useState, useEffect, useCallback } from 'react';
import type { APIKey } from '@/types';
import * as apiKeyStorage from '@/services/storage/api-key-storage';

/**
 * Hook to manage API keys with real-time updates
 */
export function useAPIKeys() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load API keys from storage
  const loadAPIKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedKeys = await apiKeyStorage.getAPIKeys();
      setAPIKeys(loadedKeys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load API keys on mount
  useEffect(() => {
    loadAPIKeys();
  }, [loadAPIKeys]);

  // Create a new API key
  const createAPIKey = useCallback(async (keyData: Omit<APIKey, 'id' | 'createdAt'>) => {
    try {
      const newKey = await apiKeyStorage.createAPIKey(keyData);
      setAPIKeys((prev) => [newKey, ...prev]);
      return newKey;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API key';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update an existing API key
  const updateAPIKey = useCallback(
    async (id: string, updates: Partial<Omit<APIKey, 'id' | 'createdAt'>>) => {
      try {
        const updatedKey = await apiKeyStorage.updateAPIKey(id, updates);
        if (updatedKey) {
          setAPIKeys((prev) => prev.map((key) => (key.id === id ? updatedKey : key)));
        }
        return updatedKey;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update API key';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Delete an API key
  const deleteAPIKey = useCallback(async (id: string) => {
    try {
      await apiKeyStorage.deleteAPIKey(id);
      setAPIKeys((prev) => prev.filter((key) => key.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Test API key connection
  const testAPIKey = useCallback(async (id: string) => {
    try {
      const result = await apiKeyStorage.testAPIKey(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test API key';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    apiKeys,
    isLoading,
    error,
    createAPIKey,
    updateAPIKey,
    deleteAPIKey,
    testAPIKey,
    refresh: loadAPIKeys,
  };
}

/**
 * Hook to get a single API key by ID
 */
export function useAPIKey(id: string | null) {
  const [apiKey, setAPIKey] = useState<APIKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setAPIKey(null);
      return;
    }

    const fetchAPIKey = async () => {
      try {
        setIsLoading(true);
        const foundKey = await apiKeyStorage.getAPIKeyById(id);
        setAPIKey(foundKey || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API key');
        setAPIKey(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAPIKey();
  }, [id]);

  return { apiKey, isLoading, error };
}
