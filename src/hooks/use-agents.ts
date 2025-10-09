/**
 * Custom React hooks for agent management
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Agent } from "@/types";
import * as agentStorage from "@/services/storage/agent-storage";

/**
 * Hook to manage agents with real-time updates
 */
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load agents from storage
  const loadAgents = useCallback(() => {
    try {
      setIsLoading(true);
      const loadedAgents = agentStorage.getAgents();
      setAgents(loadedAgents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Create a new agent
  const createAgent = useCallback((agentData: Omit<Agent, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newAgent = agentStorage.createAgent(agentData);
      setAgents((prev) => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create agent";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update an existing agent
  const updateAgent = useCallback(
    (id: string, updates: Partial<Omit<Agent, "id" | "createdAt">>) => {
      try {
        const updatedAgent = agentStorage.updateAgent(id, updates);
        setAgents((prev) => prev.map((agent) => (agent.id === id ? updatedAgent : agent)));
        return updatedAgent;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update agent";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Delete an agent
  const deleteAgent = useCallback((id: string) => {
    try {
      const success = agentStorage.deleteAgent(id);
      if (success) {
        setAgents((prev) => prev.filter((agent) => agent.id !== id));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete agent";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Duplicate an agent
  const duplicateAgent = useCallback((id: string) => {
    try {
      const duplicated = agentStorage.duplicateAgent(id);
      setAgents((prev) => [...prev, duplicated]);
      return duplicated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to duplicate agent";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Search agents
  const searchAgents = useCallback(
    (query: string) => {
      if (!query.trim()) {
        return agents;
      }
      return agentStorage.searchAgents(query);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setAgent(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const loadedAgent = agentStorage.getAgentById(id);
      setAgent(loadedAgent);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { agent, isLoading, error };
}

/**
 * Hook for agent import/export
 */
export function useAgentImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportAgents = useCallback((agentIds?: string[]) => {
    try {
      setIsExporting(true);
      const jsonData = agentStorage.exportAgents(agentIds);

      // Create a download link
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aegis-agents-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export agents";
      setError(errorMessage);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importAgents = useCallback((jsonData: string): Agent[] => {
    try {
      setIsImporting(true);
      const importedAgents = agentStorage.importAgents(jsonData);
      setError(null);
      return importedAgents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import agents";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, []);

  return {
    exportAgents,
    importAgents,
    isExporting,
    isImporting,
    error,
  };
}
