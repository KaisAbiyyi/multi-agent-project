'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getAggregatorAgent, updateAggregatorAgent } from '@/lib/db';
import { fetchModelsByProvider } from '@/services/api/model-service';
import { useAPIKeys } from '@/hooks/use-api-keys';
import type { Agent, AIProvider, AIModel } from '@/types';
import { Bot, Loader2, Server, Globe, Zap } from 'lucide-react';
import { AI_PROVIDERS } from '@/constants';

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

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setModelId('');
    setApiKeyId(undefined);
    if (newProvider === 'openrouter') {
      setOpenRouterFreeOnly(true);
    }
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

    setIsSaving(true);
    try {
      const isInitialSetup = !aggregator;
      
      const updatedAggregator = await updateAggregatorAgent(provider, modelId, apiKeyId);
      
      // Update local state with the returned aggregator
      setAggregator(updatedAggregator);

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

  const providerApiKeys = apiKeys.filter((key) => key.provider === provider && key.isActive);
  const hasRequiredApiKey = AI_PROVIDERS[provider].requiresAPIKey ? apiKeyId : true;
  const hasChanges = 
    aggregator && 
    (aggregator.provider !== provider || 
     aggregator.modelId !== modelId || 
     aggregator.apiKeyId !== apiKeyId);
  
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
                  {model.displayName}
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
