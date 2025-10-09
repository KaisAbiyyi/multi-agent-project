"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, Globe, Zap, AlertCircle } from "lucide-react";
import { useProviderPreference } from "@/hooks/use-provider-preference";
import { useAPIKeys } from "@/hooks/use-api-keys";
import type { AIProvider } from "@/types";

const PROVIDER_INFO = {
  ollama: {
    name: "Ollama",
    description: "Local AI models running on your machine",
    icon: Server,
    requiresApiKey: false,
    apiKeyOptional: false,
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access to multiple AI models via OpenRouter API",
    icon: Globe,
    requiresApiKey: true,
    apiKeyOptional: false,
  },
  llm7: {
    name: "LLM7",
    description: "LLM7 AI models from llm7.io",
    icon: Zap,
    requiresApiKey: false,
    apiKeyOptional: true,
  },
};

export function ProviderConfiguration() {
  const { activeProvider, setActiveProvider, isLoading: isLoadingPref } = useProviderPreference();
  const { apiKeys, isLoading: isLoadingKeys } = useAPIKeys();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("ollama");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [useLLM7ApiKey, setUseLLM7ApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Initialize from active provider
  useEffect(() => {
    if (activeProvider) {
      setSelectedProvider(activeProvider.provider);
      setSelectedApiKeyId(activeProvider.apiKeyId || "");
      if (activeProvider.provider === "llm7" && activeProvider.apiKeyId) {
        setUseLLM7ApiKey(true);
      }
    }
  }, [activeProvider]);

  // Filter API keys by provider
  const getApiKeysForProvider = (provider: AIProvider) => {
    return apiKeys.filter((key) => key.provider === provider);
  };

  const openRouterKeys = getApiKeysForProvider("openrouter");
  const llm7Keys = getApiKeysForProvider("llm7");

  const handleSave = async () => {
    setError("");
    
    // Validation
    if (selectedProvider === "openrouter" && !selectedApiKeyId) {
      setError("OpenRouter requires an API key. Please select one or add a new API key.");
      return;
    }

    if (selectedProvider === "llm7" && useLLM7ApiKey && !selectedApiKeyId) {
      setError("Please select an API key or disable 'Use API Key' option.");
      return;
    }

    setIsSaving(true);
    try {
      const apiKeyId = selectedProvider === "ollama" 
        ? undefined 
        : selectedProvider === "llm7" && !useLLM7ApiKey
        ? undefined
        : selectedApiKeyId;

      await setActiveProvider(selectedProvider, apiKeyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPref || isLoadingKeys) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">AI Provider</h3>
          <p className="text-sm text-muted-foreground">
            Choose which AI provider to use for your agents
          </p>
        </div>

        <RadioGroup value={selectedProvider} onValueChange={(value: string) => {
          setSelectedProvider(value as AIProvider);
          setSelectedApiKeyId("");
          setError("");
        }}>
          {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((provider) => {
            const info = PROVIDER_INFO[provider];
            const Icon = info.icon;

            return (
              <div
                key={provider}
                className="flex items-start space-x-3 rounded-lg border p-4"
              >
                <RadioGroupItem value={provider} id={provider} className="mt-1" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor={provider} className="text-base font-medium cursor-pointer">
                        {info.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  {/* Ollama: No API key needed */}
                  {provider === "ollama" && selectedProvider === "ollama" && (
                    <div className="ml-8 text-sm text-muted-foreground">
                      No API key required - runs locally on your machine
                    </div>
                  )}

                  {/* OpenRouter: API key required */}
                  {provider === "openrouter" && selectedProvider === "openrouter" && (
                    <div className="ml-8 space-y-2">
                      <Label htmlFor="openrouter-key">
                        API Key <span className="text-destructive">*</span>
                      </Label>
                      {openRouterKeys.length > 0 ? (
                        <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                          <SelectTrigger id="openrouter-key">
                            <SelectValue placeholder="Select API key" />
                          </SelectTrigger>
                          <SelectContent>
                            {openRouterKeys.map((key) => (
                              <SelectItem key={key.id} value={key.id}>
                                {key.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No API keys found. Please add an OpenRouter API key in the API Keys tab.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* LLM7: Optional API key */}
                  {provider === "llm7" && selectedProvider === "llm7" && (
                    <div className="ml-8 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="llm7-use-key">Use API Key (Optional)</Label>
                        <Switch
                          id="llm7-use-key"
                          checked={useLLM7ApiKey}
                          onCheckedChange={(checked: boolean) => {
                            setUseLLM7ApiKey(checked);
                            if (!checked) {
                              setSelectedApiKeyId("");
                            }
                          }}
                        />
                      </div>

                      {useLLM7ApiKey && (
                        <div className="space-y-2">
                          <Label htmlFor="llm7-key">API Key</Label>
                          {llm7Keys.length > 0 ? (
                            <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                              <SelectTrigger id="llm7-key">
                                <SelectValue placeholder="Select API key" />
                              </SelectTrigger>
                              <SelectContent>
                                {llm7Keys.map((key) => (
                                  <SelectItem key={key.id} value={key.id}>
                                    {key.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No API keys found. Please add an LLM7 API key in the API Keys tab.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
