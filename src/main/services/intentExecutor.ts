import type { IPCAgentMessage } from '../../shared/ipc';
import { BrowserWindow } from 'electron';
import { updateTaskStatus, insertSession, getTaskById, getFullContext } from '../db/queries';


interface AIResponse {
  action: 'log_session' | 'mark_done' | 'update_goal' | 'start_timer' | 'ask_clarification';
  data: Record<string, unknown>;
  reply: string;
}

type DBStateEvent = 'SESSION_LOGGED' | 'TASK_UPDATED';

function notifyDbStateChanged(eventName: DBStateEvent, data: Record<string, unknown>): void {
  const payload = {
    event: eventName,
    data,
    timestamp: new Date().toISOString(),
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('db-state-changed', payload);
  }
}

function parseAIResponse(responseText: string): AIResponse {
  try {
    // Try direct JSON parsing
    const parsed = JSON.parse(responseText);
    if (isValidAIResponse(parsed)) {
      return parsed;
    }
  } catch {
    // Not direct JSON, try to extract it
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = responseText.match(/```[\w]*\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidAIResponse(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next attempt
    }
  }

  // Try to extract JSON object
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidAIResponse(parsed)) {
        return parsed;
      }
    } catch {
      // Continue
    }
  }

  // Fallback: ask for clarification
  console.warn('[IntentExecutor] Could not parse AI response:', responseText);
  return {
    action: 'ask_clarification',
    data: { originalResponse: responseText },
    reply: 'I understood your message, but I need clarification. Could you rephrase that?',
  };
}

function isValidAIResponse(obj: unknown): obj is AIResponse {
  if (typeof obj !== 'object' || obj === null) return false;

  const response = obj as Record<string, unknown>;
  const validActions = ['log_session', 'mark_done', 'update_goal', 'start_timer', 'ask_clarification'];

  return (
    typeof response.action === 'string' &&
    validActions.includes(response.action) &&
    typeof response.reply === 'string' &&
    typeof response.data === 'object'
  );
}


function executeLogSession(data: Record<string, unknown>, reply: string): IPCAgentMessage {
  try {
    // Support both field name formats
    let taskId = typeof data.task_id === 'string' ? data.task_id : 
                 (typeof data.subject === 'string' ? data.subject : null);
    const minutes = typeof data.minutes === 'number' ? data.minutes : 
                    (typeof data.durationMinutes === 'number' ? data.durationMinutes : 0);
    const notes = typeof data.notes === 'string' ? data.notes : null;

    if (minutes <= 0) {
      return {
        action: 'ask_clarification',
        data: { error: 'Invalid duration' },
        reply: 'Please specify a valid study duration in minutes.',
      };
    }

    // Validate that task exists if task_id is provided
    if (taskId) {
      const task = getTaskById(taskId);
      if (!task) {
        // Task doesn't exist, log without linking to a specific task
        console.warn('[IntentExecutor] Task not found:', taskId, '- logging as free-form session');
        taskId = null;
      }
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const today = new Date().toISOString().split('T')[0];

    insertSession({
      id: sessionId,
      task_id: taskId,
      date: today,
      duration_minutes: minutes,
      notes: notes,
    });

    notifyDbStateChanged('SESSION_LOGGED', {
      sessionId,
      taskId,
      minutes,
      context: getFullContext(today),
    });

    const subjectText = notes || (taskId ? `task ${taskId}` : 'study');
    console.info('[IntentExecutor] Session logged', { sessionId, minutes, taskId, notes });

    return {
      action: 'log_session',
      data: { sessionId, minutes, taskId },
      reply: reply || `Great! Logged ${minutes} minutes of ${subjectText}. 📚`,
    };
  } catch (error) {
    console.error('[IntentExecutor] Error logging session:', error);
    return {
      action: 'ask_clarification',
      data: { error: 'Failed to log session' },
      reply: 'I encountered an error saving your session. Please try again.',
    };
  }
}

/**
 * Executes start_timer action
 * Logs session immediately + sends data to UI for timer display
 */
function executeStartTimer(data: Record<string, unknown>, reply: string): IPCAgentMessage {
  try {
    // Same as log_session but with start_timer action
    const minutes = typeof data.minutes === 'number' ? data.minutes : 
                    (typeof data.durationMinutes === 'number' ? data.durationMinutes : 0);
    const subject = typeof data.subject === 'string' ? data.subject : 'Focus Session';
    const notes = typeof data.notes === 'string' ? data.notes : null;

    if (minutes <= 0) {
      return {
        action: 'ask_clarification',
        data: { error: 'Invalid duration' },
        reply: 'Please specify a valid timer duration in minutes.',
      };
    }

    // Log the session to database immediately
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const today = new Date().toISOString().split('T')[0];

    insertSession({
      id: sessionId,
      task_id: null,
      date: today,
      duration_minutes: minutes,
      notes: notes || subject,
    });

    notifyDbStateChanged('SESSION_LOGGED', {
      sessionId,
      taskId: null,
      minutes,
      context: getFullContext(today),
    });

    console.info('[IntentExecutor] Timer started', { sessionId, minutes, subject });

    return {
      action: 'start_timer',
      data: {
        sessionId,
        durationMinutes: minutes,
        subject,
        startTime: Date.now(),
      },
      reply: reply || `Starting ${minutes}-minute timer! 🎯`,
    };
  } catch (error) {
    console.error('[IntentExecutor] Error starting timer:', error);
    return {
      action: 'ask_clarification',
      data: { error: 'Failed to start timer' },
      reply: 'I encountered an error starting the timer. Please try again.',
    };
  }
}

/**
 * Executes mark_done action
 */
function executeMarkDone(data: Record<string, unknown>, reply: string): IPCAgentMessage {
  try {
    const taskId = typeof data.task_id === 'string' ? data.task_id : null;

    if (!taskId) {
      return {
        action: 'ask_clarification',
        data: { error: 'No task specified' },
        reply: 'Which task did you complete? Please be more specific.',
      };
    }

    const success = updateTaskStatus(taskId, 'done');

    if (!success) {
      return {
        action: 'ask_clarification',
        data: { error: 'Task not found' },
        reply: 'I could not find that task. Could you specify which one?',
      };
    }

    const task = getTaskById(taskId);
    const today = new Date().toISOString().split('T')[0];

    notifyDbStateChanged('TASK_UPDATED', {
      taskId,
      status: 'done',
      context: getFullContext(today),
    });

    console.info('[IntentExecutor] Task marked done', { taskId, taskName: task?.name });

    return {
      action: 'mark_done',
      data: { taskId },
      reply: reply || `Excellent! Marked "${task?.name}" as complete. 🎉`,
    };
  } catch (error) {
    console.error('[IntentExecutor] Error marking task done:', error);
    return {
      action: 'ask_clarification',
      data: { error: 'Failed to update task' },
      reply: 'I encountered an error updating that task. Please try again.',
    };
  }
}

/**
 * Executes update_goal action
 */
function executeUpdateGoal(data: Record<string, unknown>, reply: string): IPCAgentMessage {
  try {
    const goalDescription = typeof data.goal === 'string' ? data.goal : null;

    if (!goalDescription) {
      return {
        action: 'ask_clarification',
        data: { error: 'No goal specified' },
        reply: 'What goal would you like to set?',
      };
    }

    console.info('[IntentExecutor] Goal update requested', { goal: goalDescription });

    // Note: Full goal update would require database function
    // For now, acknowledge the intent
    return {
      action: 'update_goal',
      data: { goal: goalDescription },
      reply: reply || `Great! I'll help you work towards: "${goalDescription}"`,
    };
  } catch (error) {
    console.error('[IntentExecutor] Error updating goal:', error);
    return {
      action: 'ask_clarification',
      data: { error: 'Failed to update goal' },
      reply: 'I encountered an error updating your goal. Please try again.',
    };
  }
}

/**
 * Main function: Executes AI intent and performs mutations
 */
export function executeIntent(aiResponseText: string): IPCAgentMessage {
  try {
    console.info('[IntentExecutor] Parsing AI response');

    // Parse AI response
    const parsedResponse = parseAIResponse(aiResponseText);

    console.debug('[IntentExecutor] Parsed response', {
      action: parsedResponse.action,
      replyLength: parsedResponse.reply.length,
    });

    // Execute based on action
    switch (parsedResponse.action) {
      case 'log_session':
        return executeLogSession(parsedResponse.data, parsedResponse.reply);

      case 'start_timer':
        return executeStartTimer(parsedResponse.data, parsedResponse.reply);

      case 'mark_done':
        return executeMarkDone(parsedResponse.data, parsedResponse.reply);

      case 'update_goal':
        return executeUpdateGoal(parsedResponse.data, parsedResponse.reply);

      case 'ask_clarification':
      default:
        return {
          action: 'ask_clarification',
          data: parsedResponse.data,
          reply: parsedResponse.reply,
        };
    }
  } catch (error) {
    console.error('[IntentExecutor] Unhandled error:', error);
    return {
      action: 'ask_clarification',
      data: { error: 'Processing failed' },
      reply: 'I encountered an error processing your request. Please try again.',
    };
  }
}
