/**
 * Agent Card Component
 * Displays an agent in card format with actions
 * Memoized for performance optimization
 */

"use client";

import { memo } from "react";
import { Agent } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit, Copy, Trash2, Download, Brain, Server, Globe, Zap } from "lucide-react";

const PROVIDER_ICONS = {
  ollama: Server,
  openrouter: Globe,
  llm7: Zap,
} as const;

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onDuplicate?: (agent: Agent) => void;
  onExport?: (agent: Agent) => void;
  onClick?: (agent: Agent) => void;
}

export const AgentCard = memo(function AgentCard({
  agent,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onClick,
}: AgentCardProps) {
  const ProviderIcon = PROVIDER_ICONS[agent.provider];

  const handleCardClick = () => {
    if (onClick) {
      onClick(agent);
    }
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {agent.description || "No description provided"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(agent);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(agent);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(agent);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
              )}
              {onDelete && !agent.isAggregator && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(agent);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Aggregator Badge */}
          {agent.isAggregator && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary text-xs">
                🤖 System Aggregator
              </Badge>
              <span className="text-xs text-muted-foreground">Cannot be deleted</span>
            </div>
          )}

          {/* Provider & Model Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <ProviderIcon className="text-muted-foreground h-4 w-4" />
            <Badge variant="secondary" className="text-xs">
              {agent.provider.toUpperCase()}
            </Badge>
            <Brain className="text-muted-foreground h-4 w-4 ml-2" />
            <span className="text-muted-foreground text-xs">{agent.modelId}</span>
          </div>

          {/* Persona Preview - hide for aggregator */}
          {agent.persona && !agent.isAggregator && (
            <div className="mt-2">
              <p className="text-muted-foreground bg-muted line-clamp-3 rounded p-2 font-mono text-xs">
                {agent.persona}
              </p>
            </div>
          )}
          
          {/* Aggregator Info */}
          {agent.isAggregator && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                ✨ This agent synthesizes responses from multiple agents into coherent answers.
                Configure in Settings → Aggregator.
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-muted-foreground border-t pt-2 text-xs">
            <div>Created: {new Date(agent.createdAt).toLocaleDateString()}</div>
            {agent.updatedAt !== agent.createdAt && (
              <div>Updated: {new Date(agent.updatedAt).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
