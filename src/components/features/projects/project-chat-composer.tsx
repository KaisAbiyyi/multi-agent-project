'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Agent, AgentCombination } from '@/types';
import type { AgentInput } from '@/types/schemas';
import { db } from '@/lib/db';
import { sanitizeInput } from '@/lib/security';
import { generateConversationTitle } from '@/lib/conversation-utils';
import { useAgents } from '@/hooks/use-agents';
import { useAgentCombinations } from '@/hooks/use-agent-combinations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { TextareaAutosize } from '@/components/ui/textarea-autosize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AgentButton } from '@/components/features/chat/agent-button';
import { AgentFormDialogContent } from '@/components/features/agent/agent-form-dialog-content';
import {
  Bot,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';

const MAX_AGENTS_PER_CONVERSATION = 4;

interface ProjectChatComposerProps {
  projectId: string;
  onConversationCreated?: (conversationId: string) => void | Promise<void>;
}

export function ProjectChatComposer({
  projectId,
  onConversationCreated,
}: ProjectChatComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const { agents, createAgent, updateAgent, deleteAgent } = useAgents();
  const { combinations, saveCombination } = useAgentCombinations();

  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSubmittingAgent, setIsSubmittingAgent] = useState(false);
  const [isSavingCombination, setIsSavingCombination] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const hasNonAggregatorAgents = useMemo(
    () => agents.some((agent) => !agent.isAggregator),
    [agents],
  );
  const aggregatorAgent = useMemo(
    () => agents.find((agent) => agent.isAggregator) ?? null,
    [agents],
  );

  const enforceAgentLimit = useCallback(
    (ids: string[], notify = true) => {
      const unique = Array.from(new Set(ids));
      if (unique.length <= MAX_AGENTS_PER_CONVERSATION) {
        return unique;
      }

      if (notify) {
        toast({
          title: 'Agent limit reached',
          description: `You can select up to ${MAX_AGENTS_PER_CONVERSATION} agents per conversation.`,
          variant: 'destructive',
        });
      }

      return unique.slice(0, MAX_AGENTS_PER_CONVERSATION);
    },
    [toast],
  );

  const handleToggleAgentSelection = useCallback(
    (agent: Agent) => {
      if (agent.isAggregator) {
        return;
      }

      setSelectedAgentIds((prev) => {
        const isSelected = prev.includes(agent.id);
        if (isSelected) {
          return prev.filter((id) => id !== agent.id);
        }

        return enforceAgentLimit([...prev, agent.id]);
      });
    },
    [enforceAgentLimit],
  );

  const handleApplyCombination = useCallback(
    (combination: AgentCombination) => {
      const agentIdSet = new Set(agents.filter((agent) => !agent.isAggregator).map((agent) => agent.id));
      const validAgentIds = combination.agentIds.filter((id) => agentIdSet.has(id));

      if (validAgentIds.length === 0) {
        toast({
          title: 'Agents unavailable',
          description: 'None of the agents in this combination exist anymore.',
          variant: 'destructive',
        });
        return;
      }

      const limitedAgentIds = enforceAgentLimit(validAgentIds);
      const trimmed = limitedAgentIds.length < validAgentIds.length;

      setSelectedAgentIds(limitedAgentIds);

      const messages: string[] = [];
      if (trimmed) {
        messages.push(
          `Only the first ${MAX_AGENTS_PER_CONVERSATION} agents were applied due to the per-conversation limit.`,
        );
      }
      messages.push(
        `${limitedAgentIds.length} agent${limitedAgentIds.length === 1 ? '' : 's'} selected from combination.`,
      );

      toast({
        title: 'Combination applied',
        description: messages.join(' '),
      });
    },
    [agents, enforceAgentLimit, toast],
  );

  const handleSaveCombination = useCallback(async () => {
    if (selectedAgentIds.length === 0) {
      toast({
        title: 'No agents selected',
        description: 'Please select at least one agent to save a combination.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingCombination(true);
      const agentNames = selectedAgentIds
        .map((id) => agents.find((agent) => agent.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      const combinationName = agentNames || 'Untitled combination';

      await saveCombination({
        name: combinationName,
        agentIds: selectedAgentIds,
      });

      toast({
        title: 'Combination saved',
        description: `Agent combination “${combinationName}” has been saved.`,
      });
    } catch (error) {
      console.error('[ProjectChatComposer] Error saving combination:', error);
      toast({
        title: 'Error',
        description: 'Failed to save agent combination.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCombination(false);
    }
  }, [agents, saveCombination, selectedAgentIds, toast]);

  const handleOpenAgentDialog = useCallback((agent: Agent | null = null) => {
    setEditingAgent(agent);
    setIsAgentDialogOpen(true);
  }, []);

  const handleCloseAgentDialog = useCallback(() => {
    setIsAgentDialogOpen(false);
    setEditingAgent(null);
  }, []);

  const handleCreateAgent = useCallback(
    async (input: AgentInput) => {
      try {
        setIsSubmittingAgent(true);
        const newAgent = await createAgent(input);

        toast({
          title: 'Agent created',
          description: `${input.name} has been created successfully.`,
        });

        setSelectedAgentIds([newAgent.id]);
        handleCloseAgentDialog();
      } catch (error) {
        console.error('[ProjectChatComposer] Error creating agent:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create agent.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmittingAgent(false);
      }
    },
    [createAgent, handleCloseAgentDialog, toast],
  );

  const handleUpdateAgent = useCallback(
    async (input: AgentInput) => {
      if (!editingAgent) return;

      try {
        setIsSubmittingAgent(true);
        await updateAgent(editingAgent.id, input);

        toast({
          title: 'Agent updated',
          description: `${input.name} has been updated successfully.`,
        });

        handleCloseAgentDialog();
      } catch (error) {
        console.error('[ProjectChatComposer] Error updating agent:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update agent.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmittingAgent(false);
      }
    },
    [editingAgent, handleCloseAgentDialog, toast, updateAgent],
  );

  const handleDeleteAgent = useCallback(
    async (agentToDelete?: Agent) => {
      const target = agentToDelete ?? editingAgent;
      if (!target) return;

      try {
        await deleteAgent(target.id);

        toast({
          title: 'Agent deleted',
          description: `${target.name} has been removed.`,
        });

        setSelectedAgentIds((prev) => prev.filter((id) => id !== target.id));
        handleCloseAgentDialog();
      } catch (error) {
        console.error('[ProjectChatComposer] Error deleting agent:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete agent.',
          variant: 'destructive',
        });
      }
    },
    [deleteAgent, editingAgent, handleCloseAgentDialog, toast],
  );

  const handleSendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (selectedAgentIds.length === 0) {
        toast({
          title: 'No agent selected',
          description: 'Please select at least one agent before starting a chat.',
          variant: 'destructive',
        });
        return;
      }

      const formData = new FormData(event.currentTarget);
      const messageValue = (formData.get('message') as string | null)?.trim() ?? '';
      if (messageValue.length === 0) {
        return;
      }

      const sanitizedMessage = sanitizeInput(messageValue);

      const conversationId = uuidv4();
      const now = new Date().toISOString();
      const params = new URLSearchParams();
      params.set('initialMessage', sanitizedMessage);
      params.set('selectedAgents', selectedAgentIds.join(','));
      params.set('projectId', projectId);

      setIsStartingConversation(true);
      formRef.current?.reset();

      router.push(`/chat/${conversationId}?${params.toString()}`);

      try {
        await db.conversations.add({
          id: conversationId,
          title: generateConversationTitle(sanitizedMessage),
          createdAt: now,
          updatedAt: now,
          agentIds: selectedAgentIds,
          projectId,
        });
        if (onConversationCreated) {
          try {
            await onConversationCreated(conversationId);
          } catch (callbackError) {
            console.error('[ProjectChatComposer] onConversationCreated callback failed:', callbackError);
          }
        }
      } catch (error) {
        console.error('[ProjectChatComposer] Failed to persist new conversation:', error);
        toast({
          title: 'Failed to start chat',
          description: 'We could not save this conversation locally. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsStartingConversation(false);
      }
    },
    [onConversationCreated, projectId, router, selectedAgentIds, toast],
  );

  const isMultiAgent = selectedAgentIds.length > 1;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {aggregatorAgent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <Bot className="h-4 w-4" />
                    {aggregatorAgent.name}
                    <span className="text-xs opacity-70">🤖</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleOpenAgentDialog(aggregatorAgent)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit {aggregatorAgent.name}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="text-sm text-muted-foreground">
                Configure an aggregator agent in Settings to enable multi-agent synthesis.
              </div>
            )}

            <ButtonGroup>
              {agents
                .filter((agent) => !agent.isAggregator)
                .map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  return (
                    <AgentButton
                      key={agent.id}
                      agent={agent}
                      isSelected={isSelected}
                      onSelect={handleToggleAgentSelection}
                      onEdit={handleOpenAgentDialog}
                      onDelete={(agentToDelete) => {
                        setEditingAgent(agentToDelete);
                        void handleDeleteAgent(agentToDelete);
                      }}
                    />
                  );
                })}
            </ButtonGroup>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Combinations
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Saved combinations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {combinations.length === 0 ? (
                  <DropdownMenuItem disabled>No combinations saved yet</DropdownMenuItem>
                ) : (
                  combinations.map((combination) => (
                    <DropdownMenuItem
                      key={combination.id}
                      onSelect={() => handleApplyCombination(combination)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{combination.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {combination.agentIds.length} agent
                          {combination.agentIds.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveCombination}
              disabled={selectedAgentIds.length === 0 || isSavingCombination}
            >
              {isSavingCombination ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenAgentDialog(null)}
              title="Create agent"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </div>
        </div>

        {isMultiAgent && (
          <div className="bg-primary/10 border-primary/20 flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Multi-agent mode active. Aggregator will synthesize the final answer.
          </div>
        )}

        <form ref={formRef} onSubmit={handleSendMessage} className="space-y-3">
          <div className="flex flex-col gap-2">
            <TextareaAutosize
              name="message"
              minRows={3}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="min-h-[72px]"
              disabled={!hasNonAggregatorAgents || isStartingConversation}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="min-w-[96px]"
                disabled={
                  !hasNonAggregatorAgents ||
                  selectedAgentIds.length === 0 ||
                  isStartingConversation
                }
              >
                {isStartingConversation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Start Chat
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {!hasNonAggregatorAgents && (
          <p className="text-muted-foreground text-xs">
            Create at least one agent to start chatting within this project.
          </p>
        )}
      </div>

      <Dialog open={isAgentDialogOpen} onOpenChange={(open) => (!open ? handleCloseAgentDialog() : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAgent ? `Edit ${editingAgent.name}` : 'Create Agent'}</DialogTitle>
          </DialogHeader>
          <AgentFormDialogContent
            agent={editingAgent ?? undefined}
            onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
            onDelete={editingAgent ? () => void handleDeleteAgent(editingAgent) : undefined}
            isSubmitting={isSubmittingAgent}
            agentCombinations={combinations}
            onApplyCombination={handleApplyCombination}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
