import type { IPCDayContext } from '../../shared/ipc';

/**
 * Context Builder Service (Day 3)
 *
 * Converts user message + database context into a rich prompt for the LLM.
 * Takes structured data and formats it into natural language that Ollama understands.
 *
 * Input:  message + context
 * Output: Complete prompt string ready for Ollama (TinyLLaMA)
 */

/**
 * Builds the system prompt that defines AI behavior
 */
function buildSystemPrompt(): string {
  return `You are an AI Study Assistant helping students manage their learning.

Your role:
1. Understand user messages about study activities
2. Suggest specific actions (log study session, mark task done, update goals)
3. Provide motivational feedback and study advice
4. Parse user intent and extract actionable data

IMPORTANT: Always respond with ONLY valid JSON (no markdown, no backticks, just raw JSON):
{
  "action": "log_session" | "mark_done" | "update_goal" | "ask_clarification",
  "data": {
    "task_id": "optional - which task",
    "minutes": "optional - for log_session",
    "notes": "optional - for log_session",
    "status": "optional - new status for task"
  },
  "reply": "Your friendly response to the user"
}

When user mentions:
- Study duration → action: "log_session" with minutes
- Task completion → action: "mark_done"
- Goal updates → action: "update_goal"
- Unclear intent → action: "ask_clarification"

Be encouraging, supportive, and specific.`;
}

/**
 * Formats database context into readable text
 */
function formatContextToText(context: IPCDayContext): string {
  const sections: string[] = [];

  // Schedule Section
  if (context.tasks.length > 0) {
    const taskLines = context.tasks
      .map((task) => {
        const time = task.start_time && task.end_time ? `${task.start_time}-${task.end_time}` : 'No time set';
        const status = task.status === 'done' ? '✓' : task.status === 'in_progress' ? '⏳' : '○';
        return `  ${status} ${task.name} (${time}) - ${task.status}`;
      })
      .join('\n');
    sections.push(`TODAY'S SCHEDULE:\n${taskLines}`);
  }

  // Progress Section
  const completedCount = context.tasks.filter((t) => t.status === 'done').length;
  const progressLines = [
    `  • Total Study Time: ${context.totalMinutes} minutes`,
    `  • Sessions Logged: ${context.sessions.length}`,
    `  • Tasks Completed: ${completedCount}/${context.tasks.length}`,
  ];
  sections.push(`TODAY'S PROGRESS:\n${progressLines.join('\n')}`);

  // Goals Section
  if (context.goals.length > 0) {
    const goalLines = context.goals.map((g) => `  • ${g.description}`).join('\n');
    sections.push(`TODAY'S GOALS:\n${goalLines}`);
  }

  // Recent Sessions Section
  if (context.sessions.length > 0) {
    const recentSessions = context.sessions.slice(-3);
    const sessionLines = recentSessions
      .map((s) => `  • ${s.duration_minutes} min${s.notes ? ` - ${s.notes}` : ''}`)
      .join('\n');
    sections.push(`RECENT STUDY SESSIONS:\n${sessionLines}`);
  }

  return sections.join('\n\n');
}

/**
 * Main function: Builds complete prompt for LLM
 * Combines system instructions + context + user message
 */
export function buildPrompt(message: string, context: IPCDayContext): string {
  const systemPrompt = buildSystemPrompt();
  const contextText = formatContextToText(context);
  const timestamp = new Date().toISOString();

  const fullPrompt = `${systemPrompt}

═══════════════════════════════════════════

CURRENT TIMESTAMP: ${timestamp}

${contextText}

═══════════════════════════════════════════

USER MESSAGE:
${message}

Respond with ONLY valid JSON (no markdown, no explanation, just the JSON object).`;

  console.info('[ContextBuilder] Prompt assembled', {
    messageLength: message.length,
    contextLength: contextText.length,
    totalLength: fullPrompt.length,
    taskCount: context.tasks.length,
    sessionCount: context.sessions.length,
    goalCount: context.goals.length,
  });

  return fullPrompt;
}
