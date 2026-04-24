import type { IPCDayContext } from '../../shared/ipc';

function buildSystemPrompt(): string {
  return `You are an AI Study Assistant helping students manage their learning schedule.

Your role:
1. Understand user messages about study activities
2. Suggest specific actions based on the CURRENT SCHEDULE
3. Provide motivational feedback and study advice
4. Parse user intent and extract actionable data

SCHEDULE INTELLIGENCE (CRITICAL):
- When user asks "what should I study?" or "what's next?", find the NEXT pending task based on current time and start_time
- When user says "start it", "let's go", or "begin", use the FIRST pending task from TODAY'S SCHEDULE
- When suggesting a task, ALWAYS include the task ID in your response
- Consider current time when recommending tasks (suggest upcoming tasks, not past ones)
- If user mentions a subject (e.g., "Math"), find the matching task by name and use its ID

EXAMPLE RESPONSES:
User: "What should I study?"
AI: {
  "action": "ask_clarification",
  "data": {"task_id": "math_01", "task_name": "Mathematics - Calculus Review"},
  "reply": "Based on your schedule, you should start 'Mathematics - Calculus Review' (11:00-12:30). Ready to begin?"
}

User: "Start it" (when schedule exists)
AI: {
  "action": "start_timer",
  "data": {"task_id": "phys_01", "subject": "Physics - Thermal Dynamics", "durationMinutes": 90},
  "reply": "Starting 'Physics - Thermal Dynamics' (90 minutes). Let's focus! 🎯"
}

IMPORTANT: Always respond with ONLY valid JSON (no markdown, no backticks, just raw JSON):
{
  "action": "log_session" | "start_timer" | "mark_done" | "update_goal" | "ask_clarification",
  "data": {
    "task_id": "REQUIRED when referencing a scheduled task",
    "subject": "optional - task name or custom subject",
    "minutes": "optional - for log_session",
    "durationMinutes": "optional - for start_timer",
    "notes": "optional - for log_session",
    "status": "optional - new status for task"
  },
  "reply": "Your friendly response to the user"
}

When user mentions:
- "What should I study?" or "What's next?" → Find next pending task by start_time, suggest it with task_id
- "Start it" or "Let's go" → action: "start_timer" with task from schedule
- Study duration like "2h math" → action: "log_session" with minutes
- Task completion → action: "mark_done" with task_id
- Goal updates → action: "update_goal"
- Unclear intent → action: "ask_clarification"

Be encouraging, supportive, and ALWAYS schedule-aware.`;
}

/**
 * Formats database context into readable text
 * 
 * UPDATED: Now includes task IDs so AI can reference them
 */
function formatContextToText(context: IPCDayContext): string {
  const sections: string[] = [];

  // Schedule Section - NOW WITH TASK IDS
  if (context.tasks.length > 0) {
    const taskLines = context.tasks
      .map((task) => {
        const time = task.start_time && task.end_time ? `${task.start_time}-${task.end_time}` : 'No time set';
        const status = task.status === 'done' ? '✓' : task.status === 'in_progress' ? '⏳' : '○';
        // CRITICAL: Include task ID so AI can reference it in actions
        return `  ${status} [ID:${task.id}] ${task.name} (${time}) [${task.status}]`;
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
 * 
 * UPDATED: Now includes current time for time-aware suggestions
 */
export function buildPrompt(message: string, context: IPCDayContext): string {
  const systemPrompt = buildSystemPrompt();
  const contextText = formatContextToText(context);
  const timestamp = new Date().toISOString();
  
  // Add human-readable current time for AI schedule intelligence
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fullPrompt = `${systemPrompt}

═══════════════════════════════════════════

CURRENT DATE: ${currentDate}
CURRENT TIME: ${currentTime} (24-hour format)
TIMESTAMP: ${timestamp}

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
    currentTime,
  });

  return fullPrompt;
}