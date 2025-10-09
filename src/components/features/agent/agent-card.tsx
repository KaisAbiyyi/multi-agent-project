/**
 * Agent Card Component
 * Displays an agent in card format with actions
 */

"use client";

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
import { MoreVertical, Edit, Copy, Trash2, Download, Brain, Thermometer, Hash } from "lucide-react";
import { DEFAULT_MODELS } from "@/constants";

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onDuplicate?: (agent: Agent) => void;
  onExport?: (agent: Agent) => void;
  onClick?: (agent: Agent) => void;
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onClick,
}: AgentCardProps) {
  const model = DEFAULT_MODELS.find((m) => m.id === agent.modelId);

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
              {onDelete && (
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
          {/* Model Badge */}
          {model && (
            <div className="flex items-center gap-2">
              <Brain className="text-muted-foreground h-4 w-4" />
              <Badge variant="secondary" className="text-xs">
                {model.displayName}
              </Badge>
              <span className="text-muted-foreground text-xs">({model.provider})</span>
            </div>
          )}

          {/* Parameters */}
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              <span>Temp: {agent.temperature?.toFixed(1) || "0.7"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>Tokens: {agent.maxTokens || "2048"}</span>
            </div>
          </div>

          {/* Persona Preview */}
          <div className="mt-2">
            <p className="text-muted-foreground bg-muted line-clamp-3 rounded p-2 font-mono text-xs">
              {agent.persona}
            </p>
          </div>

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
}
