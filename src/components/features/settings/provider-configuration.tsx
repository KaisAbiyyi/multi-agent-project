"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, Globe, Zap, AlertCircle, Edit2, Save, ExternalLink } from "lucide-react";
import { useProviderPreference } from "@/hooks/use-provider-preference";
import { useAPIKeys } from "@/hooks/use-api-keys";
import type { AIProvider } from "@/types";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_INFO = {
  ollama: {
    name: "Ollama",
    description: "Local AI models running on your machine",
    icon: Server,
    requiresApiKey: false,
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access to multiple AI models via OpenRouter API",
    icon: Globe,
    requiresApiKey: true,
  },
  llm7: {
    name: "LLM7",
    description: "LLM7 AI models (API key optional for higher limits)",
    icon: Zap,
    requiresApiKey: false,
  },
};

const PROVIDER_FACTS: Record<AIProvider, {
  pros: string[];
  cons: string[];
  sources: { label: string; url: string }[];
}> = {
  ollama: {
    pros: [
      "Runs entirely on your local machine—your prompts never leave the device.",
      "No API key, billing account, or external network access required.",
      "Great for offline experimentation with open-source models you install yourself.",
    ],
    cons: [
      "Needs adequate local CPU/GPU resources and disk space for model downloads.",
      "Model selection is limited to what you manually install and maintain.",
      "You handle updates, performance tuning, and uptime on your own hardware.",
    ],
    sources: [],
  },
  openrouter: {
    pros: [
      "Single API endpoint unlocks hundreds of hosted models with automatic fallbacks (OpenRouter Quickstart).",
      "Works with familiar OpenAI client libraries and supports streaming out of the box (OpenRouter Quickstart).",
      "Lets you pick cost-effective models per request without rewriting integration code (OpenRouter Quickstart).",
    ],
    cons: [
      "Requires an OpenRouter API key and outbound internet connectivity (OpenRouter Quickstart).",
      "Usage is subject to OpenRouter's rate limits and policies (OpenRouter FAQ).",
      "Prompts are processed through OpenRouter's infrastructure before reaching the upstream model (OpenRouter Quickstart).",
    ],
    sources: [
      { label: "OpenRouter Quickstart", url: "https://openrouter.ai/docs/quickstart" },
      { label: "OpenRouter FAQ — Rate limits", url: "https://openrouter.ai/docs/faq#how-are-rate-limits-calculated" },
    ],
  },
  llm7: {
    pros: [
      "Community-backed service with a donor-supported free tier (LLM7 Terms §2).",
      "Personal API tokens can be rotated via token.llm7.io for security (LLM7 Terms §3).",
      "Collects only minimal personal data and never sells it (LLM7 Privacy §§2–7).",
    ],
    cons: [
      "Tokens may be rate-limited, suspended, or revoked to protect the service (LLM7 Terms §3).",
      "Best-effort availability with no guaranteed uptime or throughput (LLM7 Terms §9).",
      "Traffic flows through Cloudflare's infrastructure, so requests leave your local environment (LLM7 Privacy §4).",
    ],
    sources: [
      { label: "LLM7 Terms", url: "https://github.com/chigwell/llm7.io/blob/main/TERMS.md" },
      { label: "LLM7 Privacy", url: "https://github.com/chigwell/llm7.io/blob/main/PRIVACY.md" },
    ],
  },
};

export function ProviderConfiguration() {
  const { activeProvider, setActiveProvider, isLoading: isLoadingPref } = useProviderPreference();
  const { apiKeys, createAPIKey, deleteAPIKey, isLoading: isLoadingKeys } = useAPIKeys();
  const { toast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("ollama");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  
  // API Key editing state
  const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
  const [isEditingLLM7, setIsEditingLLM7] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [llm7Key, setLLM7Key] = useState("");

  // Initialize from active provider
  useEffect(() => {
    if (activeProvider) {
      setSelectedProvider(activeProvider.provider);
    }
  }, [activeProvider]);

  useEffect(() => {
    const openRouterStored = apiKeys.find((k) => k.provider === "openrouter");
    const llm7Stored = apiKeys.find((k) => k.provider === "llm7");

    setOpenRouterKey(openRouterStored?.key ?? "");
    setLLM7Key(llm7Stored?.key ?? "");
  }, [apiKeys]);

  const handleSaveApiKey = async (provider: AIProvider, keyValue: string) => {
    if (!keyValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if key already exists for this provider
      const existingKey = apiKeys.find(k => k.provider === provider);
      
      if (existingKey) {
        // Update existing key
        await deleteAPIKey(existingKey.id);
      }
      
      // Create new key
      const newKey = await createAPIKey({
        provider,
        name: `${PROVIDER_INFO[provider].name} API Key`,
        key: keyValue,
        isActive: true,
      });
      
      const apiKeyId = newKey.id;

      toast({
        title: "Success",
        description: "API key saved successfully",
      });

      // Close edit mode
      if (provider === "openrouter") {
        setIsEditingOpenRouter(false);
      } else if (provider === "llm7") {
        setIsEditingLLM7(false);
      }

      // Auto-save provider preference with the new key
      await handleSaveConfiguration(provider, apiKeyId);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save API key",
        variant: "destructive",
      });
    }
  };

  const handleSaveConfiguration = async (provider?: AIProvider, apiKeyId?: string) => {
    const providerToSave = provider || selectedProvider;
    
    try {
      setIsSaving(true);
      setError("");

      // Validate OpenRouter requires API key
      if (providerToSave === "openrouter" && !apiKeyId && !openRouterKey) {
        setError("OpenRouter requires an API key");
        return;
      }

      // Get API key ID if not provided
      let finalApiKeyId = apiKeyId;
      if (!finalApiKeyId) {
        if (providerToSave === "openrouter" && openRouterKey) {
          const key = apiKeys.find(k => k.provider === "openrouter");
          finalApiKeyId = key?.id;
        } else if (providerToSave === "llm7" && llm7Key) {
          const key = apiKeys.find(k => k.provider === "llm7");
          finalApiKeyId = key?.id;
        }
      }

      await setActiveProvider(providerToSave, finalApiKeyId);

      toast({
        title: "Provider configured",
        description: `${PROVIDER_INFO[providerToSave].name} is now your active provider`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPref || isLoadingKeys) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Provider</h3>
        <p className="text-sm text-muted-foreground">
          Choose your AI provider to power your agents
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <RadioGroup
        value={selectedProvider}
        onValueChange={(value: string) => {
          setSelectedProvider(value as AIProvider);
          setError("");
        }}
      >
        {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((provider) => {
          const info = PROVIDER_INFO[provider];
          const Icon = info.icon;
          const hasApiKey = provider === "openrouter" 
            ? !!openRouterKey 
            : provider === "llm7" 
            ? !!llm7Key 
            : true;

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
                    {!isEditingOpenRouter && !hasApiKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingOpenRouter(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Add API Key
                      </Button>
                    )}
                    
                    {!isEditingOpenRouter && hasApiKey && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs px-2 py-1 bg-muted rounded">
                          {openRouterKey.slice(0, 8)}...{openRouterKey.slice(-4)}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingOpenRouter(true)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}

                    {isEditingOpenRouter && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="password"
                          placeholder="sk-or-..."
                          value={openRouterKey}
                          onChange={(e) => setOpenRouterKey(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveApiKey("openrouter", openRouterKey)}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* LLM7: API key optional */}
                {provider === "llm7" && selectedProvider === "llm7" && (
                  <div className="ml-8 space-y-2">
                    {!isEditingLLM7 && !hasApiKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingLLM7(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Add API Key (Optional)
                      </Button>
                    )}
                    
                    {!isEditingLLM7 && hasApiKey && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs px-2 py-1 bg-muted rounded">
                          {llm7Key.slice(0, 8)}...{llm7Key.slice(-4)}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingLLM7(true)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}

                    {isEditingLLM7 && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="password"
                          placeholder="API key (optional)"
                          value={llm7Key}
                          onChange={(e) => setLLM7Key(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveApiKey("llm7", llm7Key)}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                    
                    {!hasApiKey && (
                      <p className="text-xs text-muted-foreground">
                        API key provides higher rate limits
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroup>

      <div className="rounded-lg border bg-muted/40 p-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Pros & Cons</h4>
          <p className="text-xs text-muted-foreground">
            Key trade-offs for {PROVIDER_INFO[selectedProvider].name} based on the latest docs.
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Pros</div>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {PROVIDER_FACTS[selectedProvider].pros.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Cons</div>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {PROVIDER_FACTS[selectedProvider].cons.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {PROVIDER_FACTS[selectedProvider].sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium">Sources:</span>
            {PROVIDER_FACTS[selectedProvider].sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                {source.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={() => handleSaveConfiguration()} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
