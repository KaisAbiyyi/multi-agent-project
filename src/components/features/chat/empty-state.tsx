"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Settings, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onCreateAgent: () => void;
  onOpenSettings: () => void;
  hasAggregator: boolean;
  hasAgents: boolean;
}

export function EmptyState({ onCreateAgent, onOpenSettings, hasAggregator, hasAgents }: EmptyStateProps) {
  // Only show cards that are needed
  const showAggregatorCard = !hasAggregator;
  const showAgentCard = !hasAgents;
  
  // If both exist, don't show anything (parent will show chat interface)
  if (!showAggregatorCard && !showAgentCard) {
    return null;
  }

  // Determine grid layout
  const gridClass = showAggregatorCard && showAgentCard 
    ? "grid gap-6 md:grid-cols-2 max-w-4xl w-full"
    : "flex justify-center max-w-2xl w-full";

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className={gridClass}>
        {/* Card 1: Setup Aggregator */}
        {showAggregatorCard && (
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Setup Aggregator</CardTitle>
              </div>
              <CardDescription className="text-base">
                Configure the Aggregator agent that will synthesize responses from your team of agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Choose an AI provider and model for the Aggregator</span>
                </p>
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Set API keys for OpenRouter, LLM7, or configure Ollama</span>
                </p>
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>The Aggregator combines insights from all your agents</span>
                </p>
              </div>
              <Button 
                onClick={onOpenSettings} 
                className="w-full mt-4"
                size="lg"
              >
                <Settings className="mr-2 h-4 w-4" />
                Open Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Create First Agent */}
        {showAgentCard && (
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Create Your First Agent</CardTitle>
              </div>
              <CardDescription className="text-base">
                Build your first AI agent to start collaborating on complex tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Choose from pre-built persona templates or create custom</span>
                </p>
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Configure unique roles like Analyst, Critic, or Expert</span>
                </p>
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Each agent can use different AI models and providers</span>
                </p>
              </div>
              <Button 
                onClick={onCreateAgent} 
                className="w-full mt-4"
                size="lg"
              >
                <Bot className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
