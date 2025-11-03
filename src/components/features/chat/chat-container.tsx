"use client";

import Dexie from "dexie";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAgents } from "@/hooks/use-agents";
import { useAgentCombinations } from "@/hooks/use-agent-combinations";
import type { AgentInput } from "@/types/schemas";
import type {
  Message,
  Agent,
  AgentCombination,
  Conversation,
  AIProvider,
  MessageStage,
} from "@/types";
import type { AgentResponse, RefinedResponse } from "@/types/orchestration";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Settings,
  Plus,
  Bot,
  MessageSquare,
  Send,
  Save,
  Layers,
  Loader2,
  ArrowDown,
  Square,
  Sparkles,
  Search,
  Edit2,
} from "lucide-react";
import { db } from "@/lib/db";
import { getAggregatorAgent } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SettingsDialog } from "@/components/features/settings/settings-dialog";
import { AgentFormDialogContent } from "@/components/features/agent/agent-form-dialog-content";
import { ChatHistory } from "@/components/features/chat/chat-history";
import {
  ProjectsSidebar,
  type ProjectsSidebarHandle,
} from "@/components/features/chat/projects-sidebar";
import { SearchConversations } from "@/components/features/chat/search-conversations";
import { AgentButton } from "@/components/features/chat/agent-button";
import { useToast } from "@/hooks/use-toast";
import { callAIModelStreaming } from "@/services/api/ai-client";
import type { ConversationHistoryEntry } from "@/services/api/ai-client";
import { TextareaAutosize } from "@/components/ui/textarea-autosize";
import { AI_PROVIDERS, FEATURE_FLAGS } from "@/constants";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  composeSystemPrompt,
  buildRefinementPrompt,
  buildAggregationPrompt,
} from "@/services/orchestration/multi-agent-orchestrator";
import { generateConversationTitle } from "@/lib/conversation-utils";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { MessageItem } from "./message-item";
import { sanitizeInput } from "@/lib/security";
import { EmptyState } from "./empty-state";

const MAX_AGENTS_PER_CONVERSATION = 4;
const RATE_LIMIT_DELAY_MS = 1500;
const RATE_LIMIT_PROVIDERS = new Set<AIProvider>(["openrouter", "llm7"]);
const SHOW_DELIBERATION_STORAGE_KEY = "aegis_show_chain_of_thought";
const MESSAGE_PAGE_SIZE = 20;
const SCROLL_TOP_THRESHOLD = 64;

const DELIBERATION_STAGE_MESSAGES: Record<MessageStage, string> = {
  initial: FEATURE_FLAGS.ENABLE_DEBATE_MODE
    ? "Agents are drafting their initial viewpoints…"
    : "Agents are analyzing the prompt…",
  refined: "Agents are debating and challenging each other…", // Only shown when ENABLE_DEBATE_MODE is true
  final: FEATURE_FLAGS.ENABLE_DEBATE_MODE
    ? "Aggregator is composing the final answer…"
    : "Aggregator is synthesizing responses…",
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sanitizeAgentResponseContent = (
  content: string,
  labels: Array<string | undefined>
) => {
  if (!content) {
    return content;
  }

  let sanitized = content;
  for (const rawLabel of labels) {
    if (!rawLabel) {
      continue;
    }

    const pattern = new RegExp(
      `^(\\s*(?:Agent\\s+)?${escapeRegExp(rawLabel)}:\\s*)+`,
      "i"
    );

    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "");
      break;
    }
  }

  return sanitized.replace(/^\s+/, "");
};

type StreamAgentResponseOptions = {
  agent: Agent;
  prompt: string;
  history: ConversationHistoryEntry[];
  stage: MessageStage;
  stageLabel?: string;
  reuseMessageId?: string;
  initialContent?: string;
  systemPromptOverride?: string;
  displayAgentId?: string | null;
  authorLabel?: string;
  previousStage?: MessageStage;
  previousStageLabel?: string;
  previousAuthorLabel?: string;
  suppressDisplay?: boolean;
};

type StreamAgentResponseResult = {
  messageId: string;
  content: string;
};

type SendPromptOptions = {
  showDeliberation: boolean;
  onPhaseChange?: (stage: MessageStage | null) => void;
};

interface ChatContainerProps {
  conversationId?: string;
  initialMessage?: string;
  initialSelectedAgentIds?: string[];
  initialProjectId?: string;
}

export function ChatContainer({
  conversationId,
  initialMessage,
  initialSelectedAgentIds,
  initialProjectId,
}: ChatContainerProps) {
  const router = useRouter();
  const { agents, createAgent, updateAgent, deleteAgent } = useAgents();
  const { combinations, saveCombination } = useAgentCombinations();
  const { toast } = useToast();
  const initialSelectedAgentsKey = (initialSelectedAgentIds ?? []).join(",");

  // Keyboard shortcuts
  useGlobalShortcuts({
    onNewChat: () => {
      if (conversationId) {
        router.push("/");
      }
    },
    onSearch: () => setIsSearchDialogOpen(true),
    onSettings: () => setIsSettingsOpen(true),
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isSavingCombination, setIsSavingCombination] = useState(false);
  const [conversationAgentIds, setConversationAgentIds] = useState<string[] | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(initialProjectId ?? null);

  const projectsSidebarRef = useRef<ProjectsSidebarHandle>(null);

  useEffect(() => {
    setPendingProjectId(initialProjectId ?? null);
  }, [initialProjectId]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);
  const oldestMessageTimestampRef = useRef<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const initialMessageProcessed = useRef(false);
  const initialSelectionApplied = useRef(false);
  const conversationLoadedRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showDeliberation, setShowDeliberation] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const stored = window.localStorage.getItem(SHOW_DELIBERATION_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [deliberationStatus, setDeliberationStatus] = useState<{
    stage: MessageStage;
    message: string;
  } | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const initialDeliberationSynced = useRef(false);
  const aggregatorProgressMessageId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingScrollBehaviorRef = useRef<ScrollBehavior | null>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = messageContainerRef.current;
      if (!container) {
        return;
      }

      if (behavior === "auto") {
        container.scrollTop = container.scrollHeight;
      }

      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  const onDeliberationPhaseChange = useCallback(
    (stage: MessageStage | null) => {
      const deliberationVisible = showDeliberation && selectedAgentIds.length > 1;
      if (deliberationVisible) {
        setDeliberationStatus(null);
        return;
      }

      if (stage) {
        setDeliberationStatus({ stage, message: DELIBERATION_STAGE_MESSAGES[stage] });
        if (aggregatorProgressMessageId.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aggregatorProgressMessageId.current
                ? {
                    ...msg,
                    content: DELIBERATION_STAGE_MESSAGES[stage],
                    timestamp: new Date().toISOString(),
                    stageLabel:
                      stage === "final"
                        ? "Final Response (in progress)"
                        : stage === "refined"
                          ? "Refinement Stage"
                          : "Initial Stage",
                  }
                : msg
            )
          );

          if (conversationId) {
            const messageId = aggregatorProgressMessageId.current;
            db.messages
              .update(messageId, {
                content: DELIBERATION_STAGE_MESSAGES[stage],
                stageLabel:
                  stage === "final"
                    ? "Final Response (in progress)"
                    : stage === "refined"
                      ? "Refinement Stage"
                      : "Initial Stage",
                timestamp: new Date().toISOString(),
              })
              .catch((error) =>
                console.error("[ChatContainer] Failed to update aggregator placeholder:", error)
              );
          }
        }
      } else {
        setDeliberationStatus(null);
      }
    },
    [showDeliberation, selectedAgentIds.length, conversationId]
  );

  const agentById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) {
      map.set(agent.id, agent);
    }
    return map;
  }, [agents]);

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, agent.name);
    }
    return map;
  }, [agents]);

  const buildConversationHistory = useCallback(
    (sourceMessages: Message[]): ConversationHistoryEntry[] => {
      const history: ConversationHistoryEntry[] = [];

      for (const msg of sourceMessages) {
        if ((msg.role !== "user" && msg.role !== "assistant") || !msg.content?.trim()) {
          continue;
        }

        if (msg.role === "assistant") {
          const agentName = msg.agentId ? agentNameMap.get(msg.agentId) : undefined;
          const label = agentName ?? msg.authorLabel;
          const prefix = agentName ? `Agent ${agentName}: ` : label ? `${label}: ` : "";
          history.push({
            role: "assistant",
            content: prefix ? `${prefix}${msg.content}` : msg.content,
          });
        } else {
          history.push({
            role: "user",
            content: msg.content,
          });
        }
      }

      return history;
    },
    [agentNameMap]
  );

  const enforceAgentLimit = useCallback(
    (ids: string[], notify = true) => {
      const unique = Array.from(new Set(ids));
      
      // Separate aggregator from regular agents
      const aggregator = agents.find((a) => a.isAggregator);
      const aggregatorId = aggregator?.id;
      
      const regularAgentIds = unique.filter((id) => id !== aggregatorId);
      const hasAggregator = aggregatorId && unique.includes(aggregatorId);
      
      // Check limit only for regular agents (aggregator is separate)
      if (regularAgentIds.length <= MAX_AGENTS_PER_CONVERSATION) {
        return unique;
      }

      if (notify) {
        toast({
          title: "Agent limit reached",
          description: `You can select up to ${MAX_AGENTS_PER_CONVERSATION} agents per conversation.`,
          variant: "destructive",
        });
      }

      // Return limited regular agents + aggregator if it was included
      const limitedRegular = regularAgentIds.slice(0, MAX_AGENTS_PER_CONVERSATION);
      return hasAggregator ? [...limitedRegular, aggregatorId] : limitedRegular;
    },
    [toast, agents]
  );

  const waitForConversation = useCallback(
    async (id: string, maxAttempts = 10, delayMs = 150): Promise<Conversation | undefined> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const existing = await db.conversations.get(id);
        if (existing) {
          return existing;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return undefined;
    },
    []
  );

  const fetchRecentMessages = useCallback(
    async (id: string, limit = MESSAGE_PAGE_SIZE) => {
      const desiredUserCount = Math.floor(limit / 2);
      const desiredAssistantCount = limit - desiredUserCount;
      const chunkSize = Math.max(limit * 4, limit + 1);

      const collected: Message[] = [];
      let userCount = 0;
      let assistantCount = 0;
      let cursorTimestamp: string | null = null;
      let completed = false;

      while (!completed && (userCount < desiredUserCount || assistantCount < desiredAssistantCount)) {
        const chunk = await db.messages
          .where("[conversationId+timestamp]")
          .between(
            [id, Dexie.minKey],
            [id, cursorTimestamp ?? Dexie.maxKey],
            true,
            cursorTimestamp ? false : true
          )
          .reverse()
          .limit(chunkSize)
          .toArray();

        if (chunk.length === 0) {
          completed = true;
          break;
        }

        for (const message of chunk) {
          collected.push(message);

          if (message.role === "user" && userCount < desiredUserCount) {
            userCount += 1;
          } else if (
            message.role === "assistant" &&
            !message.isHidden &&
            assistantCount < desiredAssistantCount
          ) {
            assistantCount += 1;
          }

          if (userCount >= desiredUserCount && assistantCount >= desiredAssistantCount) {
            completed = true;
            break;
          }
        }

        if (!completed) {
          if (chunk.length < chunkSize) {
            completed = true;
          } else {
            const lastMessage = chunk[chunk.length - 1];
            cursorTimestamp = lastMessage?.timestamp ?? null;
            if (!cursorTimestamp) {
              completed = true;
            }
          }
        }
      }

      const seen = new Set<string>();
      const uniqueDescending: Message[] = [];
      for (const message of collected) {
        if (seen.has(message.id)) {
          continue;
        }
        seen.add(message.id);
        uniqueDescending.push(message);
      }

      const ordered = [...uniqueDescending].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      let selectedMessages = ordered;
      if (ordered.length > limit) {
        const selectedIds = new Set<string>();
        let selectedUser = 0;
        let selectedAssistant = 0;
        let earliestSelectedTimestamp: string | null = null;

        for (let index = ordered.length - 1; index >= 0; index--) {
          const message = ordered[index];
          let tookMessage = false;

          if (message.role === "user" && selectedUser < desiredUserCount) {
            selectedIds.add(message.id);
            selectedUser += 1;
            tookMessage = true;
          } else if (
            message.role === "assistant" &&
            !message.isHidden &&
            selectedAssistant < desiredAssistantCount
          ) {
            selectedIds.add(message.id);
            selectedAssistant += 1;
            tookMessage = true;
          }

          if (tookMessage) {
            earliestSelectedTimestamp = message.timestamp;
          }

          if (selectedUser >= desiredUserCount && selectedAssistant >= desiredAssistantCount) {
            break;
          }
        }

        if (selectedIds.size > 0) {
          const thresholdTimestamp =
            earliestSelectedTimestamp ??
            ordered.find((msg) => selectedIds.has(msg.id))?.timestamp ??
            null;

          selectedMessages = ordered.filter((message) => {
            if (selectedIds.has(message.id)) {
              return true;
            }

            if (!thresholdTimestamp) {
              return false;
            }

            if (message.timestamp === thresholdTimestamp) {
              return true;
            }

            if (message.timestamp < thresholdTimestamp) {
              return false;
            }

            if (message.role === "assistant" && message.isHidden) {
              return true;
            }

            if (message.role === "system") {
              return true;
            }

            return false;
          });
        }
      }

      const finalMessages = selectedMessages;
      const earliestTimestamp = finalMessages[0]?.timestamp;
      let hasMore = false;

      if (earliestTimestamp) {
        const olderVisible = await db.messages
          .where("[conversationId+timestamp]")
          .between([id, Dexie.minKey], [id, earliestTimestamp], true, false)
          .filter((msg) => {
            if (msg.role === "user") {
              return true;
            }
            if (msg.role === "assistant") {
              return !msg.isHidden;
            }
            return false;
          })
          .first();

        hasMore = Boolean(olderVisible);
      }

      return {
        messages: finalMessages,
        hasMore,
      };
    },
    []
  );

  const waitForMessages = useCallback(
    async (
      id: string,
      maxAttempts = 8,
      delayMs = 200
    ): Promise<{ messages: Message[]; hasMore: boolean }> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await fetchRecentMessages(id);
        if (result.messages.length > 0) {
          return result;
        }

        await delay(delayMs);
      }

      return fetchRecentMessages(id);
    },
    [fetchRecentMessages]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || isLoadingOlderMessages || !hasMoreMessages) {
      return;
    }

    const beforeTimestamp = oldestMessageTimestampRef.current;
    if (!beforeTimestamp) {
      setHasMoreMessages(false);
      return;
    }

    setIsLoadingOlderMessages(true);
    const container = messageContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      const rawOlderMessages = await db.messages
        .where("[conversationId+timestamp]")
        .between(
          [conversationId, Dexie.minKey],
          [conversationId, beforeTimestamp],
          true,
          false
        )
        .reverse()
        .limit(MESSAGE_PAGE_SIZE + 1)
        .toArray();

      const hasMore = rawOlderMessages.length > MESSAGE_PAGE_SIZE;
      const trimmed = hasMore ? rawOlderMessages.slice(0, MESSAGE_PAGE_SIZE) : rawOlderMessages;
      const olderMessages = trimmed.reverse();

      if (olderMessages.length > 0) {
        setMessages((current) => {
          const existingIds = new Set(current.map((msg) => msg.id));
          const deduped = olderMessages.filter((msg) => !existingIds.has(msg.id));
          if (deduped.length === 0) {
            return current;
          }
          skipAutoScrollRef.current = true;
          const updated = [...deduped, ...current];
          oldestMessageTimestampRef.current = updated[0]?.timestamp ?? null;
          return updated;
        });
      }

      setHasMoreMessages(hasMore);
    } catch (error) {
      console.error("[ChatContainer] Failed to load older messages:", error);
    } finally {
      requestAnimationFrame(() => {
        const node = messageContainerRef.current;
        if (node && previousScrollHeight > 0) {
          const newScrollHeight = node.scrollHeight;
          node.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
        }
      });
      setIsLoadingOlderMessages(false);
    }
  }, [conversationId, hasMoreMessages, isLoadingOlderMessages]);

  useEffect(() => {
    initialSelectionApplied.current = false;
  }, [conversationId, initialSelectedAgentsKey]);

  useEffect(() => {
    initialMessageProcessed.current = false;
  }, [conversationId, initialMessage]);

  useEffect(() => {
    const deliberationVisible = showDeliberation && selectedAgentIds.length > 1;
    if (deliberationVisible) {
      setDeliberationStatus(null);
    }
  }, [showDeliberation, selectedAgentIds.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHOW_DELIBERATION_STORAGE_KEY, String(showDeliberation));
    }
  }, [showDeliberation]);

  useEffect(() => {
    if (selectedAgentIds.length > 1 && !initialDeliberationSynced.current) {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(SHOW_DELIBERATION_STORAGE_KEY)
          : null;
      if (stored !== null) {
        const storedValue = stored === "true";
        setShowDeliberation((current) => (current === storedValue ? current : storedValue));
      }
      initialDeliberationSynced.current = true;
    }
  }, [selectedAgentIds.length]);

  // Auto-scroll to bottom when new messages arrive (unless we're prepending older ones)
  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }

    const behavior = pendingScrollBehaviorRef.current ?? "smooth";
    pendingScrollBehaviorRef.current = null;

    scrollToBottom(behavior);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length === 0) {
      oldestMessageTimestampRef.current = null;
      return;
    }
    oldestMessageTimestampRef.current = messages[0]?.timestamp ?? null;
  }, [messages]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const atTop = container.scrollTop <= 16;
      const hasOverflow = container.scrollHeight > container.clientHeight + 8;
      const nearTopForLoading = container.scrollTop <= SCROLL_TOP_THRESHOLD;

      setShowScrollToBottom(atTop && hasOverflow && messages.length > 0);

      if (nearTopForLoading && hasMoreMessages && !isLoadingOlderMessages) {
        void loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
    messages.length,
    showDeliberation,
  ]);

  // Load conversation messages if conversationId exists
  useEffect(() => {
    let isMounted = true;

    if (!conversationId) {
      if (messages.length > 0) {
        setMessages([]);
      }
      if (conversationAgentIds !== null) {
        setConversationAgentIds(null);
      }
      setHasMoreMessages(false);
      setIsLoadingOlderMessages(false);
      oldestMessageTimestampRef.current = null;
      conversationLoadedRef.current = null;
      return;
    }

    // Only load if we haven't loaded this conversation yet
    if (conversationLoadedRef.current === conversationId) {
      console.log("[ChatContainer] Conversation already loaded, skipping reload");
      return;
    }

    const loadConversation = async () => {
      try {
        console.log("[ChatContainer] Loading conversation:", conversationId);
        const conversation = await db.conversations.get(conversationId);
        if (!isMounted) return;

        console.log("[ChatContainer] Conversation loaded:", conversation);

        const loadedAgentIds = conversation?.agentIds ?? [];
        setConversationAgentIds(enforceAgentLimit(loadedAgentIds, false));

        let recentResult = await fetchRecentMessages(conversationId);

        if (conversation) {
          const createdAtTime = new Date(conversation.createdAt).getTime();
          const updatedAtTime = new Date(conversation.updatedAt).getTime();
          const shouldHaveHistory =
            Number.isFinite(createdAtTime) &&
            Number.isFinite(updatedAtTime) &&
            updatedAtTime > createdAtTime;

          console.log("[ChatContainer] Conversation timestamps:", {
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            shouldHaveHistory,
            messageCount: recentResult.messages.length,
          });

          if (shouldHaveHistory && recentResult.messages.length === 0) {
            console.log("[ChatContainer] Waiting for messages to appear...");
            recentResult = await waitForMessages(conversationId);
            console.log(
              "[ChatContainer] Messages after waiting:",
              recentResult.messages.length
            );
          }
        }

        if (!isMounted) return;
        console.log(
          "[ChatContainer] Setting messages in state:",
          recentResult.messages.length,
          recentResult.messages
        );
        pendingScrollBehaviorRef.current = "auto";
        skipAutoScrollRef.current = false;
        setHasMoreMessages(recentResult.hasMore);
        setIsLoadingOlderMessages(false);
        oldestMessageTimestampRef.current = recentResult.messages[0]?.timestamp ?? null;
        setMessages(recentResult.messages);
        conversationLoadedRef.current = conversationId;
      } catch (error) {
        console.error("[ChatContainer] Error loading conversation:", error);
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Apply initial agent selection based on props, conversation data, or defaults
  useEffect(() => {
    if (initialSelectionApplied.current) return;
    if (agents.length === 0) return;

    if (conversationId && conversationAgentIds === null) {
      return; // wait for conversation agent ids to load
    }

    const agentIdSet = new Set(agents.map((agent) => agent.id));
    const validFromInitial = (initialSelectedAgentIds ?? []).filter((id) => agentIdSet.has(id));
    const validFromConversation = (conversationAgentIds ?? []).filter((id) => agentIdSet.has(id));

    const limitedInitial = enforceAgentLimit(validFromInitial, false);
    if (limitedInitial.length > 0) {
      setSelectedAgentIds(limitedInitial);
      initialSelectionApplied.current = true;
      return;
    }

    const limitedFromConversation = enforceAgentLimit(validFromConversation, false);
    if (limitedFromConversation.length > 0) {
      setSelectedAgentIds(limitedFromConversation);
      initialSelectionApplied.current = true;
      return;
    }

    if (selectedAgentIds.length > 0) {
      initialSelectionApplied.current = true;
      return;
    }

    // For new conversations (home page), don't auto-select agents
    // Only saved combinations should be used as templates
    if (!conversationId) {
      initialSelectionApplied.current = true;
      return;
    }

    const [firstAgent] = agents;
    if (firstAgent) {
      setSelectedAgentIds([firstAgent.id]);
      initialSelectionApplied.current = true;
    }
  }, [
    agents,
    conversationAgentIds,
    conversationId,
    enforceAgentLimit,
    initialSelectedAgentIds,
    selectedAgentIds.length,
  ]);

  // Persist selected agents on the conversation record
  useEffect(() => {
    if (!conversationId) return;
    if (!initialSelectionApplied.current) return;

    db.conversations
      .update(conversationId, {
        agentIds: selectedAgentIds,
      })
      .catch(console.error);
  }, [conversationId, selectedAgentIds]);

  const resolveAgentCredentials = useCallback(async (agent: Agent) => {
    // Use agent's provider field directly
    const provider = agent.provider;
    const providerConfig = AI_PROVIDERS[provider];
    let apiKey: string | undefined;

    // Try to get API key from agent's apiKeyId
    if (agent.apiKeyId) {
      try {
        const storedKey = await db.apiKeys.get(agent.apiKeyId);
        apiKey = storedKey?.key?.trim();
      } catch (err) {
        console.warn("[ChatContainer] Unable to load API key for agent:", err);
      }
    }

    // For providers that require API key but agent doesn't have one configured
    if ((!apiKey || apiKey.length === 0) && providerConfig.requiresAPIKey) {
      console.error(
        `[ChatContainer] Agent "${agent.name}" requires API key for ${provider} but none is configured`
      );
      throw new Error(
        `Agent "${agent.name}" requires an API key for ${provider}. Please configure it in the agent settings.`
      );
    }

    return { provider, providerConfig, apiKey };
  }, []);

  const streamAgentResponse = useCallback(
    async (options: StreamAgentResponseOptions): Promise<StreamAgentResponseResult | null> => {
      const {
        agent,
        prompt,
        history,
        stage,
        stageLabel,
        reuseMessageId,
        initialContent,
        systemPromptOverride,
        displayAgentId,
        authorLabel,
        previousStage,
        previousStageLabel,
        previousAuthorLabel,
        suppressDisplay,
      } = options;

      const { provider, providerConfig, apiKey } = await resolveAgentCredentials(agent);

      if (providerConfig.requiresAPIKey && (!apiKey || apiKey.length === 0)) {
        toast({
          title: `${providerConfig.name} API key required`,
          description: `Edit ${agent.name} or update provider settings to attach a valid API key before requesting responses.`,
          variant: "destructive",
        });
        return null;
      }

      const messageId = reuseMessageId ?? uuidv4();
      const timestamp = new Date().toISOString();
      const persistedAgentId =
        displayAgentId === undefined ? agent.id : (displayAgentId ?? undefined);
      const resolvedAuthorLabel = authorLabel ?? (persistedAgentId ? undefined : agent.name);
      const systemPrompt = systemPromptOverride ?? composeSystemPrompt(agent);
      const shouldDisplay = !suppressDisplay;

      if (shouldDisplay && !reuseMessageId) {
        const newMessage: Message = {
          id: messageId,
          conversationId: conversationId || "",
          role: "assistant",
          content: "",
          agentId: persistedAgentId,
          timestamp,
          stage,
          stageLabel,
          initialContent,
          authorLabel: resolvedAuthorLabel,
          isHidden: Boolean(suppressDisplay),
        };

        setMessages((prev) => [...prev, newMessage]);
      } else if (shouldDisplay) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: "",
                  stage,
                  stageLabel,
                  initialContent: initialContent ?? msg.initialContent,
                  authorLabel: resolvedAuthorLabel ?? msg.authorLabel,
                  timestamp,
                  agentId: persistedAgentId,
                }
              : msg
          )
        );
      }

      let fullContent = "";

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        await callAIModelStreaming(
          agent,
          {
            prompt,
            systemPrompt,
            history,
          },
          (chunk, done) => {
            if (done) {
              abortControllerRef.current = null;
              const sanitizedContent = sanitizeAgentResponseContent(fullContent, [
                agent.name,
                resolvedAuthorLabel,
              ]);

              if (sanitizedContent !== fullContent && shouldDisplay) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId ? { ...msg, content: sanitizedContent } : msg
                  )
                );
              }

              fullContent = sanitizedContent;

              if (!conversationId) {
                return;
              }

              const persistedMessage: Message = {
                id: messageId,
                conversationId,
                role: "assistant",
                content: fullContent,
                agentId: persistedAgentId,
                timestamp,
                stage,
                stageLabel,
                initialContent,
                authorLabel: resolvedAuthorLabel,
                isHidden: Boolean(suppressDisplay),
              };

              console.log("[ChatContainer] Persisting assistant message:", {
                messageId,
                conversationId,
                agentName: agent.name,
                contentLength: fullContent.length,
                isHidden: Boolean(suppressDisplay),
                shouldDisplay,
              });

              if (reuseMessageId) {
                db.messages
                  .update(messageId, persistedMessage)
                  .then(() => {
                    console.log("[ChatContainer] Message updated successfully:", messageId);
                  })
                  .catch((error) => {
                    console.error("[ChatContainer] Failed to update message:", error);
                  });
              } else {
                db.messages
                  .add(persistedMessage)
                  .then(() => {
                    console.log("[ChatContainer] Message added successfully:", messageId);
                  })
                  .catch((error) => {
                    console.error("[ChatContainer] Failed to add message:", error);
                  });
              }

              db.conversations
                .update(conversationId, {
                  updatedAt: new Date().toISOString(),
                })
                .then(() => {
                  console.log("[ChatContainer] Conversation timestamp updated");
                })
                .catch((error) => {
                  console.error("[ChatContainer] Failed to update conversation:", error);
                });
            } else {
              fullContent += chunk;
              if (shouldDisplay) {
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === messageId ? { ...msg, content: fullContent } : msg))
                );
              }
            }
          },
          apiKey,
          controller
        );
      } catch (error) {
        abortControllerRef.current = null;
        console.error("[ChatContainer] Error in AI response:", error);

        if (shouldDisplay && !reuseMessageId) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        } else if (shouldDisplay) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: initialContent ?? msg.initialContent ?? msg.content,
                    stage: previousStage ?? msg.stage,
                    stageLabel: previousStageLabel ?? msg.stageLabel,
                    authorLabel: previousAuthorLabel ?? msg.authorLabel,
                  }
                : msg
            )
          );
        }

        let description = "Failed to get AI response";
        if (error instanceof DOMException && error.name === "AbortError") {
          description =
            provider === "ollama"
              ? "Unable to reach Ollama. Ensure it is running locally and accessible."
              : "The request timed out. Please try again.";
        } else if (error instanceof Error && error.message.includes("AI API error (401)")) {
          description = `Authentication failed for ${providerConfig.name}. Verify the API key attached to ${agent.name}.`;
        } else if (error instanceof Error && error.message) {
          description = error.message;
        }

        toast({
          title: "Error",
          description,
          variant: "destructive",
        });

        return null;
      }

      return {
        messageId,
        content: fullContent,
      };
    },
    [conversationId, resolveAgentCredentials, toast]
  );

  const sendPromptToAgents = useCallback(
    async (
      prompt: string,
      agentIds: string[],
      history: ConversationHistoryEntry[],
      options?: SendPromptOptions
    ) => {
      if (agentIds.length === 0) {
        return;
      }

      const participatingAgents = agentIds
        .map((id) => agentById.get(id))
        .filter((agent): agent is Agent => Boolean(agent));

      if (participatingAgents.length === 0) {
        toast({
          title: "No active agents",
          description: "Select at least one available agent before sending a message.",
          variant: "destructive",
        });
        return;
      }

      const { showDeliberation: shouldShowDeliberation = true, onPhaseChange } = options ?? {
        showDeliberation: true,
      };

      const baseHistory = history.map((entry) => ({ ...entry }));
      const rateLimitedProviders = new Set<string>();

      const maybeDelayForAgent = async (agent: Agent) => {
        // Use agent's provider field directly
        const provider = agent.provider;
        if (participatingAgents.length <= 1 || !RATE_LIMIT_PROVIDERS.has(provider)) {
          return;
        }

        if (rateLimitedProviders.has(provider)) {
          await delay(RATE_LIMIT_DELAY_MS);
        } else {
          rateLimitedProviders.add(provider);
        }
      };

      // Filter out aggregator from participating agents - aggregator only used for final aggregation
      const regularAgents = participatingAgents.filter((agent) => !agent.isAggregator);
      const isMultiAgent = regularAgents.length > 1;

      const initialResponses: AgentResponse[] = [];
      const refinedResponses: RefinedResponse[] = [];
      const latestResponses = new Map<string, AgentResponse>();

      if (!shouldShowDeliberation) {
        onPhaseChange?.(isMultiAgent ? "initial" : "final");
      }

      let aggregatorMessageId: string | null = null;
      if (!shouldShowDeliberation && isMultiAgent) {
        aggregatorMessageId = uuidv4();
        aggregatorProgressMessageId.current = aggregatorMessageId;
        const placeholderTimestamp = new Date().toISOString();
        const placeholder: Message = {
          id: aggregatorMessageId,
          conversationId: conversationId || "",
          role: "assistant",
          content: DELIBERATION_STAGE_MESSAGES.initial,
          agentId: undefined,
          timestamp: placeholderTimestamp,
          stage: "final",
          stageLabel: "Final Response (pending)",
          authorLabel: "Aggregator",
          isHidden: false,
        };

        setMessages((prev) => [...prev, placeholder]);

        if (conversationId) {
          db.messages
            .add({ ...placeholder, conversationId })
            .catch((error) =>
              console.error("[ChatContainer] Failed to persist aggregator placeholder:", error)
            );
        }
      } else {
        aggregatorProgressMessageId.current = null;
      }

      // Loop through REGULAR agents only (not aggregator)
      for (const agent of regularAgents) {
        await maybeDelayForAgent(agent);

        const stage: MessageStage = isMultiAgent ? "initial" : "final";
        const stageLabel = isMultiAgent ? "Initial Response" : "Response";
        const suppressDisplay = !shouldShowDeliberation && isMultiAgent;

        const result = await streamAgentResponse({
          agent,
          prompt,
          history: baseHistory.map((entry) => ({ ...entry })),
          stage,
          stageLabel,
          suppressDisplay,
        });

        if (!result) {
          continue;
        }

        const response: AgentResponse = {
          agentId: agent.id,
          agentName: agent.name,
          content: result.content,
          timestamp: new Date().toISOString(),
        };

        initialResponses.push(response);
        latestResponses.set(agent.id, response);

        baseHistory.push({
          role: "assistant",
          content: `${agent.name}: ${result.content}`,
        });
      }

      // If single agent (no multi-agent flow needed), we're done
      if (!isMultiAgent) {
        onPhaseChange?.(null);
        return;
      }

      // =============================================================================
      // DEBATE/REFINEMENT STAGE (Optional - controlled by feature flag)
      // =============================================================================
      // This section implements a sophisticated multi-stage deliberation process
      // where agents review each other's responses and refine their own thinking.
      // When ENABLE_DEBATE_MODE is false, this entire section is skipped for a
      // simpler, faster flow that goes directly to aggregation.
      // =============================================================================

      if (FEATURE_FLAGS.ENABLE_DEBATE_MODE) {
        // Only show refinement phase if debate mode is enabled
        if (!shouldShowDeliberation) {
          onPhaseChange?.("refined");
        }

        // Refinement phase for regular agents only
        for (const agent of regularAgents) {
          const initialResponse = initialResponses.find(
            (response) => response.agentId === agent.id
          );

          if (!initialResponse) {
            continue;
          }

          const otherResponses: AgentResponse[] = regularAgents
            .filter((other) => other.id !== agent.id)
            .map((other) => {
              const latest = latestResponses.get(other.id);
              if (latest) {
                return latest;
              }

              const fallback = initialResponses.find((response) => response.agentId === other.id);
              if (fallback) {
                return fallback;
              }

              return {
                agentId: other.id,
                agentName: other.name,
                content: "",
                timestamp: new Date().toISOString(),
              };
            });

          await maybeDelayForAgent(agent);

          const refinementPrompt = buildRefinementPrompt(
            prompt,
            initialResponse.content,
            otherResponses
          );

          const refinementResult = await streamAgentResponse({
            agent,
            prompt: refinementPrompt,
            history: baseHistory.map((entry) => ({ ...entry })),
            stage: "refined",
            stageLabel: "Refined Response",
            suppressDisplay: !shouldShowDeliberation,
          });

          if (!refinementResult) {
            continue;
          }

          const refined: RefinedResponse = {
            agentId: agent.id,
            agentName: agent.name,
            content: refinementResult.content,
            originalResponse: initialResponse.content,
            timestamp: new Date().toISOString(),
          };

          refinedResponses.push(refined);
          latestResponses.set(agent.id, {
            agentId: agent.id,
            agentName: agent.name,
            content: refinementResult.content,
            timestamp: refined.timestamp,
          });

          baseHistory.push({
            role: "assistant",
            content: `${agent.name}: ${refinementResult.content}`,
          });
        }
      }
      // End of debate/refinement stage

      // =============================================================================
      // AGGREGATION STAGE
      // =============================================================================
      // Synthesize all agent responses (either initial or refined) into final answer
      // =============================================================================

      // Prepare aggregation inputs from regular agents only
      const aggregationInputs: RefinedResponse[] = regularAgents.map((agent) => {
        const refined = refinedResponses.find((response) => response.agentId === agent.id);
        if (refined) {
          return refined;
        }

        const initial = initialResponses.find((response) => response.agentId === agent.id);
        if (initial) {
          return {
            agentId: initial.agentId,
            agentName: initial.agentName,
            content: initial.content,
            originalResponse: initial.content,
            timestamp: initial.timestamp,
          };
        }

        return {
          agentId: agent.id,
          agentName: agent.name,
          content: "",
          originalResponse: "",
          timestamp: new Date().toISOString(),
        };
      });

      // Get the aggregator agent from database (system agent)
      const aggregatorAgent = await getAggregatorAgent();

      if (!aggregatorAgent) {
        console.error("[ChatContainer] Aggregator agent not found!");
        toast({
          title: "Configuration Error",
          description: "Aggregator agent not found. Please configure it in Settings.",
          variant: "destructive",
        });
        return;
      }

      await maybeDelayForAgent(aggregatorAgent);

      const aggregationPrompt = buildAggregationPrompt(prompt, aggregationInputs);

      onPhaseChange?.("final");

      const aggregationResult = await streamAgentResponse({
        agent: aggregatorAgent,
        prompt: aggregationPrompt,
        history: baseHistory.map((entry) => ({ ...entry })),
        stage: "final",
        stageLabel: "Final Response",
        displayAgentId: null,
        reuseMessageId: aggregatorProgressMessageId.current ?? undefined,
        initialContent: aggregatorProgressMessageId.current
          ? DELIBERATION_STAGE_MESSAGES.final
          : undefined,
        authorLabel: "Aggregator",
        systemPromptOverride:
          aggregatorAgent.persona ||
          "You are Aggregator, a neutral synthesis expert. Resolve disagreements, weave together the strongest evidence, and speak directly to the user in natural language without referencing the underlying debate or individual agents.",
      });

      if (aggregationResult) {
        baseHistory.push({
          role: "assistant",
          content: `Final Response: ${aggregationResult.content}`,
        });
      }

      onPhaseChange?.(null);
      aggregatorProgressMessageId.current = null;
    },
    [agentById, streamAgentResponse, toast, conversationId]
  );

  // Process initial message from home page
  useEffect(() => {
    if (
      !initialMessage ||
      initialMessageProcessed.current ||
      selectedAgentIds.length === 0 ||
      !conversationId
    ) {
      return;
    }

    const processInitialMessage = async () => {
      initialMessageProcessed.current = true;

      try {
        console.log("[ChatContainer] Processing initial message for conversation:", conversationId);

        const existingMessageCount = await db.messages
          .where("conversationId")
          .equals(conversationId)
          .count();

        console.log("[ChatContainer] Existing message count:", existingMessageCount);

        if (existingMessageCount > 0) {
          console.log(
            "[ChatContainer] Messages already exist, skipping initial message processing"
          );
          return;
        }

        const conversation = await waitForConversation(conversationId, 15);
        if (!conversation) {
          console.warn("[ChatContainer] Conversation not found for initial message");
        } else {
          console.log("[ChatContainer] Conversation found:", conversation);
        }

        const now = new Date().toISOString();

        const userMessageId = uuidv4();
        const userMessage: Message = {
          id: userMessageId,
          conversationId,
          role: "user",
          content: initialMessage,
          timestamp: now,
        };

        const historyBeforePrompt = buildConversationHistory(messages);
        const targetAgentIds = [...selectedAgentIds];

        setMessages((prev) => [...prev, userMessage]);
        setIsSending(true);

        console.log("[ChatContainer] Adding user message to DB:", userMessage);
        await db.messages.add(userMessage);
        console.log("[ChatContainer] User message added successfully");

        await db.conversations.update(conversationId, {
          updatedAt: now,
          agentIds: targetAgentIds,
        });
        console.log("[ChatContainer] Conversation updated with agentIds");

        router.replace(`/chat/${conversationId}`, { scroll: false });

        await sendPromptToAgents(initialMessage, targetAgentIds, historyBeforePrompt, {
          showDeliberation,
          onPhaseChange: onDeliberationPhaseChange,
        });
      } catch (error) {
        console.error("[ChatContainer] Error processing initial message:", error);
        initialMessageProcessed.current = false; // allow retry if initial processing fails
      } finally {
        setIsSending(false);
      }
    };

    processInitialMessage();
  }, [
    buildConversationHistory,
    conversationId,
    initialMessage,
    messages,
    onDeliberationPhaseChange,
    router,
    selectedAgentIds,
    sendPromptToAgents,
    showDeliberation,
    waitForConversation,
  ]);

  const handleToggleAgentSelection = useCallback(
    (agent: Agent) => {
      setSelectedAgentIds((prev) => {
        const isAlreadySelected = prev.includes(agent.id);
        if (isAlreadySelected) {
          return prev.filter((id) => id !== agent.id);
        }

        return enforceAgentLimit([...prev, agent.id]);
      });
    },
    [enforceAgentLimit]
  );

  const handleApplyCombination = (combination: AgentCombination) => {
    const agentIdSet = new Set(agents.map((agent) => agent.id));
    const validAgentIds = combination.agentIds.filter((id) => agentIdSet.has(id));

    if (validAgentIds.length === 0) {
      toast({
        title: "Agents unavailable",
        description: "None of the agents in this combination exist anymore.",
        variant: "destructive",
      });
      return;
    }

    const uniqueValidIds = Array.from(new Set(validAgentIds));
    const limitedAgentIds = uniqueValidIds.slice(0, MAX_AGENTS_PER_CONVERSATION);
    const trimmedByLimit = limitedAgentIds.length < uniqueValidIds.length;

    setSelectedAgentIds(limitedAgentIds);

    const missingCount = combination.agentIds.length - validAgentIds.length;
    const messages: string[] = [];

    if (missingCount > 0) {
      messages.push(
        `${limitedAgentIds.length} agent${limitedAgentIds.length > 1 ? "s" : ""} applied (${missingCount} missing).`
      );
    } else {
      messages.push(
        limitedAgentIds.length === uniqueValidIds.length
          ? "All agents from the combination are now selected."
          : `${limitedAgentIds.length} agent${limitedAgentIds.length > 1 ? "s" : ""} applied.`
      );
    }

    if (trimmedByLimit) {
      messages.push(
        `Only the first ${MAX_AGENTS_PER_CONVERSATION} agents were applied due to the per-conversation limit.`
      );
    }

    toast({
      title: "Combination applied",
      description: messages.join(" "),
    });
  };

  const handleCreateAgent = async (data: AgentInput) => {
    try {
      setIsSubmitting(true);
      const newAgent = await createAgent(data);

      toast({
        title: "Agent created",
        description: `${data.name} has been created successfully.`,
      });

      setIsAgentDialogOpen(false);
      setEditingAgent(null);
      setSelectedAgentIds([newAgent.id]);
    } catch (err) {
      console.error("[ChatContainer] Error creating agent:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAgent = async (data: AgentInput) => {
    if (!editingAgent) return;

    try {
      setIsSubmitting(true);
      await updateAgent(editingAgent.id, data);

      toast({
        title: "Agent updated",
        description: `${data.name} has been updated successfully.`,
      });

      setIsAgentDialogOpen(false);
      setEditingAgent(null);
    } catch (err) {
      console.error("[ChatContainer] Error updating agent:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!editingAgent) return;

    try {
      await deleteAgent(editingAgent.id);

      toast({
        title: "Agent deleted",
        description: `${editingAgent.name} has been deleted.`,
      });

      setIsAgentDialogOpen(false);
      setEditingAgent(null);

      setSelectedAgentIds((prev) => prev.filter((id) => id !== editingAgent.id));
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  // Function to open edit agent dialog
  const handleOpenEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsAgentDialogOpen(true);
  };

  const handleCloseAgentDialog = () => {
    setIsAgentDialogOpen(false);
    setEditingAgent(null);
  };

  const handleSaveCombination = async () => {
    if (selectedAgentIds.length === 0) {
      toast({
        title: "No agents selected",
        description: "Please select at least one agent to save a combination",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingCombination(true);
      const agentNames = selectedAgentIds
        .map((id) => agents.find((a) => a.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      const displayName = agentNames || "Untitled combination";

      await saveCombination({
        name: displayName,
        agentIds: selectedAgentIds,
      });

      toast({
        title: "Combination saved",
        description: `Agent combination "${displayName}" has been saved.`,
      });
    } catch (error) {
      console.error("[ChatContainer] Error saving combination:", error);
      toast({
        title: "Error",
        description: "Failed to save agent combination",
        variant: "destructive",
      });
    } finally {
      setIsSavingCombination(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
      toast({
        title: "Generation stopped",
        description: "The AI response generation has been stopped.",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedAgentIds.length === 0) {
      toast({
        title: "No agent selected",
        description: "Please select at least one agent first",
        variant: "destructive",
      });
      return;
    }

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const messageContent = formData.get("message") as string;

    if (!messageContent.trim()) return;

    // Sanitize message content to prevent XSS
    const sanitizedMessage = sanitizeInput(messageContent.trim());

    // If we're on home page, create conversation and redirect
    if (!conversationId) {
      const newConversationId = uuidv4();
      const now = new Date().toISOString();
      const params = new URLSearchParams();
      params.set("initialMessage", sanitizedMessage);
      if (selectedAgentIds.length > 0) {
        params.set("selectedAgents", selectedAgentIds.join(","));
      }
      if (pendingProjectId) {
        params.set("projectId", pendingProjectId);
      }

      // Redirect immediately so the chat route can take over
      router.push(`/chat/${newConversationId}?${params.toString()}`);

      try {
        await db.conversations.add({
          id: newConversationId,
          title: generateConversationTitle(sanitizedMessage),
          createdAt: now,
          updatedAt: now,
          agentIds: selectedAgentIds,
          projectId: pendingProjectId ?? undefined,
        });
        setPendingProjectId(null);
      } catch (error) {
        console.error("[ChatContainer] Failed to persist new conversation:", error);
        toast({
          title: "Failed to start chat",
          description: "We could not save this conversation locally. Please try again.",
          variant: "destructive",
        });
      }

      return;
    }

    // We're in a chat page, send message normally
    try {
      setIsSending(true);
      const now = new Date().toISOString();

      const targetAgentIds = [...selectedAgentIds];
      const historyBeforePrompt = buildConversationHistory(messages);
      const isFirstMessage = messages.length === 0;

      // Add user message to state immediately
      const userMessageId = uuidv4();
      const userMessage: Message = {
        id: userMessageId,
        conversationId,
        role: "user",
        content: sanitizedMessage,
        timestamp: now,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Clear input immediately
      formRef.current?.reset();

      // Persist the user message and updated metadata before orchestrating
      try {
        await db.transaction("rw", db.messages, db.conversations, async () => {
          await db.messages.add(userMessage);
          const conversationUpdates: Partial<Conversation> = {
            updatedAt: now,
            agentIds: targetAgentIds,
          };
          if (isFirstMessage) {
            conversationUpdates.title = generateConversationTitle(sanitizedMessage);
          }
          await db.conversations.update(conversationId, conversationUpdates);
        });
      } catch (persistError) {
        console.error("[ChatContainer] Failed to persist user message:", persistError);
        toast({
          title: "Storage error",
          description: "We could not save this message locally. The chat may reset on refresh.",
          variant: "destructive",
        });
      }

      await sendPromptToAgents(sanitizedMessage, targetAgentIds, historyBeforePrompt, {
        showDeliberation,
        onPhaseChange: onDeliberationPhaseChange,
      });
    } catch (error) {
      console.error("[ChatContainer] Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isComposerFloating = messages.length === 0;
  const canToggleChain = selectedAgentIds.length > 1;

  // Multi-agent mode: more than 1 non-aggregator agent selected
  const isMultiAgentMode = selectedAgentIds.length > 1;

  // Check for aggregator and non-aggregator agents
  const hasAggregator = agents.some((agent) => agent.isAggregator);
  const hasNonAggregatorAgents = agents.some((agent) => !agent.isAggregator);
  const showEmptyState = !hasAggregator || !hasNonAggregatorAgents;

  const visibleMessages = useMemo(() => {
    if (showDeliberation) {
      return messages;
    }

    return messages.filter((message) => !message.isHidden);
  }, [messages, showDeliberation]);
  const isAggregatorPlaceholderActive =
    !showDeliberation && Boolean(aggregatorProgressMessageId.current);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push("/")}>
                  <MessageSquare className="h-4 w-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsSearchDialogOpen(true)}>
                  <Search className="h-4 w-4" />
                  <span>Search conversations...</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="justify-between pr-0">
                <span>Projects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => projectsSidebarRef.current?.openCreateProjectDialog()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ProjectsSidebar ref={projectsSidebarRef} />
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Chat History</SidebarGroupLabel>
              <SidebarGroupContent>
                <ChatHistory />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Header with Agent Selection */}
          <div className="bg-background border-b p-4">
            {showEmptyState ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm">
                      {!hasAggregator && !hasNonAggregatorAgents
                        ? "Setup required: Configure aggregator and create agents"
                        : !hasAggregator
                          ? "Setup required: Configure aggregator in settings"
                          : "Setup required: Create your first agent"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hasAggregator && (
                    <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  )}
                  {!hasNonAggregatorAgents && (
                    <Button variant="default" size="sm" onClick={() => setIsAgentDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Agent
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />

                  {/* Aggregator Agent (Separate on the left) */}
                  {agents.find((a) => a.isAggregator) && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const aggregator = agents.find((a) => a.isAggregator)!;
                        const isSelected = selectedAgentIds.includes(aggregator.id);
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className="gap-2"
                                disabled
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  // Open dropdown on right-click
                                  e.currentTarget.click();
                                }}
                              >
                                <Bot className="h-4 w-4" />
                                {aggregator.name}
                                <span className="text-xs opacity-70">🤖</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleOpenEditAgent(aggregator)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit {aggregator.name}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                      <div className="bg-border h-6 w-px" />
                    </div>
                  )}

                  {/* Regular Agents Selection */}
                  <div className="flex flex-1 items-center gap-2">
                    <ButtonGroup>
                      {agents
                        .filter((a) => !a.isAggregator)
                        .map((agent) => {
                          const isSelected = selectedAgentIds.includes(agent.id);
                          
                          return (
                            <AgentButton
                              key={agent.id}
                              agent={agent}
                              isSelected={isSelected}
                              onSelect={handleToggleAgentSelection}
                              onEdit={handleOpenEditAgent}
                              onDelete={(agent) => {
                                setEditingAgent(agent);
                                handleDeleteAgent();
                              }}
                            />
                          );
                        })}
                    </ButtonGroup>
                  </div>

                  {/* Action Buttons */}
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
                                  {combination.agentIds.length === 1 ? "" : "s"}
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
                      onClick={() => {
                        setEditingAgent(null);
                        setIsAgentDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Multi-Agent Mode Indicator */}
                {isMultiAgentMode && (
                  <div className="bg-primary/10 border-primary/20 flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <Sparkles className="text-primary h-3.5 w-3.5" />
                    <span className="text-primary text-xs font-medium">
                      Multi-Agent Mode Active
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">
                      Aggregator auto-enabled ({selectedAgentIds.length} agents selected)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Messages Area */}
          <div
            ref={messageContainerRef}
            className={cn("relative flex-1 overflow-y-auto p-4", !isComposerFloating && "pb-32")}
          >
            {showScrollToBottom && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute top-6 right-6 z-10 shadow-sm"
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                {showEmptyState ? (
                  <EmptyState 
                    onCreateAgent={() => setIsAgentDialogOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    hasAggregator={hasAggregator}
                    hasAgents={hasNonAggregatorAgents}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    Start a new conversation by typing a message below
                  </p>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-6">
                {hasMoreMessages && (
                  <div className="flex justify-center py-2">
                    {isLoadingOlderMessages ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          void loadOlderMessages();
                        }}
                        disabled={isLoadingOlderMessages}
                      >
                        Load earlier messages
                      </Button>
                    )}
                  </div>
                )}
                {visibleMessages.map((message) => {
                  const agentName = message.agentId 
                    ? agents.find((a) => a.id === message.agentId)?.name 
                    : undefined;
                  
                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      agentName={agentName}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {!showDeliberation &&
              deliberationStatus &&
              !isAggregatorPlaceholderActive &&
              selectedAgentIds.length > 1 && (
                <div className="mx-auto mt-6 max-w-4xl">
                  <div className="bg-muted/60 text-muted-foreground flex items-start gap-3 rounded-lg border p-4 text-sm">
                    <Loader2 className="text-primary mt-1 h-4 w-4 animate-spin" />
                    <div>
                      <div className="text-muted-foreground/80 text-xs font-semibold tracking-wide uppercase">
                        {deliberationStatus.stage === "initial"
                          ? "Initial Responses"
                          : deliberationStatus.stage === "refined"
                            ? "Refinement Phase"
                            : "Final Response"}
                      </div>
                      <p className="text-muted-foreground mt-1 animate-pulse">
                        {deliberationStatus.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Input Area - Only show when both aggregator and agents exist */}
          {!showEmptyState && (
            <div
              className={cn(
                "p-4 transition-all duration-300",
                isComposerFloating
                  ? "pointer-events-none absolute top-1/2 left-1/2 z-20 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2"
                  : "bg-background border-t"
              )}
            >
            <div
              className={cn(
                "mx-auto w-full max-w-4xl",
                isComposerFloating &&
                  "bg-background/95 pointer-events-auto rounded-2xl border p-6 shadow-2xl backdrop-blur"
              )}
            >
              <form ref={formRef} onSubmit={handleSendMessage} className="space-y-3">
                {canToggleChain && (
                  <>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="font-medium">Response Controls</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span>Show agent chain of thought</span>
                        <Switch
                          checked={showDeliberation}
                          onCheckedChange={setShowDeliberation}
                          disabled={isSending}
                          aria-label="Toggle agent deliberation visibility"
                        />
                      </div>
                    </div>
                    {isMultiAgentMode && (
                      <p className="text-primary text-[11px]">
                        ⚡ Multi-agent mode active: Aggregator is automatically enabled. Toggle
                        above to show/hide agent reasoning steps.
                      </p>
                    )}
                    {!showDeliberation && (
                      <p className="text-muted-foreground text-[11px]">
                        Agent reasoning is hidden. Only the final answer will be shown. Progress
                        updates appear in the status indicator above.
                      </p>
                    )}
                  </>
                )}
                <div className="flex items-end gap-2">
                  <TextareaAutosize
                    name="message"
                    placeholder="Type your message... (Press Enter to send, Shift+Enter for new line, Cmd/Ctrl+Enter to send)"
                    className="flex-1"
                    disabled={agents.length === 0 || isSending}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        formRef.current?.requestSubmit();
                      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        formRef.current?.requestSubmit();
                      }
                    }}
                  />
                  {isSending ? (
                    <Button
                      type="button"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      variant="destructive"
                      onClick={handleStopGeneration}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      disabled={agents.length === 0 || isSending || selectedAgentIds.length === 0}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
              {agents.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-center text-xs">
                  Create an agent to start chatting
                </p>
              ) : selectedAgentIds.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-center text-xs">
                  Select at least one agent to start chatting
                </p>
              ) : null}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Create/Edit Agent Dialog */}
      <Dialog open={isAgentDialogOpen} onOpenChange={handleCloseAgentDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
            <DialogDescription>
              {editingAgent
                ? "Update your agent configuration or delete it"
                : "Configure a new AI agent with your preferred provider and model"}
            </DialogDescription>
          </DialogHeader>
          <AgentFormDialogContent
            agent={editingAgent || undefined}
            onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
            onDelete={editingAgent ? handleDeleteAgent : undefined}
            isSubmitting={isSubmitting}
            agentCombinations={combinations}
            onApplyCombination={(combination) => {
              handleApplyCombination(combination);
              setEditingAgent(null);
              setIsAgentDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Conversations</DialogTitle>
            <DialogDescription>
              Find your past conversations by title
            </DialogDescription>
          </DialogHeader>
          <SearchConversations onSelect={() => setIsSearchDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
