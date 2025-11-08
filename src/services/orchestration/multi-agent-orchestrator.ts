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
import { buildRuntimeDateDirective, formatHumanDate } from '@/lib/time-utils';

export function composeSystemPrompt(agent: Agent, options?: { currentDate?: Date }): string {
  const nameReminder = `You are known as ${agent.name}. I will call you ${agent.name}.`;
  const persona = agent.persona?.trim();
  const runtimeDate = options?.currentDate ?? new Date();
  const directive = buildRuntimeDateDirective(runtimeDate);
  const basePrompt = persona ? `${persona}

${nameReminder}` : nameReminder;

  return `${basePrompt}

${directive}`;
}

/**
 * Main orchestration function
 * Routes to single or multi-agent flow based on agent count
 */
export async function orchestrateAgents(
  config: OrchestrationConfig
): Promise<OrchestrationResult> {
  console.log('[Orchestration] Starting with config:', config);
  const startTime = Date.now();
  const runtimeDate = new Date();

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
    
    const result = await singleAgentFlow(singleAgent, config.userPrompt, runtimeDate);
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
  const result = await multiAgentFlow(validAgents, config, runtimeDate);
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
  userPrompt: string,
  runtimeDate: Date
): Promise<Omit<OrchestrationResult, 'metadata'>> {
  console.log(`[Orchestration] Single agent flow for ${agent.name}`);

  const apiKey = agent.apiKeyId ? await getAPIKey(agent.apiKeyId) : undefined;

    const response = await callAIModel(
      agent,
      {
        prompt: userPrompt,
        systemPrompt: composeSystemPrompt(agent, { currentDate: runtimeDate }),
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
  config: OrchestrationConfig,
  runtimeDate: Date
): Promise<Omit<OrchestrationResult, 'metadata'>> {
  console.log(`[Orchestration] Multi-agent flow with ${agents.length} agents`);

  // Phase 1: Initial Responses
  console.log('[Orchestration] Phase 1: Getting initial responses...');
  const initialResponses = await getInitialResponses(agents, config.userPrompt, runtimeDate);

  // Phase 2: Refinement (optional, default true)
  let refinedResponses: RefinedResponse[];
  if (config.enableRefinement !== false) {
    console.log('[Orchestration] Phase 2: Refining responses...');
    refinedResponses = await refineResponses(agents, config.userPrompt, initialResponses, runtimeDate);
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
    config.synthesisPrompt,
    runtimeDate
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
  userPrompt: string,
  runtimeDate: Date
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
            systemPrompt: composeSystemPrompt(agent, { currentDate: runtimeDate }),
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
  initialResponses: AgentResponse[],
  runtimeDate: Date
): Promise<RefinedResponse[]> {
  const refinedResponses: RefinedResponse[] = [];
  const latestResponses = new Map<string, AgentResponse>(
    initialResponses.map((response) => [response.agentId, response])
  );

  for (const agent of agents) {
    const myInitialResponse = initialResponses.find((response) => response.agentId === agent.id);
    if (!myInitialResponse) {
      throw new Error(`No initial response found for agent ${agent.name}`);
    }

    const otherResponses: AgentResponse[] = agents
      .filter((other) => other.id !== agent.id)
      .map((other) => {
        const latest = latestResponses.get(other.id);
        if (latest) {
          return latest;
        }

        const fallback = initialResponses.find((response) => response.agentId === other.id);
        if (fallback) {
          return fallback;
        }

        return {
          agentId: other.id,
          agentName: other.name,
          content: '',
          timestamp: new Date().toISOString(),
        };
      });

    console.log(
      `[Orchestration] ${agent.name} refining response based on ${otherResponses.length} other agents...`
    );

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
          systemPrompt: composeSystemPrompt(agent, { currentDate: runtimeDate }),
        },
        apiKey
      );

      const refinedResponse: RefinedResponse = {
        agentId: agent.id,
        agentName: agent.name,
        content: response.content,
        originalResponse: myInitialResponse.content,
        timestamp: new Date().toISOString(),
      };

      refinedResponses.push(refinedResponse);
      latestResponses.set(agent.id, {
        agentId: refinedResponse.agentId,
        agentName: refinedResponse.agentName,
        content: refinedResponse.content,
        timestamp: refinedResponse.timestamp,
      });
    } catch (error) {
      console.error(`[Orchestration] Error refining for ${agent.name}:`, error);
      refinedResponses.push({
        agentId: myInitialResponse.agentId,
        agentName: myInitialResponse.agentName,
        content: myInitialResponse.content,
        originalResponse: myInitialResponse.content,
        timestamp: myInitialResponse.timestamp,
      });
      latestResponses.set(myInitialResponse.agentId, myInitialResponse);
    }
  }

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
  customSynthesisPrompt: string | undefined,
  runtimeDate: Date
): Promise<string> {
  console.log('[Orchestration] Aggregating responses...');

  if (refinedResponses.length === 0) {
    return 'No responses to aggregate';
  }

  // Build aggregation prompt
  const aggregationPrompt = buildAggregationPrompt(
    userPrompt,
    refinedResponses,
    customSynthesisPrompt,
    { currentDate: runtimeDate }
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
    const systemPromptOverride =
      firstAgent.persona ||
      'You are a neutral synthesis expert. Resolve disagreements, preserve the strongest evidence, and present a confident, user-facing answer in natural language without mentioning the deliberation process or the individual agents.';

    const response = await callAIModel(
      firstAgent,
      {
        prompt: aggregationPrompt,
        systemPrompt: `${systemPromptOverride.trim()}\n\n${buildRuntimeDateDirective(runtimeDate)}`,
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
export function buildRefinementPrompt(
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

With care and intellectual honesty, improve your answer by:
- Stress-testing your assumptions against the strongest counterpoints raised by the other agents.
- Explicitly addressing any disagreements, filling in missing evidence, or correcting mistakes (yours or theirs).
- Bringing forward novel insights that move the whole group closer to an excellent solution.

Preserve your own voice while acknowledging where another agent has a better argument or data. Provide only your refined answer without meta-commentary.`;
}

/**
 * Build aggregation prompt
 */
export function buildAggregationPrompt(
  userPrompt: string,
  refinedResponses: RefinedResponse[],
  customPrompt?: string,
  options?: { currentDate?: Date }
): string {
  const defaultPrompt =
    customPrompt ||
    'Develop a single, trustworthy answer that resolves disagreements, highlights the most useful reasoning, and communicates next steps in clear, natural language. Do not reference the agents or the debate explicitly—deliver the result as if you are the expert speaking directly to the user.';

  const runtimeDate = options?.currentDate ?? new Date();
  const runtimeLine = `Current runtime date: ${formatHumanDate(runtimeDate)} (${runtimeDate.toISOString()})`;
  const temporalInstructions =
    'Interpret any relative time expressions in the agent responses using this runtime date. When summarizing, cite explicit dates from sources whenever possible.';

  return `Original User Question:
${userPrompt}

Agent Responses:
${refinedResponses.map(r => `**${r.agentName}:**\n${r.content}`).join('\n\n')}

---

${defaultPrompt}

${runtimeLine}
${temporalInstructions}

Provide a clear, well-structured final answer:`;
}

/**
 * Helper: Get API key
 */
async function getAPIKey(apiKeyId: string): Promise<string | undefined> {
  const key = await getAPIKeyById(apiKeyId);
  return key?.key;
}

