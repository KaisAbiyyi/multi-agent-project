/**
 * Agent Form Component
 * Form for creating and editing agents
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateAgentSchema, AgentInput } from "@/types/schemas";
import { Agent, AIProvider, AIModel } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonaSelector } from "./persona-selector";
import { Loader2, Server, Globe, Zap } from "lucide-react";
import { useAPIKeys } from "@/hooks/use-api-keys";
import { useState, useEffect, useMemo } from "react";
import { fetchOllamaModels, fetchOpenRouterModels, fetchLLM7Models } from "@/services/api/model-service";
import { sanitizeInput } from "@/lib/security";
import { Slider } from "@/components/ui/slider";
import {
  MIN_CONTEXT_WINDOW,
  getContextStep,
  normalizeContextWindow,
  coerceContextWindow,
  OLLAMA_DEFAULT_CONTEXT_WINDOW,
  OLLAMA_MAX_CONTEXT_WINDOW,
} from "@/lib/context-window";

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

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: AgentInput) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AgentForm({ agent, onSubmit, onCancel, isSubmitting = false }: AgentFormProps) {
  const { apiKeys } = useAPIKeys();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(agent?.provider || "ollama");
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const form = useForm<AgentInput>({
    resolver: zodResolver(CreateAgentSchema),
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description || "",
          persona: agent.persona,
          provider: agent.provider,
          modelId: agent.modelId,
          apiKeyId: agent.apiKeyId,
          contextWindow: agent.contextWindow,
        }
      : {
          name: "",
          description: "",
          persona: "",
          provider: "ollama",
          modelId: "",
          apiKeyId: "",
          contextWindow: undefined,
        },
  });

  // Load models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        let models: AIModel[] = [];
        
        if (selectedProvider === "ollama") {
          models = await fetchOllamaModels();
        } else if (selectedProvider === "openrouter") {
          const apiKey = apiKeys.find(k => k.provider === "openrouter")?.key;
          if (apiKey) {
            models = await fetchOpenRouterModels(apiKey);
          }
        } else if (selectedProvider === "llm7") {
          const apiKey = apiKeys.find(k => k.provider === "llm7")?.key;
          models = await fetchLLM7Models(apiKey);
        }
        
        setAvailableModels(models);
        
        // Reset model selection if current model is not available in new provider
        const currentModelId = form.getValues("modelId");
        if (currentModelId && !models.find(m => m.id === currentModelId)) {
          form.setValue("modelId", "");
        }
      } catch (error) {
        console.error("Error loading models:", error);
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedProvider, apiKeys, form]);

  const handlePersonaSelect = (persona: string) => {
    form.setValue("persona", persona);
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    form.setValue("provider", provider);
    form.setValue("modelId", ""); // Reset model when provider changes
    form.setValue("apiKeyId", ""); // Reset API key when provider changes
    if (provider !== "ollama") {
      form.setValue("contextWindow", undefined);
    }
  };

  const handleSubmit = async (data: AgentInput) => {
    // Sanitize all text inputs to prevent XSS
    const sanitizedData: AgentInput = {
      name: sanitizeInput(data.name),
      description: data.description ? sanitizeInput(data.description) : "",
      persona: sanitizeInput(data.persona || ""),
      provider: data.provider,
      modelId: data.modelId,
      apiKeyId: data.apiKeyId,
      contextWindow: data.provider === "ollama" ? data.contextWindow : undefined,
    };

    // For aggregator, only submit provider, model, and apiKey
    if (agent?.isAggregator) {
      const aggregatorData: AgentInput = {
        name: agent.name, // Keep existing name
        description: agent.description || "", // Keep existing description
        persona: agent.persona, // Keep existing persona
        provider: sanitizedData.provider,
      modelId: sanitizedData.modelId,
      apiKeyId: sanitizedData.apiKeyId,
      contextWindow: sanitizedData.contextWindow,
    };
      await onSubmit(aggregatorData);
    } else {
      await onSubmit(sanitizedData);
    }
  };

  const watchModelId = form.watch("modelId");
  const watchContextWindow = form.watch("contextWindow");

  const selectedModel = useMemo(
    () => availableModels.find((model) => model.id === watchModelId),
    [availableModels, watchModelId]
  );

  const contextMax = useMemo(() => {
    if (!selectedModel) {
      return selectedProvider === "ollama" ? OLLAMA_MAX_CONTEXT_WINDOW : null;
    }

    const rawMaxSource = selectedModel.maxContextWindow ?? selectedModel.contextWindow;
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

  // Get available API keys for selected provider
  const providerApiKeys = apiKeys.filter(k => k.provider === selectedProvider && k.isActive);
  const providerInfo = PROVIDER_INFO[selectedProvider];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Aggregator Notice - Show first for aggregator */}
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
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Developer, Content Writer" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your agent (letters, numbers, spaces, hyphens, and
                    underscores only)
                  </FormDescription>
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
                    <Textarea
                      placeholder="Brief description of this agent's purpose and capabilities"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}        {/* Persona Configuration - Hide for aggregator */}
        {!agent?.isAggregator && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Persona & Instructions</h3>
              <PersonaSelector onSelect={handlePersonaSelect} />
            </div>

            <FormField
              control={form.control}
              name="persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt / Persona (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful assistant who..."
                      rows={10}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define the agent&apos;s role, expertise, and behavior. Be specific about how it
                    should respond.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Model & API Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Model Configuration</h3>

          {/* Provider Selection */}
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Provider *</FormLabel>
                <Select onValueChange={handleProviderChange} defaultValue={field.value}>
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

          {/* Model Selection */}
          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Model *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={isLoadingModels || availableModels.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingModels 
                          ? "Loading models..." 
                          : availableModels.length === 0 
                          ? `No models available for ${providerInfo.name}` 
                          : "Select a model"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.displayName}</span>
                          {model.contextWindow && (
                            <span className="text-xs text-muted-foreground">
                              Default {model.contextWindow.toLocaleString()} tokens
                              {model.maxContextWindow && model.maxContextWindow !== model.contextWindow
                                ? ` • Max ${model.maxContextWindow.toLocaleString()} tokens`
                                : ""}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {selectedProvider === "ollama" && selectedModel && contextMax && sliderValue !== null && (
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
                    Model supports up to {contextMax.toLocaleString()} tokens. Adjust the context window to balance recall and performance.
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
                  <FormLabel>API Key *</FormLabel>
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

        {/* Form Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agent ? "Update Agent" : "Create Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
