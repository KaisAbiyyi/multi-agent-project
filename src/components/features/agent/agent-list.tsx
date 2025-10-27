/**
 * Agent List Component
 * Displays a list/grid of agents with search and filtering
 */

"use client";

import { useState, useMemo } from "react";
import { Agent } from "@/types";
import { AgentCard } from "./agent-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Grid3x3, List, SortAsc, SortDesc } from "lucide-react";
import { DEFAULT_MODELS } from "@/constants";

interface AgentListProps {
  agents: Agent[];
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onDuplicate?: (agent: Agent) => void;
  onExport?: (agent: Agent) => void;
  onClick?: (agent: Agent) => void;
}

type ViewMode = "grid" | "list";
type SortField = "name" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

export function AgentList({
  agents,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onClick,
}: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterProvider, setFilterProvider] = useState<string>("all");

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.persona?.toLowerCase().includes(query)
      );
    }

    // Apply provider filter
    if (filterProvider !== "all") {
      filtered = filtered.filter((agent) => {
        const model = DEFAULT_MODELS.find((m) => m.id === agent.modelId);
        return model?.provider === filterProvider;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [agents, searchQuery, filterProvider, sortField, sortOrder]);

  const providers = useMemo(() => {
    const providerSet = new Set<string>();
    agents.forEach((agent) => {
      const model = DEFAULT_MODELS.find((m) => m.id === agent.modelId);
      if (model) {
        providerSet.add(model.provider);
      }
    });
    return Array.from(providerSet);
  }, [agents]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Provider Filter */}
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="updatedAt">Updated Date</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
        >
          {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>

        {/* View Mode Toggle */}
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="h-8 w-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-muted-foreground text-sm">
        {filteredAndSortedAgents.length} {filteredAndSortedAgents.length === 1 ? "agent" : "agents"}
        {searchQuery && " matching your search"}
      </div>

      {/* Agent Grid/List */}
      {filteredAndSortedAgents.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-lg font-medium">No agents found</p>
          <p className="mt-2 text-sm">
            {searchQuery ? "Try adjusting your search" : "Create your first agent to get started"}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4"
          }
        >
          {filteredAndSortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onExport={onExport}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
