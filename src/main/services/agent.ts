import type { IPCResponse, IPCAgentMessage } from '../../shared/ipc';
import { executeIntent } from './intentExecutor';
import { aiService } from '../../services/aiService';
import { getFullContext } from '../db/queries';

/**
 * Agent Orchestrator Service (Day 5)
 *
 * Wires together the complete AI pipeline:
 * Message → Intent Detection → Ollama (TinyLLaMA) → Intent Executor → Result
 *
 * This is the conductor that orchestrates all pieces working together.
 */

interface AgentPipelineStep {
  name: string;
  duration: number;
}

/**
 * Main agent function: Orchestrates the complete AI pipeline
 */
export async function runAgent(userMessage: string): Promise<IPCResponse<IPCAgentMessage>> {
  const startTime = Date.now();
  const steps: AgentPipelineStep[] = [];

  try {
    console.info('[Agent] Pipeline started', { message: userMessage.substring(0, 50) });

    // STEP 1: Get day context
    const step1Start = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const context = getFullContext(today);
    steps.push({ name: 'GetContext', duration: Date.now() - step1Start });

    console.debug('[Agent] Step 1 complete: Context retrieved', {
      tasks: context.tasks.length,
      sessions: context.sessions.length,
      goals: context.goals.length,
    });

    // STEP 2: Parse user message to detect intent
    const step2Start = Date.now();
    
    // Check for timer/study session requests (multiple formats supported)
    // Formats: "1h Math", "30min DSA", "start timer for 5 minutes", "5 minutes of study", etc.
    
    // First check for timer-only patterns (no subject extraction)
    let timerOnlyMatch = null;
    let timerDuration = null;
    
    if (userMessage.toLowerCase().includes('timer')) {
      // "start timer for 5 minutes", "5 minutes timer", "timer 10 min"
      timerOnlyMatch = userMessage.match(/(\d+)\s*(h|hour|min|minute)s?/i);
      if (timerOnlyMatch) {
        const dur = parseInt(timerOnlyMatch[1]);
        const unit = timerOnlyMatch[2].toLowerCase()[0]; // 'h' or 'm'
        timerDuration = unit === 'h' ? dur * 60 : dur;
      }
    }
    
    // If no timer pattern, check for "Xh/min Subject" pattern
    let timeLogMatch = null;
    if (!timerOnlyMatch) {
      timeLogMatch = userMessage.match(/(\d+)\s*(h|hour|min|minute)s?\s+([a-zA-Z].+)/i);
    }
    
    let structuredResponse: IPCAgentMessage;

    if (timerDuration) {
      // User started a timer without explicit subject (e.g., "start timer for 5 minutes")
      const motivation = await aiService.getMotivation(context.sessions.length + 1);

      structuredResponse = {
        action: 'log_session',
        data: {
          subject: 'Focus Session',
          durationMinutes: timerDuration,
          notes: userMessage,
        },
        reply: `Starting ${timerDuration}-minute focus timer! ${motivation}`,
      };

      console.log('[Agent] Created timer session response');
    } else if (timeLogMatch) {
      // User is logging study session (explicit subject provided)
      const durationStr = timeLogMatch[1];
      const unit = timeLogMatch[2].toLowerCase()[0]; // 'h' or 'm'
      const subject = timeLogMatch[3].trim();
      const durationMinutes = unit === 'h' ? parseInt(durationStr) * 60 : parseInt(durationStr);

      console.log('[Agent] Detected study session log:', { subject, durationMinutes });

      // Get AI motivation for logging this session
      const motivation = await aiService.getMotivation(context.sessions.length + 1);

      // Create structured response
      structuredResponse = {
        action: 'log_session',
        data: {
          subject,
          durationMinutes,
          notes: userMessage,
        },
        reply: `Great! I've logged ${durationMinutes} minutes of ${subject}. ${motivation}`,
      };

      console.log('[Agent] Created log_session response');
    } else if (
      userMessage.toLowerCase().includes('schedule') ||
      userMessage.toLowerCase().includes('plan') ||
      userMessage.toLowerCase().includes('import')
    ) {
      // User asking about schedule
      const scheduleInfo = context.tasks
        .map(t => `${t.name}`)
        .join(', ') || 'No tasks planned yet';

      const analysis = await aiService.understandSchedule(scheduleInfo);

      structuredResponse = {
        action: 'ask_clarification',
        data: { scheduleAnalysis: analysis },
        reply: `Your study plan: ${analysis}`,
      };

      console.log('[Agent] Created schedule analysis response');
    } else if (
      userMessage.toLowerCase().includes('next') ||
      userMessage.toLowerCase().includes('what should') ||
      userMessage.toLowerCase().includes('what do')
    ) {
      // User asking what to do next
      const plannedText = context.tasks
        .map(t => t.name)
        .join(', ') || 'No tasks planned';
      const completedText = context.sessions
        .map(s => `${s.duration_minutes}min`)
        .join(', ') || 'No sessions yet';

      const nextAction = await aiService.getProgress(plannedText, completedText);

      structuredResponse = {
        action: 'ask_clarification',
        data: { nextAction },
        reply: `Next: ${nextAction}`,
      };

      console.log('[Agent] Created progress response');
    } else {
      // General message - provide motivation
      const motivation = await aiService.getMotivation(context.sessions.length);

      structuredResponse = {
        action: 'ask_clarification',
        data: { motivation },
        reply: motivation,
      };

      console.log('[Agent] Created motivation response');
    }

    steps.push({ name: 'ParseAndRespond', duration: Date.now() - step2Start });

    console.debug('[Agent] Step 2 complete: Response prepared', {
      action: structuredResponse.action,
    });

    // STEP 3: Execute intent and update database if needed
    const step3Start = Date.now();
    const result = executeIntent(JSON.stringify(structuredResponse));
    steps.push({ name: 'ExecuteIntent', duration: Date.now() - step3Start });

    console.debug('[Agent] Step 3 complete: Intent executed', {
      action: result.action,
    });

    // Log full pipeline
    const totalDuration = Date.now() - startTime;
    console.info('[Agent] Pipeline complete', {
      totalDuration,
      steps: steps.map((s) => `${s.name}(${s.duration}ms)`).join(' → '),
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[Agent] Pipeline error:', error);

    return {
      success: false,
      error: 'An unexpected error occurred in the agent pipeline',
    };
  }
}

/**
 * Get available models info (for debugging/UI)
 */
export function getAgentStatus(): {
  initialized: boolean;
  aiServiceReady: boolean;
  model: string;
} {
  return {
    initialized: aiService.isInitialized(),
    aiServiceReady: aiService.isInitialized(),
    model: 'TinyLLaMA (Ollama - Local)',
  };
}
