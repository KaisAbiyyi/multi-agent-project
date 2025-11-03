"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { getAggregatorAgent, updateAggregatorAgent } from '@/lib/db';
import { fetchModelsByProvider } from '@/services/api/model-service';
import { useAPIKeys } from '@/hooks/use-api-keys';
import type { Agent, AIProvider, AIModel } from '@/types';
import { Bot, Loader2, Server, Globe, Zap } from 'lucide-react';
import { AI_PROVIDERS } from '@/constants';
import {
  MIN_CONTEXT_WINDOW,
  getContextStep,
  normalizeContextWindow,
  coerceContextWindow,
  OLLAMA_DEFAULT_CONTEXT_WINDOW,
  OLLAMA_MAX_CONTEXT_WINDOW,
} from '@/lib/context-window';

const PROVIDER_ICONS = {
  ollama: Server,
  openrouter: Globe,
  llm7: Zap,
};

export function AggregatorConfiguration() {
  const { toast } = useToast();
  const { apiKeys } = useAPIKeys();

  const [aggregator, setAggregator] = useState<Agent | null>(null);
  const [provider, setProvider] = useState<AIProvider>('ollama');
  const [modelId, setModelId] = useState<string>('');
  const [apiKeyId, setApiKeyId] = useState<string | undefined>(undefined);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [openRouterFreeOnly, setOpenRouterFreeOnly] = useState(true);
  const [ollamaContextWindow, setOllamaContextWindow] = useState<number | null>(null);

  // Load aggregator agent
  useEffect(() => {
    async function loadAggregator() {
      try {
        const agent = await getAggregatorAgent();
        if (agent) {
          setAggregator(agent);
          setProvider(agent.provider);
          setModelId(agent.modelId);
          setApiKeyId(agent.apiKeyId);
        }
      } catch (error) {
        console.error('Failed to load aggregator:', error);
        toast({
          title: 'Error',
          description: 'Failed to load aggregator configuration',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadAggregator();
  }, [toast]);

  useEffect(() => {
    if (provider !== 'ollama') {
      setOllamaContextWindow(null);
    }
  }, [provider]);

  // Load models when provider changes
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true);
      try {
        const selectedApiKey = apiKeys.find(
          (key) => key.provider === provider && key.id === apiKeyId
        );
        const fetchedModels = await fetchModelsByProvider(
          provider,
          selectedApiKey?.key,
          provider === 'openrouter' ? { freeOnly: openRouterFreeOnly } : {}
        );
        setModels(fetchedModels);
        
        // Reset model selection if current model is not in the new list
        if (modelId && !fetchedModels.some((m) => m.id === modelId)) {
          setModelId('');
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    }

    loadModels();
  }, [provider, apiKeyId, apiKeys, modelId, openRouterFreeOnly]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId),
    [models, modelId]
  );

  const contextSliderMax = useMemo(() => {
    if (!selectedModel) return null;
    const rawMaxSource =
      selectedModel.maxContextWindow ?? selectedModel.contextWindow;
    const coerced = coerceContextWindow(rawMaxSource);
    if (!coerced) {
      return null;
    }
    if (provider === 'ollama') {
      return Math.min(
        OLLAMA_MAX_CONTEXT_WINDOW,
        Math.max(coerced, OLLAMA_DEFAULT_CONTEXT_WINDOW)
      );
    }
    return coerced;
  }, [selectedModel, provider]);

  const contextStep = useMemo(() => {
    if (!contextSliderMax) {
      return getContextStep(MIN_CONTEXT_WINDOW);
    }
    return getContextStep(contextSliderMax);
  }, [contextSliderMax]);

  const contextSliderMin = useMemo(() => {
    if (!contextSliderMax) {
      return MIN_CONTEXT_WINDOW;
    }
    const effectiveMin =
      provider === 'ollama'
        ? Math.max(contextStep, OLLAMA_DEFAULT_CONTEXT_WINDOW)
        : Math.max(contextStep, MIN_CONTEXT_WINDOW);
    return Math.min(contextSliderMax, effectiveMin);
  }, [contextSliderMax, contextStep, provider]);

  useEffect(() => {
    if (provider !== 'ollama' || !selectedModel || !contextSliderMax) {
      return;
    }

    const shouldPreserveUserValue =
      typeof ollamaContextWindow === 'number' &&
      aggregator?.provider === 'ollama' &&
      aggregator.modelId === selectedModel.id;

    const defaultBaseline =
      provider === 'ollama'
        ? Math.min(
            contextSliderMax,
            coerceContextWindow(selectedModel?.contextWindow) ?? OLLAMA_DEFAULT_CONTEXT_WINDOW
          )
        : coerceContextWindow(selectedModel?.contextWindow) ?? contextSliderMax;
    const baseline = shouldPreserveUserValue
      ? (ollamaContextWindow as number)
      : defaultBaseline;
    const normalized = normalizeContextWindow(
      baseline,
      contextSliderMax,
      contextStep,
      contextSliderMin
    );

    if (!shouldPreserveUserValue || ollamaContextWindow !== normalized) {
      setOllamaContextWindow(normalized);
    }
  }, [
    provider,
    selectedModel,
    aggregator?.provider,
    aggregator?.modelId,
    aggregator?.contextWindow,
    contextSliderMax,
    contextSliderMin,
    contextStep,
    ollamaContextWindow,
  ]);

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setModelId('');
    setApiKeyId(undefined);
    if (newProvider === 'openrouter') {
      setOpenRouterFreeOnly(true);
    }
    setOllamaContextWindow(null);
  };

  const handleSave = async () => {
    if (!modelId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a model',
        variant: 'destructive',
      });
      return;
    }

    // Validate API key requirement
    const providerConfig = AI_PROVIDERS[provider];
    if (providerConfig.requiresAPIKey && !apiKeyId) {
      toast({
        title: 'API Key Required',
        description: `${providerConfig.name} requires an API key. Please select one or add a new key in the API Keys tab.`,
        variant: 'destructive',
      });
      return;
    }

    const contextWindowToPersist =
      provider === 'ollama' && selectedModel && sliderValue !== null
        ? sliderValue
        : undefined;

    setIsSaving(true);
    try {
      const isInitialSetup = !aggregator;

      const updatedAggregator = await updateAggregatorAgent(
        provider,
        modelId,
        apiKeyId,
        contextWindowToPersist
      );

      // Update local state with the returned aggregator
      setAggregator(updatedAggregator);

      // Notify other components that agents have been updated
      window.dispatchEvent(new CustomEvent('agentUpdated'));

      toast({
        title: 'Success',
        description: isInitialSetup 
          ? 'Aggregator configured successfully! You can now create agents and start chatting.' 
          : 'Aggregator configuration updated successfully',
      });
    } catch (error) {
      console.error('Failed to update aggregator:', error);
      toast({
        title: 'Error',
        description: 'Failed to update aggregator configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sliderValue = useMemo(() => {
    if (provider !== 'ollama' || !selectedModel || !contextSliderMax) {
      return null;
    }

    if (typeof ollamaContextWindow === 'number') {
      return ollamaContextWindow;
    }

    const defaultBaseline =
      provider === 'ollama'
        ? Math.min(
            contextSliderMax,
            coerceContextWindow(selectedModel?.contextWindow) ?? OLLAMA_DEFAULT_CONTEXT_WINDOW
          )
        : coerceContextWindow(selectedModel?.contextWindow) ?? contextSliderMax;
    return normalizeContextWindow(
      defaultBaseline,
      contextSliderMax,
      contextStep,
      contextSliderMin
    );
  }, [
    provider,
    selectedModel,
    contextSliderMax,
    ollamaContextWindow,
    contextStep,
    contextSliderMin,
  ]);

  const providerApiKeys = apiKeys.filter((key) => key.provider === provider && key.isActive);
  const hasRequiredApiKey = AI_PROVIDERS[provider].requiresAPIKey ? Boolean(apiKeyId) : true;

  const normalizedPendingContext =
    provider === 'ollama' && selectedModel && contextSliderMax && sliderValue !== null
      ? sliderValue
      : null;

  const normalizedCurrentContext = useMemo(() => {
    if (aggregator?.provider !== 'ollama') {
      return null;
    }

    const coerced = coerceContextWindow(aggregator.contextWindow);

    if (
      aggregator.modelId === modelId &&
      provider === 'ollama' &&
      contextSliderMax
    ) {
      return coerced ?? contextSliderMax;
    }

    return coerced ?? null;
  }, [aggregator, modelId, provider, contextSliderMax]);

  const hasChanges =
    aggregator &&
    (aggregator.provider !== provider ||
      aggregator.modelId !== modelId ||
      (aggregator.apiKeyId ?? null) !== (apiKeyId ?? null) ||
      (provider === 'ollama' &&
        aggregator.provider === 'ollama' &&
        aggregator.modelId === modelId &&
        selectedModel &&
        contextSliderMax !== null &&
        normalizedPendingContext !== null &&
        normalizedCurrentContext !== normalizedPendingContext));
  
  // Determine if this is initial setup or update
  const isInitialSetup = !aggregator;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Aggregator Configuration
          </CardTitle>
          <CardDescription>
            Configure the AI model used to synthesize multi-agent responses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Aggregator Configuration
        </CardTitle>
        <CardDescription>
          {isInitialSetup 
            ? 'Setup the aggregator to combine multiple agent responses into a single, coherent answer.'
            : 'The aggregator combines multiple agent responses into a single, coherent answer. You can change the AI provider and model used for this synthesis.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Initial Setup Warning */}
        {isInitialSetup && (
          <div className="rounded-lg border-primary bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary mb-2">
              ⚡ Initial Setup Required
            </p>
            <p className="text-sm text-muted-foreground">
              Configure your aggregator to start using multi-agent conversations. 
              Choose a provider and model below, then click Apply.
            </p>
          </div>
        )}

        {/* Current Configuration Info - Only show if aggregator exists */}
        {!isInitialSetup && (
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Current Configuration</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span>Provider:</span>
              <span className="font-medium text-foreground">{AI_PROVIDERS[aggregator.provider].name}</span>
              <span>Model:</span>
              <span className="font-medium text-foreground">{aggregator.modelId}</span>
              {aggregator.provider === 'ollama' && (
                <>
                  <span>Context window:</span>
                  <span className="font-medium text-foreground">
                    {(() => {
                      const display = coerceContextWindow(aggregator.contextWindow);
                      return display ? `${display.toLocaleString()} tokens` : 'Model default';
                    })()}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((p) => {
                const Icon = PROVIDER_ICONS[p];
                return (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {AI_PROVIDERS[p].name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {AI_PROVIDERS[provider].isLocal 
              ? '🏠 Local provider - runs on your machine' 
              : '☁️ Cloud provider - requires internet connection'}
          </p>
        </div>

        {/* API Key Selection (if required) */}
        {!AI_PROVIDERS[provider].isLocal && (
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {AI_PROVIDERS[provider].requiresAPIKey && <span className="text-destructive">*</span>}
            </Label>
            <Select 
              value={apiKeyId || 'none'} 
              onValueChange={(value) => setApiKeyId(value === 'none' ? undefined : value)}
            >
              <SelectTrigger id="apiKey">
                <SelectValue placeholder="Select API key" />
              </SelectTrigger>
              <SelectContent>
                {!AI_PROVIDERS[provider].requiresAPIKey && (
                  <SelectItem value="none">No API Key (Free Tier)</SelectItem>
                )}
                {providerApiKeys.length === 0 && AI_PROVIDERS[provider].requiresAPIKey && (
                  <SelectItem value="none" disabled>
                    No API keys available - Add one in API Key Management
                  </SelectItem>
                )}
                {providerApiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {AI_PROVIDERS[provider].requiresAPIKey && providerApiKeys.length === 0 && (
              <p className="text-sm text-destructive">
                ⚠️ This provider requires an API key. Please add one in API Key Management.
              </p>
            )}
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          {provider === 'openrouter' && (
            <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Show free OpenRouter models only</p>
                <p className="text-xs text-muted-foreground">
                  Toggle off to include paid models in the list.
                </p>
              </div>
              <Switch
                checked={openRouterFreeOnly}
                onCheckedChange={setOpenRouterFreeOnly}
                aria-label="Toggle free OpenRouter models filter"
              />
            </div>
          )}
          <Select 
            value={modelId} 
            onValueChange={setModelId}
            disabled={isLoadingModels}
          >
            <SelectTrigger id="model">
              <SelectValue placeholder={isLoadingModels ? 'Loading models...' : 'Select model'} />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 && !isLoadingModels && (
                <SelectItem value="none" disabled>
                  No models available
                </SelectItem>
              )}
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      Default {model.contextWindow.toLocaleString()} tokens
                      {model.maxContextWindow && model.maxContextWindow !== model.contextWindow
                        ? ` • Max ${model.maxContextWindow.toLocaleString()} tokens`
                        : ''}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {isLoadingModels 
              ? 'Loading available models...' 
              : models.length === 0 
              ? 'No models available for this provider' 
              : `${models.length} model${models.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {provider === 'ollama' && selectedModel && contextSliderMax && sliderValue !== null && (
          <div className="space-y-2">
            <Label htmlFor="contextWindow">Context Window</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="contextWindow"
                min={contextSliderMin}
                max={contextSliderMax}
                step={contextStep}
                value={[sliderValue]}
                onValueChange={(value) => {
                  const rawValue = Array.isArray(value) ? value[0] : value;
                  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
                    return;
                  }

                  const nextValue = normalizeContextWindow(
                    rawValue,
                    contextSliderMax,
                    contextStep,
                    contextSliderMin
                  );
                  if (sliderValue !== nextValue) {
                    setOllamaContextWindow(nextValue);
                  }
                }}
              />
              <span className="w-20 text-right text-sm font-medium">
                {sliderValue.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Model supports up to {contextSliderMax.toLocaleString()} tokens. Adjust in common increments to suit your workload.
            </p>
          </div>
        )}

        {/* Apply/Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={!hasRequiredApiKey || !modelId || (!isInitialSetup && !hasChanges) || isSaving}
          className="w-full"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? 'Applying...' : isInitialSetup ? 'Apply Configuration' : 'Save Changes'}
        </Button>
        
        {!isInitialSetup && !hasChanges && (
          <p className="text-sm text-muted-foreground text-center">
            No changes to save
          </p>
        )}
      </CardContent>
    </Card>
  );
}
