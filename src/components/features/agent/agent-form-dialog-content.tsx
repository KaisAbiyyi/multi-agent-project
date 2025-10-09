'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Agent, AIProvider, AIModel } from '@/types';
import { AgentSchema, type AgentInput } from '@/types/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { AI_PROVIDERS } from '@/constants';
import { fetchModelsByProvider } from '@/services/api/model-service';
import { useAPIKeys } from '@/hooks/use-api-keys';

interface AgentFormDialogContentProps {
  agent?: Agent;
  onSubmit: (data: AgentInput) => void;
  isSubmitting?: boolean;
}

export function AgentFormDialogContent({
  agent,
  onSubmit,
  isSubmitting = false,
}: AgentFormDialogContentProps) {
  const { apiKeys } = useAPIKeys();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(
    agent?.apiKeyId ? getProviderFromApiKey(agent.apiKeyId, apiKeys) : 'ollama'
  );
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const form = useForm<AgentInput>({
    resolver: zodResolver(AgentSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: agent || {
      name: '',
      description: '',
      persona: '',
      modelId: '',
      apiKeyId: '',
      temperature: 0.7,
      maxTokens: 2000,
    },
  });

  // Get API key for selected provider
  const providerRequiresKey = AI_PROVIDERS[selectedProvider]?.requiresAPIKey;
  const availableApiKeys = apiKeys.filter(
    (key) => key.provider === selectedProvider && key.isActive
  );

  // Fetch models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      setModelError(null);

      try {
        let apiKey: string | undefined;

        // For providers that require API key, use the first available one
        if (providerRequiresKey && availableApiKeys.length > 0 && availableApiKeys[0]) {
          apiKey = availableApiKeys[0].key;
        }

        const fetchedModels = await fetchModelsByProvider(selectedProvider, apiKey);

        if (fetchedModels.length === 0) {
          if (selectedProvider === 'ollama') {
            setModelError('Ollama not running. Please start Ollama to see available models.');
          } else if (providerRequiresKey && availableApiKeys.length === 0) {
            setModelError(`No API key configured for ${AI_PROVIDERS[selectedProvider].name}`);
          } else {
            setModelError('No models available');
          }
        }

        setModels(fetchedModels);
      } catch (error) {
        console.error('Error loading models:', error);
        setModelError('Failed to load models');
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedProvider, providerRequiresKey, availableApiKeys]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    form.setValue('modelId', '');
    
    // Auto-select API key if provider requires it
    if (AI_PROVIDERS[provider]?.requiresAPIKey) {
      const keys = apiKeys.filter((k) => k.provider === provider && k.isActive);
      if (keys.length > 0 && keys[0]) {
        form.setValue('apiKeyId', keys[0].id);
      } else {
        form.setValue('apiKeyId', '');
      }
    } else {
      form.setValue('apiKeyId', '');
    }
  };

  const handleSubmit = (data: AgentInput) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
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

        {/* Persona */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Persona & Instructions</h3>
            <p className="text-sm text-muted-foreground">
              Define how your agent should behave and respond
            </p>
          </div>

          <FormField
            control={form.control}
            name="persona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Prompt / Persona</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="You are a helpful AI assistant..."
                    className="min-h-32 resize-y"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The system prompt that defines your agent&apos;s behavior
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Provider & Model Configuration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Model Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Select the AI provider and model for this agent
            </p>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={(value) => handleProviderChange(value as AIProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {config.name}
                      {config.isLocal && (
                        <Badge variant="outline" className="text-xs">
                          Local
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProvider === 'ollama' && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Ollama runs locally on your machine. No API key required.
              </p>
            )}
          </div>

          {/* API Key Selection (only if required) */}
          {providerRequiresKey && (
            <FormField
              control={form.control}
              name="apiKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select API key" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableApiKeys.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No API keys configured for {AI_PROVIDERS[selectedProvider].name}
                        </div>
                      ) : (
                        availableApiKeys.map((key) => (
                          <SelectItem key={key.id} value={key.id}>
                            {key.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Configure API keys in Settings if none are available
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <SelectValue placeholder={isLoadingModels ? 'Loading models...' : 'Select model'} />
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
                              {model.contextWindow.toLocaleString()} tokens
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            <p className="text-sm text-muted-foreground">
              Fine-tune the model&apos;s behavior
            </p>
          </div>

          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Temperature</FormLabel>
                  <span className="text-sm text-muted-foreground">
                    {field.value?.toFixed(1) || '0.7'}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[field.value || 0.7]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>
                  Higher values make output more random, lower values more focused
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxTokens"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Tokens</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={100000}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    value={field.value || 2000}
                  />
                </FormControl>
                <FormDescription>Maximum length of the response</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agent ? 'Update Agent' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper function to get provider from API key ID
function getProviderFromApiKey(apiKeyId: string, apiKeys: { id: string; provider: AIProvider }[]): AIProvider {
  const key = apiKeys.find((k) => k.id === apiKeyId);
  return key?.provider || 'ollama';
}
