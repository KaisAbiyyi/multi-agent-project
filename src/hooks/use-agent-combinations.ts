'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentCombination } from '@/types';
import * as storage from '@/services/storage/agent-combination-storage';

export function useAgentCombinations() {
  const [combinations, setCombinations] = useState<AgentCombination[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCombinations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await storage.getAgentCombinations();
      setCombinations(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load combinations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombinations();
  }, [loadCombinations]);

  const saveCombination = useCallback(
    async (payload: { name: string; agentIds: string[]; description?: string }) => {
      try {
        const result = await storage.upsertAgentCombinationByName(payload);
        setCombinations((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === result.id);
          if (existingIndex >= 0) {
            const copy = [...prev];
            copy[existingIndex] = result;
            return copy;
          }
          return [result, ...prev];
        });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save combination';
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const deleteCombination = useCallback(async (id: string) => {
    try {
      await storage.deleteAgentCombination(id);
      setCombinations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete combination';
      setError(message);
      throw new Error(message);
    }
  }, []);

  return {
    combinations,
    isLoading,
    error,
    refresh: loadCombinations,
    saveCombination,
    deleteCombination,
  };
}
