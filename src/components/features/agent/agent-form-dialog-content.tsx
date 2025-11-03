'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Agent, AIModel, AgentCombination, AIProvider } from '@/types';
import { AgentSchema, type AgentInput } from '@/types/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Trash2, Server, Globe, Zap } from 'lucide-react';
import { fetchOllamaModels, fetchOpenRouterModels, fetchLLM7Models } from '@/services/api/model-service';
import { useAPIKeys } from '@/hooks/use-api-keys';
import { PersonaSelector } from './persona-selector';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  MIN_CONTEXT_WINDOW,
  getContextStep,
  normalizeContextWindow,
  coerceContextWindow,
  OLLAMA_DEFAULT_CONTEXT_WINDOW,
  OLLAMA_MAX_CONTEXT_WINDOW,
} from '@/lib/context-window';

const PROVIDER_INFO = {
  ollama: {
    name: "Ollama",
    description: "Local AI models",
    icon: Server,
    requiresApiKey: false,
  },
  openrouter: {
    name: "OpenRouter",
    description: "Multiple AI models",
    icon: Globe,
    requiresApiKey: true,
  },
  llm7: {
    name: "LLM7",
    description: "LLM7 models (key optional)",
    icon: Zap,
    requiresApiKey: false,
  },
} as const;

interface AgentFormDialogContentProps {
  agent?: Agent;
  onSubmit: (data: AgentInput) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  agentCombinations?: AgentCombination[];
  onApplyCombination?: (combination: AgentCombination) => void;
}

export function AgentFormDialogContent({
  agent,
  onSubmit,
  onDelete,
  isSubmitting = false,
  agentCombinations,
  onApplyCombination,
}: AgentFormDialogContentProps) {
  const { apiKeys } = useAPIKeys();
  
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(agent?.provider || "ollama");
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>('');
  const [openRouterFreeOnly, setOpenRouterFreeOnly] = useState(true);

  const form = useForm<AgentInput>({
    resolver: zodResolver(AgentSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: agent || {
      name: '',
      description: '',
      persona: '',
      provider: 'ollama',
      modelId: '',
      apiKeyId: undefined,
      contextWindow: undefined,
    },
  });

  // Load models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      setModelError(null);
      
      try {
        let fetchedModels: AIModel[] = [];
        
        if (selectedProvider === "ollama") {
          fetchedModels = await fetchOllamaModels();
        } else if (selectedProvider === "openrouter") {
          const apiKey = apiKeys.find(k => k.provider === "openrouter" && k.isActive)?.key;
          if (apiKey) {
            fetchedModels = await fetchOpenRouterModels(apiKey, { freeOnly: openRouterFreeOnly });
          } else {
            setModelError("Please add an OpenRouter API key in Settings");
          }
        } else if (selectedProvider === "llm7") {
          const apiKey = apiKeys.find(k => k.provider === "llm7" && k.isActive)?.key;
          fetchedModels = await fetchLLM7Models(apiKey);
        }
        
        setModels(fetchedModels);
        
        // Reset model selection if current model is not available in new provider
        const currentModelId = form.getValues("modelId");
        if (currentModelId && !fetchedModels.find(m => m.id === currentModelId)) {
          form.setValue("modelId", "");
        }
      } catch (error) {
        console.error("Error loading models:", error);
        setModelError("Failed to load models");
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedProvider, apiKeys, form, openRouterFreeOnly]);

  useEffect(() => {
    if (!agentCombinations || agentCombinations.length === 0) {
      setSelectedCombinationId('');
      return;
    }

    setSelectedCombinationId((prev) => prev || agentCombinations[0]?.id || '');
  }, [agentCombinations]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    form.setValue("provider", provider);
    form.setValue("modelId", ""); // Reset model when provider changes
    form.setValue("apiKeyId", ""); // Reset API key when provider changes
    if (provider !== "ollama") {
      form.setValue("contextWindow", undefined);
    }
  };

  const handleSubmit = (data: AgentInput) => {
    // For aggregator, only submit provider, model, and apiKey
    if (agent?.isAggregator) {
      const aggregatorData: AgentInput = {
        name: agent.name, // Keep existing name
        description: agent.description || "", // Keep existing description
        persona: agent.persona, // Keep existing persona
        provider: data.provider,
        modelId: data.modelId,
        apiKeyId: data.apiKeyId,
        contextWindow: data.provider === "ollama" ? data.contextWindow : undefined,
      };
      onSubmit(aggregatorData);
    } else {
      onSubmit(data);
    }
  };

  // Get available API keys for selected provider
  const providerApiKeys = apiKeys.filter(k => k.provider === selectedProvider && k.isActive);
  const providerInfo = PROVIDER_INFO[selectedProvider];

  const watchModelId = form.watch("modelId");
  const watchContextWindow = form.watch("contextWindow");

  const selectedModel = useMemo(
    () => models.find((model) => model.id === watchModelId),
    [models, watchModelId]
  );

  const contextMax = useMemo(() => {
    if (!selectedModel) {
      return selectedProvider === "ollama" ? OLLAMA_MAX_CONTEXT_WINDOW : null;
    }

    const rawMaxSource =
      selectedModel.maxContextWindow ?? selectedModel.contextWindow;

    const coerced = coerceContextWindow(rawMaxSource);

    if (!coerced) {
      return selectedProvider === "ollama" ? OLLAMA_MAX_CONTEXT_WINDOW : null;
    }

    if (selectedProvider === "ollama") {
      return Math.min(
        OLLAMA_MAX_CONTEXT_WINDOW,
        Math.max(coerced, OLLAMA_DEFAULT_CONTEXT_WINDOW)
      );
    }

    return coerced;
  }, [selectedModel, selectedProvider]);

  const contextStep = useMemo(() => {
    return contextMax ? getContextStep(contextMax) : getContextStep(MIN_CONTEXT_WINDOW);
  }, [contextMax]);

  const contextMin = useMemo(() => {
    if (!contextMax) {
      return MIN_CONTEXT_WINDOW;
    }

    const effectiveMin =
      selectedProvider === "ollama"
        ? Math.max(contextStep, OLLAMA_DEFAULT_CONTEXT_WINDOW)
        : Math.max(contextStep, MIN_CONTEXT_WINDOW);

    return Math.min(contextMax, effectiveMin);
  }, [contextMax, contextStep, selectedProvider]);

  useEffect(() => {
    if (selectedProvider !== "ollama") {
      form.setValue("contextWindow", undefined);
      return;
    }

    if (!contextMax) {
      return;
    }

    const current = coerceContextWindow(form.getValues("contextWindow"));
    const defaultTarget =
      selectedProvider === "ollama"
        ? Math.min(
            contextMax,
            coerceContextWindow(selectedModel?.contextWindow) ?? OLLAMA_DEFAULT_CONTEXT_WINDOW
          )
        : coerceContextWindow(selectedModel?.contextWindow) ?? contextMax;
    const normalized = normalizeContextWindow(
      current ?? defaultTarget,
      contextMax,
      contextStep,
      contextMin
    );

    if (current !== normalized) {
      form.setValue("contextWindow", normalized);
    }
  }, [selectedProvider, selectedModel, contextMax, contextStep, contextMin, form, watchModelId]);

  const sliderValue = useMemo(() => {
    if (selectedProvider !== "ollama" || !contextMax) {
      return null;
    }

    const fallback =
      selectedProvider === "ollama"
        ? Math.min(
            contextMax,
            coerceContextWindow(selectedModel?.contextWindow) ?? OLLAMA_DEFAULT_CONTEXT_WINDOW
          )
        : coerceContextWindow(selectedModel?.contextWindow) ?? contextMax;
    return normalizeContextWindow(
      coerceContextWindow(watchContextWindow) ?? fallback,
      contextMax,
      contextStep,
      contextMin
    );
  }, [selectedProvider, selectedModel, contextMax, contextStep, contextMin, watchContextWindow]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {agentCombinations &&
          agentCombinations.length > 0 &&
          !agent &&
          onApplyCombination && (
            <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
              <div>
                <h3 className="text-sm font-medium">Import a saved agent combination</h3>
                <p className="text-xs text-muted-foreground">
                  Apply a preset selection of agents to this chat without recreating them.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={selectedCombinationId}
                  onValueChange={setSelectedCombinationId}
                >
                  <SelectTrigger className="sm:w-64">
                    <SelectValue placeholder="Choose a combination" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentCombinations.map((combination) => (
                      <SelectItem key={combination.id} value={combination.id}>
                        {combination.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedCombinationId}
                  onClick={() => {
                    const combination = agentCombinations.find(
                      (item) => item.id === selectedCombinationId
                    );
                    if (combination) {
                      onApplyCombination(combination);
                    }
                  }}
                >
                  Apply Combination
                </Button>
              </div>
            </div>
          )}

        {/* Aggregator Notice */}
        {agent?.isAggregator && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <p className="text-sm font-semibold text-primary">System Aggregator Agent</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This is the system aggregator that synthesizes responses from multiple agents. 
              Its name, description, and persona are fixed and optimized for aggregation. 
              You can only configure the <strong>provider</strong>, <strong>model</strong>, 
              and <strong>API key</strong> for this agent.
            </p>
          </div>
        )}

        {/* Basic Information - Hide for aggregator */}
        {!agent?.isAggregator && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Basic Information</h3>
              <p className="text-sm text-muted-foreground">
                Define your agent&apos;s identity and purpose
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Expert in TypeScript and React"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>A brief description of the agent&apos;s role</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Persona - Hide for aggregator */}
        {!agent?.isAggregator && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Persona & Instructions (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Define how your agent should behave and respond
                </p>
              </div>
              <PersonaSelector
                onSelect={(persona) => {
                  form.setValue('persona', persona);
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt / Persona (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful AI assistant..."
                      className="min-h-32 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The system prompt that defines your agent&apos;s behavior (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Provider & Model Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Choose your AI provider and model
            </p>
          </div>

          {/* Provider Selection */}
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Provider</FormLabel>
                <Select onValueChange={handleProviderChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((provider) => {
                      const info = PROVIDER_INFO[provider];
                      const Icon = info.icon;
                      return (
                        <SelectItem key={provider} value={provider}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{info.name}</span>
                            <span className="text-muted-foreground text-xs">- {info.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the AI provider for this agent
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedProvider === 'openrouter' && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-medium">Show free OpenRouter models only</h4>
                <p className="text-xs text-muted-foreground">
                  Toggle off to display the full catalog, including paid models.
                </p>
              </div>
              <Switch
                checked={openRouterFreeOnly}
                onCheckedChange={(checked) => setOpenRouterFreeOnly(checked)}
                aria-label="Toggle free OpenRouter models"
              />
            </div>
          )}

          {/* Model Selection */}
          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingModels || models.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingModels 
                          ? 'Loading models...' 
                          : models.length === 0 
                          ? `No models available for ${providerInfo.name}` 
                          : 'Select a model'
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingModels ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading models...</span>
                      </div>
                    ) : models.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {modelError || 'No models available'}
                      </div>
                    ) : (
                      models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span>{model.displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              Up to {(model.maxContextWindow ?? model.contextWindow).toLocaleString()} tokens
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {modelError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{modelError}</AlertDescription>
                  </Alert>
                )}
                <FormDescription>
                  {isLoadingModels ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading available models...
                    </span>
                  ) : (
                    `Choose the AI model this agent will use`
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
          )}
        />

        {selectedProvider === 'ollama' && selectedModel && contextMax && sliderValue !== null && (
          <FormField
            control={form.control}
            name="contextWindow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Context Window</FormLabel>
                <div className="flex items-center gap-4">
                  <Slider
                    min={contextMin}
                    max={contextMax}
                    step={contextStep}
                    value={[sliderValue]}
                    onValueChange={(value) => {
                      const rawValue = Array.isArray(value) ? value[0] : value;
                      if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
                        return;
                      }

                      const normalized = normalizeContextWindow(
                        rawValue,
                        contextMax,
                        contextStep,
                        contextMin
                      );
                      field.onChange(normalized);
                    }}
                  />
                  <span className="w-20 text-right text-sm font-medium">
                    {sliderValue.toLocaleString()}
                  </span>
                </div>
                <FormDescription>
                  Model supports up to {contextMax.toLocaleString()} tokens. Tune the working memory for this agent.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* API Key Selection - Only for providers that need it */}
          {providerInfo.requiresApiKey ? (
            <FormField
              control={form.control}
              name="apiKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          providerApiKeys.length === 0 
                            ? `No API keys configured for ${providerInfo.name}` 
                            : "Select an API key"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providerApiKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.name}
                          {key.lastUsed && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Last used: {new Date(key.lastUsed).toLocaleDateString()})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {providerApiKeys.length === 0 ? (
                      <span className="text-yellow-600">
                        Please add an API key for {providerInfo.name} in Settings
                      </span>
                    ) : (
                      `Select the API key to use for this agent`
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="apiKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      // Convert "none" back to undefined for the form
                      field.onChange(value === "none" ? undefined : value);
                    }} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          providerApiKeys.length === 0 
                            ? `No API keys configured (optional for ${providerInfo.name})` 
                            : "Select an API key (optional)"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No API Key</SelectItem>
                      {providerApiKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    API key is optional for {providerInfo.name}
                    {selectedProvider === "llm7" && " (may provide higher rate limits)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Submit and Delete Buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          {agent && onDelete && !agent.isAggregator && (
            <Button 
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Agent
            </Button>
          )}
          <div className="flex-1" />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agent ? 'Update Agent' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
