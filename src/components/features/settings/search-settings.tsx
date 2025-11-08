"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getSearchSettings,
  saveSearchSettings,
  type SearchSettings as SearchSettingsType,
} from "@/services/storage/search-settings-storage";
import type { SearchProvider } from "@/types/web-search";
import { Globe, Key, Server, Shield } from "lucide-react";

const SEARCH_PROVIDERS: { value: SearchProvider; label: string; requiresApiKey: boolean; requiresBaseUrl: boolean }[] = [
  { value: "duckduckgo", label: "DuckDuckGo Lite (No Setup Required)", requiresApiKey: false, requiresBaseUrl: false },
  { value: "brave", label: "Brave Search", requiresApiKey: true, requiresBaseUrl: false },
  { value: "searxng", label: "SearxNG (Self-hosted)", requiresApiKey: false, requiresBaseUrl: true },
  { value: "tavily", label: "Tavily", requiresApiKey: true, requiresBaseUrl: false },
  { value: "serpapi", label: "SerpAPI", requiresApiKey: true, requiresBaseUrl: false },
  { value: "mock", label: "Mock (Testing Only)", requiresApiKey: false, requiresBaseUrl: false },
];

export function SearchSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SearchSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for form inputs
  const [braveApiKey, setBraveApiKey] = useState("");
  const [tavilyApiKey, setTavilyApiKey] = useState("");
  const [serpapiApiKey, setSerpapiApiKey] = useState("");
  const [searxngBaseUrl, setSearxngBaseUrl] = useState("");
  const [searxngBasicAuth, setSearxngBasicAuth] = useState("");

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loaded = await getSearchSettings();
      setSettings(loaded);
      
      // Initialize form values
      setBraveApiKey(loaded.configs.brave?.apiKey || "");
      setTavilyApiKey(loaded.configs.tavily?.apiKey || "");
      setSerpapiApiKey(loaded.configs.serpapi?.apiKey || "");
      setSearxngBaseUrl(loaded.configs.searxng?.baseUrl || "");
      setSearxngBasicAuth(loaded.configs.searxng?.basicAuth || "");
    } catch (error) {
      console.error("[SearchSettings] Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load search settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      
      const updatedSettings: SearchSettingsType = {
        ...settings,
        configs: {
          brave: braveApiKey ? { apiKey: braveApiKey } : undefined,
          tavily: tavilyApiKey ? { apiKey: tavilyApiKey } : undefined,
          serpapi: serpapiApiKey ? { apiKey: serpapiApiKey } : undefined,
          searxng: searxngBaseUrl ? {
            baseUrl: searxngBaseUrl,
            basicAuth: searxngBasicAuth || undefined,
          } : undefined,
        },
      };

      await saveSearchSettings(updatedSettings);
      setSettings(updatedSettings);

      toast({
        title: "Settings saved",
        description: "Your search provider settings have been updated",
      });
    } catch (error) {
      console.error("[SearchSettings] Error saving settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (provider: SearchProvider) => {
    if (!settings) return;
    setSettings({ ...settings, provider });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-sm text-destructive">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Web Search Provider</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred search provider for live web results
        </p>
      </div>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="search-provider" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Search Provider
          </Label>
          <Select value={settings.provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="search-provider" className="w-full">
              <SelectValue placeholder="Select search provider" />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings.provider === "duckduckgo" && "No API key required - works out of the box"}
            {settings.provider === "brave" && "Requires Brave Search API key"}
            {settings.provider === "searxng" && "Requires self-hosted SearxNG instance"}
            {settings.provider === "tavily" && "Requires Tavily API key"}
            {settings.provider === "serpapi" && "Requires SerpAPI key"}
            {settings.provider === "mock" && "Returns mock data for testing"}
          </p>
        </div>

        {/* Brave API Key */}
        {settings.provider === "brave" && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="brave-api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Brave API Key
            </Label>
            <Input
              id="brave-api-key"
              type="password"
              value={braveApiKey}
              onChange={(e) => setBraveApiKey(e.target.value)}
              placeholder="Enter your Brave Search API key"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://brave.com/search/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Brave Search API
              </a>
            </p>
          </div>
        )}

        {/* Tavily API Key */}
        {settings.provider === "tavily" && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="tavily-api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Tavily API Key
            </Label>
            <Input
              id="tavily-api-key"
              type="password"
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
              placeholder="Enter your Tavily API key"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://tavily.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Tavily
              </a>
            </p>
          </div>
        )}

        {/* SerpAPI Key */}
        {settings.provider === "serpapi" && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="serpapi-api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              SerpAPI Key
            </Label>
            <Input
              id="serpapi-api-key"
              type="password"
              value={serpapiApiKey}
              onChange={(e) => setSerpapiApiKey(e.target.value)}
              placeholder="Enter your SerpAPI key"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://serpapi.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                SerpAPI
              </a>
            </p>
          </div>
        )}

        {/* SearxNG Configuration */}
        {settings.provider === "searxng" && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="searxng-base-url" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                SearxNG Base URL
              </Label>
              <Input
                id="searxng-base-url"
                type="url"
                value={searxngBaseUrl}
                onChange={(e) => setSearxngBaseUrl(e.target.value)}
                placeholder="https://your-searxng-instance.com"
              />
              <p className="text-xs text-muted-foreground">
                The base URL of your SearxNG instance (e.g., http://localhost:8080)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="searxng-basic-auth" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Basic Auth (Optional)
              </Label>
              <Input
                id="searxng-basic-auth"
                type="password"
                value={searxngBasicAuth}
                onChange={(e) => setSearxngBasicAuth(e.target.value)}
                placeholder="username:password"
              />
              <p className="text-xs text-muted-foreground">
                If your SearxNG instance requires authentication (format: username:password)
              </p>
            </div>
          </div>
        )}

        {/* DuckDuckGo Info */}
        {settings.provider === "duckduckgo" && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✓ DuckDuckGo Lite is ready to use with no configuration required. It provides free web search without any API keys or setup.
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
