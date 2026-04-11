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
    // Formats: "1h Math", "30min DSA", "start timer for 5 minutes", "start the timer", "start 1h math timer", etc.
    
    // First check if user is starting a timer (match messages containing start/begin/run and timer/focus)
    const isTimerRequest = /\b(start|begin|run|launch)\b.*\b(timer|focus session|focus)\b/i.test(userMessage);
    let timerDuration = null;
    let timerSubject = 'Focus Session';
    
    if (isTimerRequest) {
      // Try to extract duration and subject from timer request
      // Patterns: "start 1h math timer", "start 30min DSA focus", etc.
      const detailedMatch = userMessage.match(/\b(start|begin|run|launch)\s+(\d+)\s*(h|hour|min|minute)s?\s+(.+?)\s+(timer|focus|studying)/i);
      
      if (detailedMatch) {
        // Extracted: [1]="start", [2]="1", [3]="h", [4]="math", [5]="timer"
        const dur = parseInt(detailedMatch[2]);
        const unit = detailedMatch[3].toLowerCase()[0]; // 'h' or 'm'
        timerDuration = unit === 'h' ? dur * 60 : dur;
        timerSubject = detailedMatch[4].trim();
        console.debug('[Agent] Timer with subject:', { duration: timerDuration, subject: timerSubject });
      } else {
        // Try to extract just duration without subject
        const durationMatch = userMessage.match(/(\d+)\s*(h|hour|min|minute)s?/i);
        if (durationMatch) {
          const dur = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase()[0]; // 'h' or 'm'
          timerDuration = unit === 'h' ? dur * 60 : dur;
        } else {
          // No duration specified - use 25-minute Pomodoro default
          timerDuration = 25;
        }
      }
    }
    
    // If no timer request, check for "Xh/min Subject" pattern (e.g., "2h Math")
    let timeLogMatch = null;
    if (!isTimerRequest) {
      timeLogMatch = userMessage.match(/(\d+)\s*(h|hour|min|minute)s?\s+([a-zA-Z].+)/i);
    }
    
    let structuredResponse: IPCAgentMessage;

    if (timerDuration) {
      // User started a timer (with explicit duration or default 25min)
      const motivation = await aiService.getMotivation(context.sessions.length + 1);

      structuredResponse = {
        action: 'start_timer',
        data: {
          subject: timerSubject,
          durationMinutes: timerDuration,
          notes: userMessage,
        },
        reply: `Starting ${timerDuration}-minute ${timerSubject.toLowerCase()} timer! ${motivation}`,
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
