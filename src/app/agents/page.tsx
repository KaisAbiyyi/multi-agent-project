/**
 * Agents Management Page
 * Main page for managing AI agents
 */

"use client";

import { useState } from "react";
import { useAgents, useAgentImportExport } from "@/hooks/use-agents";
import { Agent } from "@/types";
import { AgentInput } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentForm } from "@/components/features/agent/agent-form";
import { AgentList } from "@/components/features/agent/agent-list";
import { DeleteAgentDialog } from "@/components/features/agent/delete-agent-dialog";
import { ImportExportDialog } from "@/components/features/agent/import-export-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plus, Download, Upload, AlertCircle, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AgentsPage() {
  const { agents, isLoading, error, createAgent, updateAgent, deleteAgent, duplicateAgent } =
    useAgents();
  const { importAgents } = useAgentImportExport();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportData, setExportData] = useState<string>("");

  // Create agent handler
  const handleCreate = async (data: AgentInput) => {
    try {
      setIsSubmitting(true);
      createAgent(data);
      setIsCreateDialogOpen(false);
      toast({
        title: "Agent created",
        description: `${data.name} has been created successfully.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit agent handler
  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (data: AgentInput) => {
    if (!selectedAgent) return;

    try {
      setIsSubmitting(true);
      updateAgent(selectedAgent.id, data);
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
      toast({
        title: "Agent updated",
        description: `${data.name} has been updated successfully.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete agent handler
  const handleDeleteClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedAgent) return;

    try {
      deleteAgent(selectedAgent.id);
      setIsDeleteDialogOpen(false);
      setSelectedAgent(null);
      toast({
        title: "Agent deleted",
        description: `${selectedAgent.name} has been deleted.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  // Duplicate agent handler
  const handleDuplicate = (agent: Agent) => {
    try {
      duplicateAgent(agent.id);
      toast({
        title: "Agent duplicated",
        description: `Created a copy of ${agent.name}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to duplicate agent",
        variant: "destructive",
      });
    }
  };

  // Export single agent
  const handleExportSingle = (agent: Agent) => {
    const data = JSON.stringify([agent], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-${agent.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Agent exported",
      description: `${agent.name} has been exported.`,
    });
  };

  // Export all agents
  const handleExportAll = () => {
    const data = JSON.stringify(agents, null, 2);
    setExportData(data);
    setIsImportExportDialogOpen(true);
  };

  // Import agents
  const handleImport = async (jsonData: string) => {
    try {
      const imported = await importAgents(jsonData);
      toast({
        title: "Import successful",
        description: `Imported ${imported.length} ${imported.length === 1 ? "agent" : "agents"}.`,
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <Bot className="text-muted-foreground h-8 w-8 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your AI agents with custom personas and configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportExportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportAll} disabled={agents.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>
      </div>

      <Separator />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Agent List */}
      <AgentList
        agents={agents}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onDuplicate={handleDuplicate}
        onExport={handleExportSingle}
      />

      {/* Create Agent Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI agent with a custom persona and settings
            </DialogDescription>
          </DialogHeader>
          <AgentForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update your agent&apos;s configuration and settings
            </DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <AgentForm
              agent={selectedAgent}
              onSubmit={handleUpdate}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedAgent(null);
              }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteAgentDialog
        agent={selectedAgent}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        open={isImportExportDialogOpen}
        onOpenChange={setIsImportExportDialogOpen}
        onImport={handleImport}
        exportData={exportData}
      />
    </div>
  );
}
