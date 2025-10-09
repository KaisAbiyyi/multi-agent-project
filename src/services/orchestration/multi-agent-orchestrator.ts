/**
 * Multi-Agent Orchestration Service
 * 
 * Implements the multi-agent collaboration workflow:
 * 
 * SINGLE AGENT:
 * - Just send prompt and return response directly
 * 
 * MULTI-AGENT (2+ agents):
 * 1. Initial Response: Send prompt to all agents, collect responses
 * 2. Refinement: Each agent refines their response based on others' responses  
 * 3. Aggregation: Synthesize all refined responses into final answer
 */

import type { Agent } from '@/types';
import type {
  OrchestrationConfig,
  OrchestrationResult,
  AgentResponse,
  RefinedResponse,
} from '@/types/orchestration';
import { callAIModel } from '../api/ai-client';
import { getAgentById } from '../storage/agent-storage';
import { getAPIKeyById } from '../storage/api-key-storage';

/**
 * Main orchestration function
 * Routes to single or multi-agent flow based on agent count
 */
export async function orchestrateAgents(
  config: OrchestrationConfig
): Promise<OrchestrationResult> {
  console.log('[Orchestration] Starting with config:', config);
  const startTime = Date.now();

  // Load agents
  const agents = await Promise.all(
    config.agentIds.map(id => getAgentById(id))
  );
  const validAgents = agents.filter((a): a is Agent => a !== undefined);

  if (validAgents.length === 0) {
    throw new Error('No valid agents found');
  }

  console.log(`[Orchestration] Loaded ${validAgents.length} agent(s)`);

  // Single agent: simple direct response
  if (validAgents.length === 1) {
    const singleAgent = validAgents[0];
    if (!singleAgent) {
      throw new Error('Agent not found');
    }
    
    const result = await singleAgentFlow(singleAgent, config.userPrompt);
    return {
      ...result,
      metadata: {
        agentCount: 1,
        hadRefinementPhase: false,
        totalDuration: Date.now() - startTime,
      },
    };
  }

  // Multi-agent: full orchestration
  const result = await multiAgentFlow(validAgents, config);
  return {
    ...result,
    metadata: {
      agentCount: validAgents.length,
      hadRefinementPhase: config.enableRefinement !== false,
      totalDuration: Date.now() - startTime,
    },
  };
}

/**
 * Single agent flow: Direct prompt → response
 */
async function singleAgentFlow(
  agent: Agent,
  userPrompt: string
): Promise<Omit<OrchestrationResult, 'metadata'>> {
  console.log(`[Orchestration] Single agent flow for ${agent.name}`);

  const apiKey = agent.apiKeyId ? await getAPIKey(agent.apiKeyId) : undefined;

  const response = await callAIModel(
    agent,
    {
      prompt: userPrompt,
      systemPrompt: agent.persona,
    },
    apiKey
  );

  const agentResponse: AgentResponse = {
    agentId: agent.id,
    agentName: agent.name,
    content: response.content,
    timestamp: new Date().toISOString(),
  };

  return {
    finalResponse: response.content,
    agentResponses: [agentResponse],
  };
}

/**
 * Multi-agent flow: 
 * 1. Initial responses from all agents
 * 2. Refinement phase (each agent improves response)
 * 3. Aggregation (synthesize final answer)
 */
async function multiAgentFlow(
  agents: Agent[],
  config: OrchestrationConfig
): Promise<Omit<OrchestrationResult, 'metadata'>> {
  console.log(`[Orchestration] Multi-agent flow with ${agents.length} agents`);

  // Phase 1: Initial Responses
  console.log('[Orchestration] Phase 1: Getting initial responses...');
  const initialResponses = await getInitialResponses(agents, config.userPrompt);

  // Phase 2: Refinement (optional, default true)
  let refinedResponses: RefinedResponse[];
  if (config.enableRefinement !== false) {
    console.log('[Orchestration] Phase 2: Refining responses...');
    refinedResponses = await refineResponses(agents, config.userPrompt, initialResponses);
  } else {
    console.log('[Orchestration] Skipping refinement phase');
    refinedResponses = initialResponses.map(r => ({
      ...r,
      originalResponse: r.content,
    }));
  }

  // Phase 3: Aggregation
  console.log('[Orchestration] Phase 3: Aggregating responses...');
  const finalResponse = await aggregateResponses(
    config.userPrompt,
    refinedResponses,
    config.synthesisPrompt
  );

  return {
    finalResponse,
    agentResponses: initialResponses,
    refinedResponses,
  };
}

/**
 * Phase 1: Get initial response from each agent
 * All agents respond to the same user prompt simultaneously
 */
async function getInitialResponses(
  agents: Agent[],
  userPrompt: string
): Promise<AgentResponse[]> {
  const responses = await Promise.all(
    agents.map(async (agent) => {
      console.log(`[Orchestration] Getting initial response from ${agent.name}...`);
      
      const apiKey = agent.apiKeyId ? await getAPIKey(agent.apiKeyId) : undefined;

      try {
        const response = await callAIModel(
          agent,
          {
            prompt: userPrompt,
            systemPrompt: agent.persona,
          },
          apiKey
        );

        return {
          agentId: agent.id,
          agentName: agent.name,
          content: response.content,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`[Orchestration] Error from ${agent.name}:`, error);
        return {
          agentId: agent.id,
          agentName: agent.name,
          content: `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
          timestamp: new Date().toISOString(),
        };
      }
    })
  );

  console.log(`[Orchestration] Collected ${responses.length} initial responses`);
  return responses;
}

/**
 * Phase 2: Each agent refines their response
 * Each agent sees all other agents' responses and improves their own
 */
async function refineResponses(
  agents: Agent[],
  userPrompt: string,
  initialResponses: AgentResponse[]
): Promise<RefinedResponse[]> {
  const refinedResponses = await Promise.all(
    agents.map(async (agent, index) => {
      const myInitialResponse = initialResponses[index];
      if (!myInitialResponse) {
        throw new Error(`No initial response found for agent ${agent.name}`);
      }
      
      const otherResponses = initialResponses.filter((_, i) => i !== index);

      console.log(`[Orchestration] ${agent.name} refining response based on ${otherResponses.length} other agents...`);

      // Build refinement prompt
      const refinementPrompt = buildRefinementPrompt(
        userPrompt,
        myInitialResponse.content,
        otherResponses
      );

      const apiKey = agent.apiKeyId ? await getAPIKey(agent.apiKeyId) : undefined;

      try {
        const response = await callAIModel(
          agent,
          {
            prompt: refinementPrompt,
            systemPrompt: agent.persona,
          },
          apiKey
        );

        return {
          agentId: agent.id,
          agentName: agent.name,
          content: response.content,
          originalResponse: myInitialResponse.content,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`[Orchestration] Error refining for ${agent.name}:`, error);
        // Fallback to original response if refinement fails
        return {
          agentId: myInitialResponse.agentId,
          agentName: myInitialResponse.agentName,
          content: myInitialResponse.content,
          originalResponse: myInitialResponse.content,
          timestamp: myInitialResponse.timestamp,
        };
      }
    })
  );

  console.log(`[Orchestration] Collected ${refinedResponses.length} refined responses`);
  return refinedResponses;
}

/**
 * Phase 3: Aggregate all refined responses into final answer
 * Use first agent as aggregator (or a dedicated synthesis model)
 */
async function aggregateResponses(
  userPrompt: string,
  refinedResponses: RefinedResponse[],
  customSynthesisPrompt?: string
): Promise<string> {
  console.log('[Orchestration] Aggregating responses...');

  if (refinedResponses.length === 0) {
    return 'No responses to aggregate';
  }

  // Build aggregation prompt
  const aggregationPrompt = buildAggregationPrompt(
    userPrompt,
    refinedResponses,
    customSynthesisPrompt
  );

  // Use first agent as aggregator
  const firstResponse = refinedResponses[0];
  if (!firstResponse) {
    return refinedResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n');
  }
  
  const firstAgent = await getAgentById(firstResponse.agentId);
  if (!firstAgent) {
    // Fallback: just concatenate responses
    return refinedResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n');
  }

  const apiKey = firstAgent.apiKeyId ? await getAPIKey(firstAgent.apiKeyId) : undefined;

  try {
    const response = await callAIModel(
      firstAgent,
      {
        prompt: aggregationPrompt,
        systemPrompt: 'You are an expert at synthesizing multiple perspectives into a coherent, comprehensive response. Combine the insights from different agents while maintaining clarity and accuracy.',
      },
      apiKey
    );

    console.log('[Orchestration] Aggregation complete');
    return response.content;
  } catch (error) {
    console.error('[Orchestration] Error in aggregation:', error);
    // Fallback: concatenate responses
    return refinedResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n');
  }
}

/**
 * Build refinement prompt for an agent
 */
function buildRefinementPrompt(
  userPrompt: string,
  myResponse: string,
  otherResponses: AgentResponse[]
): string {
  return `Original User Question:
${userPrompt}

Your Initial Response:
${myResponse}

Other Agents' Responses:
${otherResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n')}

---

Now, please refine and improve your response by considering the perspectives and insights from the other agents. Maintain your unique viewpoint while incorporating valuable points from others. Provide only your refined answer without meta-commentary.`;
}

/**
 * Build aggregation prompt
 */
function buildAggregationPrompt(
  userPrompt: string,
  refinedResponses: RefinedResponse[],
  customPrompt?: string
): string {
  const defaultPrompt = customPrompt || 
    'Synthesize the following responses into a single, comprehensive answer that captures the best insights from all agents.';

  return `Original User Question:
${userPrompt}

Agent Responses:
${refinedResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n')}

---

${defaultPrompt}

Provide a clear, well-structured final answer:`;
}

/**
 * Helper: Get API key
 */
async function getAPIKey(apiKeyId: string): Promise<string | undefined> {
  const key = await getAPIKeyById(apiKeyId);
  return key?.key;
}
