/**
 * Multi-Agent Orchestration Types
 * 
 * Defines the types for multi-agent collaboration workflow:
 * 1. Initial Response: Each agent responds to user prompt
 * 2. Refinement: Each agent refines response based on others' responses
 * 3. Aggregation: Final response synthesized from all refined responses
 */

export interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
}

export interface RefinedResponse extends AgentResponse {
  originalResponse: string;
  refinementReason?: string;
}

export interface AggregatedResponse {
  finalContent: string;
  agentResponses: RefinedResponse[];
  timestamp: string;
}

export interface OrchestrationConfig {
  /** User's prompt */
  userPrompt: string;
  
  /** Agent IDs to use for this conversation */
  agentIds: string[];
  
  /** Whether to enable refinement phase (only for multi-agent) */
  enableRefinement?: boolean;
  
  /** Custom synthesis prompt for aggregator */
  synthesisPrompt?: string;
}

export interface OrchestrationResult {
  /** Final response to show to user */
  finalResponse: string;
  
  /** Individual agent responses (for debugging/transparency) */
  agentResponses: AgentResponse[];
  
  /** Refined responses (if refinement was enabled) */
  refinedResponses?: RefinedResponse[];
  
  /** Orchestration metadata */
  metadata: {
    agentCount: number;
    hadRefinementPhase: boolean;
    totalDuration: number; // milliseconds
  };
}
