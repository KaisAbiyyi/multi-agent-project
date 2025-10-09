'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Agent, AIModel } from '@/types';
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
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Settings2 } from 'lucide-react';
import { AI_PROVIDERS } from '@/constants';
import { fetchModelsByProvider } from '@/services/api/model-service';
import { useAPIKeys } from '@/hooks/use-api-keys';
import { useProviderPreference } from '@/hooks/use-provider-preference';
import { PersonaSelector } from './persona-selector';

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
  const { activeProvider, isLoading: isLoadingProvider } = useProviderPreference();
  
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

  // Fetch models when component mounts or provider changes
  useEffect(() => {
    if (!activeProvider) return;

    const loadModels = async () => {
      setIsLoadingModels(true);
      setModelError(null);

      try {
        // Get API key for active provider
        let apiKey: string | undefined;
        if (activeProvider.apiKeyId) {
          const key = apiKeys.find((k) => k.id === activeProvider.apiKeyId);
          apiKey = key?.key;
        }

        const fetchedModels = await fetchModelsByProvider(activeProvider.provider, apiKey);

        if (fetchedModels.length === 0) {
          if (activeProvider.provider === 'ollama') {
            setModelError('Ollama not running. Please start Ollama to see available models.');
          } else if (AI_PROVIDERS[activeProvider.provider]?.requiresAPIKey && !apiKey) {
            setModelError(`No API key configured for ${AI_PROVIDERS[activeProvider.provider].name}`);
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
    
    // Set apiKeyId in form if provider has one
    if (activeProvider.apiKeyId) {
      form.setValue('apiKeyId', activeProvider.apiKeyId);
    }
  }, [activeProvider, apiKeys, form]);

  const handleSubmit = (data: AgentInput) => {
    onSubmit(data);
  };

  // Show loading state while provider preference is loading
  if (isLoadingProvider) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error if no provider is configured
  if (!activeProvider) {
    return (
      <Alert>
        <Settings2 className="h-4 w-4" />
        <AlertDescription>
          No AI provider configured. Please configure a provider in Settings first.
        </AlertDescription>
      </Alert>
    );
  }

  const providerConfig = AI_PROVIDERS[activeProvider.provider];

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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Persona & Instructions</h3>
              <p className="text-sm text-muted-foreground">
                Define how your agent should behave and respond
              </p>
            </div>
            <PersonaSelector
              onSelect={(persona, temperature, maxTokens) => {
                form.setValue('persona', persona);
                if (temperature !== undefined) {
                  form.setValue('temperature', temperature);
                }
                if (maxTokens !== undefined) {
                  form.setValue('maxTokens', maxTokens);
                }
              }}
            />
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

        {/* Model Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Model Selection</h3>
            <p className="text-sm text-muted-foreground">
              Using {providerConfig.name} provider
            </p>
          </div>

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
                <FormDescription>
                  Change provider in Settings to see different models
                </FormDescription>
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
