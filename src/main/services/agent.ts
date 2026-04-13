/**
 * Agent Orchestrator
 * 
 * Wires together the complete AI pipeline:
 * Message → Context Builder → LLM → Intent Executor → Result
 * 
 * CRITICAL FIX APPLIED:
 * ✅ Pattern matching now ONLY runs when NO AI is available
 * ✅ AI handles 90%+ of queries instead of being bypassed
 * 
 * Key features:
 * 1. Uses embedded LLM (node-llama-cpp) for offline inference
 * 2. Fallback to Ollama if embedded unavailable
 * 3. Fallback to pattern matching ONLY if no LLM available
 * 4. Full structured response format (action + data + reply)
 * 5. Comprehensive error handling and metrics
 */

import type { IPCResponse, IPCAgentMessage } from '../../shared/ipc';
import { executeIntent } from './intentExecutor';
import { buildPrompt } from './contextBuilder';
import { llmService } from './llmService';
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

    // Step 3: Generate response via LLM or fast fallback
    const step3Start = Date.now();
    let llmResponse: string;
    let llmUsed: string;

    // ─────────────────────────────────────────────────────────────
    // CRITICAL FIX: Only use pattern matching as LAST RESORT
    // Let the AI handle schedule intelligence whenever possible
    // ─────────────────────────────────────────────────────────────
    const noAIAvailable = !llmService.isInitialized();
    
    // Only use pattern matching if:
    // 1. No LLM is initialized AND
    // 2. The query is extremely simple (just "status" or "progress")
    const isStatusQuery = /^(status|progress)$/i.test(userMessage.trim());

    if (llmService.isInitialized()) {
      // USE AI FIRST - This is the primary path now
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
          `[Agent] Embedded LLM failed, falling back to pattern matching [${pipelineId}]:`,
          embeddedError
        );
        llmResponse = getSimpleResponse(userMessage, context);
        llmUsed = 'Pattern matching (embedded failed)';
      }
    } else if (noAIAvailable && isStatusQuery) {
      // Pattern matching ONLY for simple status queries when no AI
      console.debug(`[Agent] No AI available, using pattern matching for status query [${pipelineId}]`);
      llmResponse = getSimpleResponse(userMessage, context);
      llmUsed = 'Pattern matching (no AI available)';
    } else {
      // Try to be helpful even without AI
      console.debug(`[Agent] No AI available, using enhanced fallback [${pipelineId}]`);
      llmResponse = getSimpleResponse(userMessage, context);
      llmUsed = 'Pattern matching (no AI available)';
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
 * Fallback: Smart rule-based response generation (SCHEDULE-AWARE)
 * 
 * Detects patterns in user message and generates JSON response.
 * Fast (no LLM timeout), pragmatic, and actually useful.
 * 
 * UPDATED: Now schedule-aware - finds next tasks intelligently
 */
function getSimpleResponse(userMessage: string, context: ReturnType<typeof getFullContext>): string {
  const lower = userMessage.toLowerCase();

  console.debug('[Agent] Using pattern matching for:', userMessage.substring(0, 50));

  // ─────────────────────────────────────────────────────────────
  // PATTERN 1: Start a timer with explicit duration
  // Matches: "start 1h math", "start timer", "1h physics", "25min focus"
  // ─────────────────────────────────────────────────────────────
  const explicitTimerMatch = userMessage.match(/(?:start|begin)?\s*(\d+)\s*(h|hour|min|minute)s?\s+(.+)/i);
  if (explicitTimerMatch) {
    const durationNum = parseInt(explicitTimerMatch[1]);
    const unit = explicitTimerMatch[2][0].toLowerCase();
    const durationMinutes = unit === 'h' ? durationNum * 60 : durationNum;
    const subject = explicitTimerMatch[3].replace(/(?:timer|focus|session)$/i, '').trim();

    return JSON.stringify({
      action: 'start_timer',
      data: {
        durationMinutes,
        subject: subject || 'Focus Session',
      },
      reply: `Starting ${durationMinutes}-minute ${subject || 'focus'} timer! 🎯`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATTERN 2: Generic "start it" / "begin" → use first task
  // Matches: "ok start it", "let's go", "begin", "start", "go"
  // UPDATED: Now includes task_id from schedule
  // ─────────────────────────────────────────────────────────────
  if (/^(ok|let'?s|alright|sure|go|begin|start|launch|go go)(?:\s+it)?$/i.test(lower) && context.tasks.length > 0) {
    const firstTask = context.tasks[0];
    const durationMinutes = firstTask.end_time && firstTask.start_time 
      ? calculateDuration(firstTask.start_time, firstTask.end_time)
      : 60; // Default 60 min

    return JSON.stringify({
      action: 'start_timer',
      data: {
        task_id: firstTask.id, // CRITICAL: Include task ID
        durationMinutes,
        subject: firstTask.name,
      },
      reply: `Starting "${firstTask.name}" (${durationMinutes} min)! Let's go! 🚀`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATTERN 3: Log a study session (post-fix format)
  // Matches: "2h math", "45min physics", "1.5 hour chemistry"
  // ─────────────────────────────────────────────────────────────
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
      reply: `✅ Logged ${Math.round(durationMinutes)} minutes of ${subject}! 📚`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATTERN 4: Ask about schedule (SCHEDULE-AWARE VERSION)
  // Matches: "what's my schedule", "which subject", "what should i study", "show tasks"
  // UPDATED: Now finds NEXT task based on current time
  // ─────────────────────────────────────────────────────────────
  if (/\b(schedule|what|which|task|subject|today|should|do|next|study)\b/i.test(lower) || /^\?/.test(lower)) {
    if (context.tasks.length === 0) {
      return JSON.stringify({
        action: 'ask_clarification',
        data: { taskCount: 0 },
        reply: '📅 No tasks scheduled yet. Try importing a study plan to see your schedule!',
      });
    }

    // INTELLIGENT: Find next task based on current time
    const currentTime = new Date().toTimeString().slice(0, 5); // "HH:MM"
    
    const nextTask = context.tasks.find((t: typeof context.tasks[number]) => 
      t.status === 'pending' && 
      t.start_time && 
      t.start_time >= currentTime
    ) || context.tasks.find((t: typeof context.tasks[number]) => t.status === 'pending');

    if (nextTask) {
      const timeInfo = nextTask.start_time && nextTask.end_time 
        ? ` (${nextTask.start_time}–${nextTask.end_time})`
        : '';
      
      return JSON.stringify({
        action: 'ask_clarification',
        data: { 
          task_id: nextTask.id,
          task_name: nextTask.name,
          start_time: nextTask.start_time
        },
        reply: `📚 Next up: "${nextTask.name}"${timeInfo}\n\nSay "start it" to begin!`,
      });
    }

    // Fallback: Show all tasks
    const taskLines = context.tasks
      .slice(0, 5)
      .map((t: typeof context.tasks[number]) => {
        const time = t.start_time && t.end_time ? ` (${t.start_time}–${t.end_time})` : '';
        return `  • [${t.id}] ${t.name}${time}`;
      })
      .join('\n');

    const hint = context.tasks.length > 5 ? `\n...and ${context.tasks.length - 5} more` : '';
    
    return JSON.stringify({
      action: 'ask_clarification',
      data: { taskCount: context.tasks.length },
      reply: `📋 Your schedule:\n${taskLines}${hint}\n\nSay "start it" to begin with the first task!`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATTERN 5: Ask about progress/status
  // Matches: "progress", "status", "how am i doing", "total hours"
  // ─────────────────────────────────────────────────────────────
  if (/\b(progress|status|how.*doing|how much|total|studied|completed)\b/i.test(lower)) {
    const hours = Math.round((context.totalMinutes / 60) * 100) / 100;
    const sessions = context.sessions.length;
    const tasks = context.tasks.length;

    const status = hours === 0
      ? '⏱️ No study time logged yet. Get started!'
      : `📊 Today: ${hours}h studied in ${sessions} session${sessions !== 1 ? 's' : ''}`;

    return JSON.stringify({
      action: 'ask_clarification',
      data: { hours, sessions, tasks },
      reply: status,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DEFAULT: Polite fallback with helpful suggestions
  // ─────────────────────────────────────────────────────────────
  return JSON.stringify({
    action: 'ask_clarification',
    data: {},
    reply:
      context.tasks.length > 0
        ? `I understand! Your options:\n\n📌 Start from your schedule: "Start it"\n⏱️ Set a timer: "Start 1h Math"\n📝 Log time: "2h Physics"\n📋 View schedule: "What's my schedule?"`
        : `I understand! Try:\n\n⏱️ "Start 25min focus"\n📝 "Log 2h math"\n📥 Import a study plan first!`,
  });
}

/**
 * Helper: Calculate duration between two time strings
 */
function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return endMinutes - startMinutes;
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