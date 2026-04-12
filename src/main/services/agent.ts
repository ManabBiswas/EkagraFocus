/**
 * Agent Orchestrator
 * 
 * Wires together the complete AI pipeline:
 * Message → Context Builder → LLM → Intent Executor → Result
 * 
 * Key features:
 * 1. Uses embedded LLM (node-llama-cpp) for offline inference
 * 2. Fallback to Ollama if embedded unavailable
 * 3. Fallback to pattern matching if no LLM available
 * 4. Full structured response format (action + data + reply)
 * 5. Comprehensive error handling and metrics
 */

import type { IPCResponse, IPCAgentMessage } from '../../shared/ipc';
import { executeIntent } from './intentExecutor';
import { buildPrompt } from './contextBuilder';
import { llmService, generateViaOllama } from './llmService';
import { getFullContext } from '../db/queries';

interface AgentPipelineMetrics {
  messageLength: number;
  contextSize: number;
  llmUsed: string;
  generationTime: number;
  success: boolean;
}

const metrics: AgentPipelineMetrics[] = [];

/**
 * Main agent function: Orchestrates complete AI pipeline
 * 
 * @param userMessage - Raw text from user chat input
 * @returns Structured response with action and reply
 */
export async function runAgent(userMessage: string): Promise<IPCResponse<IPCAgentMessage>> {
  const startTime = Date.now();
  const pipelineId = `agent_${Date.now()}`;

  try {
    console.info(`[Agent] Pipeline started [${pipelineId}]`, {
      message: userMessage.substring(0, 50),
    });

    // Step 1: Get today's fresh context from database
    const step1Start = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const context = getFullContext(today);
    const contextTime = Date.now() - step1Start;

    console.debug(`[Agent] Context loaded [${pipelineId}]`, {
      tasks: context.tasks.length,
      sessions: context.sessions.length,
      goals: context.goals.length,
      totalMinutes: context.totalMinutes,
      time: `${contextTime}ms`,
    });

    // Step 2: Build prompt for LLM
    const step2Start = Date.now();
    const prompt = buildPrompt(userMessage, context);
    const promptTime = Date.now() - step2Start;

    console.debug(`[Agent] Prompt built [${pipelineId}]`, {
      promptLength: prompt.length,
      time: `${promptTime}ms`,
    });

    // Step 3: Generate response via LLM
    const step3Start = Date.now();
    let llmResponse: string;
    let llmUsed: string;

    if (llmService.isInitialized()) {
      // Try embedded LLM first
      try {
        console.debug(`[Agent] Calling embedded LLM [${pipelineId}]`);
        llmResponse = await llmService.generateResponse(prompt, {
          temperature: 0.7,
          maxTokens: 512,
        });
        llmUsed = 'node-llama-cpp (embedded)';
        console.info(`[Agent] ✓ Embedded LLM response received [${pipelineId}]`);
      } catch (embeddedError) {
        console.warn(
          `[Agent] Embedded LLM failed, trying Ollama fallback [${pipelineId}]:`,
          embeddedError
        );

        // Try Ollama fallback
        const ollamaResponse = await generateViaOllama(prompt, 'tinyllama');
        if (ollamaResponse) {
          llmResponse = ollamaResponse;
          llmUsed = 'Ollama (fallback)';
          console.info(`[Agent] ✓ Ollama response received [${pipelineId}]`);
        } else {
          // Both failed, use simple pattern matching
          llmResponse = getSimpleResponse(userMessage, context);
          llmUsed = 'Pattern matching (fallback)';
          console.warn(`[Agent] Both LLM backends failed, using pattern matching [${pipelineId}]`);
        }
      }
    } else {
      // LLM not available, try Ollama
      console.debug(`[Agent] Embedded LLM not available, trying Ollama [${pipelineId}]`);
      const ollamaResponse = await generateViaOllama(prompt, 'tinyllama');

      if (ollamaResponse) {
        llmResponse = ollamaResponse;
        llmUsed = 'Ollama';
        console.info(`[Agent] ✓ Ollama response received [${pipelineId}]`);
      } else {
        // No LLM available, use simple rules
        llmResponse = getSimpleResponse(userMessage, context);
        llmUsed = 'Pattern matching (no LLM)';
        console.warn(`[Agent] No LLM available, using pattern matching [${pipelineId}]`);
      }
    }

    const generationTime = Date.now() - step3Start;

    console.debug(`[Agent] Response generated [${pipelineId}]`, {
      llmUsed,
      responseLength: llmResponse.length,
      time: `${generationTime}ms`,
    });

    // Step 4: Parse and execute intent
    const step4Start = Date.now();
    const result = executeIntent(llmResponse);
    const executionTime = Date.now() - step4Start;

    const totalTime = Date.now() - startTime;

    console.info(`[Agent] Pipeline complete [${pipelineId}]`, {
      action: result.action,
      totalTime: `${totalTime}ms`,
      breakdown: {
        context: `${contextTime}ms`,
        prompt: `${promptTime}ms`,
        llm: `${generationTime}ms`,
        execution: `${executionTime}ms`,
      },
      llmUsed,
    });

    // Record metrics
    metrics.push({
      messageLength: userMessage.length,
      contextSize: context.tasks.length + context.sessions.length,
      llmUsed,
      generationTime: totalTime,
      success: true,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[Agent] Pipeline error [${pipelineId}]:`, error);

    const totalTime = Date.now() - startTime;
    metrics.push({
      messageLength: userMessage.length,
      contextSize: 0,
      llmUsed: 'error',
      generationTime: totalTime,
      success: false,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Agent pipeline failed',
    };
  }
}

/**
 * Fallback: Simple rule-based response generation
 * 
 * Detects patterns in user message and generates JSON response
 * Used when LLM is unavailable
 */
function getSimpleResponse(userMessage: string, context: any): string {
  const lower = userMessage.toLowerCase();

  console.debug('[Agent] Using pattern matching for:', userMessage.substring(0, 50));

  // Pattern 1: Start a timer
  // Matches: "start timer", "start 1h math", "begin 30min chemistry"
  const timerStartMatch = /\b(start|begin|run|launch)\b.*\b(timer|focus|session)\b/i.test(lower);
  
  if (timerStartMatch) {
    // Extract duration
    const durationMatch = userMessage.match(/(\d+)\s*(h|hour|min|minute)s?/i);
    const durationMinutes = durationMatch
      ? parseInt(durationMatch[1]) * (durationMatch[2][0].toLowerCase() === 'h' ? 60 : 1)
      : 25; // Default 25-min Pomodoro

    // Extract subject
    let subject = 'Focus Session';
    const subjectMatch = userMessage.match(/(?:start|begin|run)\s+(?:\d+\s*(?:h|min))?\s*(.+?)(?:\s+(?:timer|focus|session))?$/i);
    if (subjectMatch && subjectMatch[1]) {
      subject = subjectMatch[1].trim();
    }

    return JSON.stringify({
      action: 'start_timer',
      data: {
        durationMinutes,
        subject,
      },
      reply: `Starting ${durationMinutes}-minute ${subject} timer! 🎯`,
    });
  }

  // Pattern 2: Log a study session
  // Matches: "2h math", "1.5 hours physics", "45min chemistry"
  const logSessionMatch = userMessage.match(/^(\d+(?:\.\d+)?)\s*(h|hour|min|minute)s?\s+(.+)$/i);
  
  if (logSessionMatch) {
    const durationNum = parseFloat(logSessionMatch[1]);
    const unit = logSessionMatch[2][0].toLowerCase();
    const durationMinutes = unit === 'h' ? durationNum * 60 : durationNum;
    const subject = logSessionMatch[3].trim();

    return JSON.stringify({
      action: 'log_session',
      data: {
        subject,
        durationMinutes: Math.round(durationMinutes),
      },
      reply: `Logged ${durationMinutes} minutes of ${subject}! 📚`,
    });
  }

  // Pattern 3: Ask about schedule/plan
  if (/\b(schedule|plan|what.*study|what.*next|what.*do)\b/i.test(lower)) {
    const taskList = context.tasks
      .slice(0, 3)
      .map((t: any) => `• ${t.name}`)
      .join('\n');

    const reply =
      taskList.length > 0
        ? `Your schedule:\n${taskList}\n\nWould you like to start one of these?`
        : 'No tasks scheduled yet. Try importing a study plan!';

    return JSON.stringify({
      action: 'ask_clarification',
      data: { taskCount: context.tasks.length },
      reply,
    });
  }

  // Pattern 4: Get progress/status
  if (/\b(progress|status|how.*going|how much|total)\b/i.test(lower)) {
    const hours = Math.round((context.totalMinutes / 60) * 100) / 100;
    const sessions = context.sessions.length;

    return JSON.stringify({
      action: 'ask_clarification',
      data: { hours, sessions },
      reply: `Today's progress: ${hours}h in ${sessions} sessions. Keep it up! 💪`,
    });
  }

  // Default: Ask for clarification
  return JSON.stringify({
    action: 'ask_clarification',
    data: {},
    reply:
      'I understand. You can:\n• Start a timer: "Start 1h Math"\n• Log time: "2h Physics"\n• Check schedule: "What\'s my schedule?"',
  });
}

/**
 * Get agent performance metrics
 */
export function getAgentMetrics() {
  if (metrics.length === 0) return null;

  const successfulRuns = metrics.filter(m => m.success);
  const avgTime =
    successfulRuns.reduce((sum, m) => sum + m.generationTime, 0) /
    Math.max(successfulRuns.length, 1);

  return {
    totalRequests: metrics.length,
    successRate: `${Math.round((successfulRuns.length / metrics.length) * 100)}%`,
    averageResponseTime: `${Math.round(avgTime)}ms`,
    mostUsed: getMostCommonLLM(),
  };
}

function getMostCommonLLM(): string {
  const llmCounts: Record<string, number> = {};
  
  metrics.forEach(m => {
    if (m.llmUsed) {
      llmCounts[m.llmUsed] = (llmCounts[m.llmUsed] || 0) + 1;
    }
  });

  const mostUsed = Object.entries(llmCounts).sort(([, a], [, b]) => b - a)[0];
  return mostUsed ? `${mostUsed[0]} (${mostUsed[1]} times)` : 'None';
}

/**
 * Reset metrics (useful for testing)
 */
export function resetAgentMetrics(): void {
  metrics.length = 0;
  console.debug('[Agent] Metrics reset');
}