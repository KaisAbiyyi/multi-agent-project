"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, Globe, Zap, AlertCircle, Plus, Trash2, Eye, EyeOff } from "lucide-react";
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
  const { apiKeys, createAPIKey, deleteAPIKey, isLoading: isLoadingKeys } = useAPIKeys();
  const { toast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("ollama");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [useLLM7ApiKey, setUseLLM7ApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  
  // API Key Dialog
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [keyDialogProvider, setKeyDialogProvider] = useState<AIProvider>("openrouter");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});

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

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and API key",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAPIKey({
        name: newKeyName,
        provider: keyDialogProvider,
        key: newKeyValue,
        isActive: true,
      });
      
      toast({
        title: "API Key added",
        description: `${newKeyName} has been added successfully.`,
      });
      
      setIsAddKeyDialogOpen(false);
      setNewKeyName("");
      setNewKeyValue("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add API key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Delete API key "${keyName}"?`)) return;
    
    try {
      await deleteAPIKey(keyId);
      toast({
        title: "API Key deleted",
        description: `${keyName} has been removed.`,
      });
      
      // Clear selection if deleted key was selected
      if (selectedApiKeyId === keyId) {
        setSelectedApiKeyId("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setError("");
    
    // Validation
    if (selectedProvider === "openrouter" && !selectedApiKeyId) {
      setError("OpenRouter requires an API key. Please add one first.");
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
      
      toast({
        title: "Provider configured",
        description: `${PROVIDER_INFO[selectedProvider].name} is now active.`,
      });
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
          <h3 className="text-lg font-medium">AI Provider Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Choose your AI provider and configure API keys
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
            const providerKeys = getApiKeysForProvider(provider);

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
                    <div className="ml-8 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="openrouter-key">
                          API Key <span className="text-destructive">*</span>
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setKeyDialogProvider("openrouter");
                            setIsAddKeyDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Key
                        </Button>
                      </div>
                      
                      {providerKeys.length > 0 ? (
                        <>
                          <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                            <SelectTrigger id="openrouter-key">
                              <SelectValue placeholder="Select API key" />
                            </SelectTrigger>
                            <SelectContent>
                              {providerKeys.map((key) => (
                                <SelectItem key={key.id} value={key.id}>
                                  {key.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Show selected key with delete option */}
                          {selectedApiKeyId && (
                            <div className="space-y-2">
                              {providerKeys.map((key) => {
                                if (key.id !== selectedApiKeyId) return null;
                                return (
                                  <div key={key.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{key.name}</p>
                                      <div className="flex items-center gap-2">
                                        <code className="text-xs">
                                          {showKeyValue[key.id] ? key.key : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
                                        </code>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => setShowKeyValue(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                                        >
                                          {showKeyValue[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive"
                                      onClick={() => handleDeleteKey(key.id, key.name)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No API keys found. Click &quot;Add Key&quot; to add one.
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
                        <>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="llm7-key">API Key</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setKeyDialogProvider("llm7");
                                setIsAddKeyDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Key
                            </Button>
                          </div>
                          
                          {providerKeys.length > 0 ? (
                            <>
                              <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                                <SelectTrigger id="llm7-key">
                                  <SelectValue placeholder="Select API key" />
                                </SelectTrigger>
                                <SelectContent>
                                  {providerKeys.map((key) => (
                                    <SelectItem key={key.id} value={key.id}>
                                      {key.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {/* Show selected key with delete option */}
                              {selectedApiKeyId && (
                                <div className="space-y-2">
                                  {providerKeys.map((key) => {
                                    if (key.id !== selectedApiKeyId) return null;
                                    return (
                                      <div key={key.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{key.name}</p>
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs">
                                              {showKeyValue[key.id] ? key.key : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
                                            </code>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => setShowKeyValue(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                                            >
                                              {showKeyValue[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                            </Button>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-destructive"
                                          onClick={() => handleDeleteKey(key.id, key.name)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No API keys found. Click &quot;Add Key&quot; to add one.
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
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

      {/* Add API Key Dialog */}
      <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {PROVIDER_INFO[keyDialogProvider].name} API Key</DialogTitle>
            <DialogDescription>
              Enter your API key details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., My OpenRouter Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key-value">API Key</Label>
              <Input
                id="key-value"
                type="password"
                placeholder="sk-..."
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey}>
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
