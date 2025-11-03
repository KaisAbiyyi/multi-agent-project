'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent } from '@/types';
import * as agentStorage from '@/services/storage/agent-storage';

/**
 * Hook to manage agents with real-time updates
 */
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load agents from storage
  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedAgents = await agentStorage.getAgents();
      setAgents(loadedAgents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Listen for agent updates from other components (e.g., aggregator creation)
  useEffect(() => {
    const handleAgentUpdate = () => {
      console.log('[useAgents] Agent update event received, reloading agents...');
      loadAgents();
    };

    window.addEventListener('agentUpdated', handleAgentUpdate);
    return () => {
      window.removeEventListener('agentUpdated', handleAgentUpdate);
    };
  }, [loadAgents]);

  // Create a new agent
  const createAgent = useCallback(async (agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('[useAgents] Creating agent with data:', agentData);
    
    try {
      const newAgent = await agentStorage.createAgent(agentData);
      console.log('[useAgents] Agent created successfully:', newAgent);
      
      setAgents((prev) => {
        const updated = [newAgent, ...prev];
        console.log('[useAgents] Updated agents list:', updated);
        return updated;
      });
      
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      console.error('[useAgents] Error creating agent:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update an existing agent
  const updateAgent = useCallback(
    async (id: string, updates: Partial<Omit<Agent, 'id' | 'createdAt'>>) => {
      try {
        const updatedAgent = await agentStorage.updateAgent(id, updates);
        if (updatedAgent) {
          setAgents((prev) => prev.map((agent) => (agent.id === id ? updatedAgent : agent)));
        }
        return updatedAgent;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Delete an agent
  const deleteAgent = useCallback(async (id: string) => {
    try {
      await agentStorage.deleteAgent(id);
      setAgents((prev) => prev.filter((agent) => agent.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Duplicate an agent
  const duplicateAgent = useCallback(async (id: string) => {
    try {
      const duplicated = await agentStorage.duplicateAgent(id);
      setAgents((prev) => [duplicated, ...prev]);
      return duplicated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Search agents
  const searchAgents = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        return agents;
      }

      try {
        return await agentStorage.searchAgents(query);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search agents');
        return [];
      }
    },
    [agents]
  );

  return {
    agents,
    isLoading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
    searchAgents,
    refresh: loadAgents,
  };
}

/**
 * Hook to get a single agent by ID
 */
export function useAgent(id: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setAgent(null);
      return;
    }

    const fetchAgent = async () => {
      try {
        setIsLoading(true);
        const foundAgent = await agentStorage.getAgentById(id);
        setAgent(foundAgent || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
        setAgent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [id]);

  return { agent, isLoading, error };
}

/**
 * Hook for agent import/export operations
 */
export function useAgentImportExport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportAgents = useCallback(async (agentIds?: string[]) => {
    try {
      setIsExporting(true);
      const jsonData = await agentStorage.exportAgents(agentIds);
      
      // Create download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agents-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export agents';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importAgents = useCallback(async (jsonData: string) => {
    try {
      setIsImporting(true);
      const imported = await agentStorage.importAgents(jsonData);
      setError(null);
      return imported;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import agents';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, []);

  return {
    isImporting,
    isExporting,
    error,
    exportAgents,
    importAgents,
  };
}
