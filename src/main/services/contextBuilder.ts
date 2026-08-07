import type { IPCDayContext, IPCChatMessage } from '../../shared/ipc';

function buildSystemPrompt(): string {
  return `You are a study assistant. Respond with JSON only (no markdown).

Format:
{
  "action": "log_session" | "start_timer" | "mark_done" | "update_goal" | "ask_clarification",
  "data": {...},
  "reply": "friendly response"
}

Rules:
- "log_session" records time already studied. data: {"minutes": number, "subject": string}
- "start_timer" begins a focus timer. data: {"durationMinutes": number, "subject": string}
- "mark_done" completes a scheduled task. data: {"task_id": "task-id-from-schedule"}
- "update_goal" adjusts today's goal. data: {"targetMinutes": number}
- "ask_clarification" when the request is unclear. data: {}

Examples:
- "2h DSA" → {"action": "log_session", "data": {"minutes": 120, "subject": "DSA"}, "reply": "Logged 2h DSA!"}
- "start 1h math" → {"action": "start_timer", "data": {"durationMinutes": 60, "subject": "Math"}, "reply": "Starting 1h Math timer!"}
- "done task_abc" → {"action": "mark_done", "data": {"task_id": "task_abc"}, "reply": "Marked it done!"}
`;
}

/**
 * Formats database context into readable text
 * 
 * UPDATED: Now includes task IDs so AI can reference them
 */
function formatContextToText(context: IPCDayContext): string {
  const sections: string[] = [];

  // Simplified schedule (with task IDs so the AI can reference them)
  if (context.tasks.length > 0) {
    const taskList = context.tasks
      .slice(0, 5)  // Only show 5 tasks max
      .map((t) => `${t.name} [id:${t.id}] (${t.start_time || 'no time'})`)
      .join(', ');
    sections.push(`Schedule: ${taskList}`);
  }

  // Simplified progress
  const hours = Math.round((context.totalMinutes / 60) * 10) / 10;
  sections.push(`Studied today: ${hours}h in ${context.sessions.length} sessions`);

  return sections.join('\n');
}

/**
 * Main function: Builds complete prompt for LLM
 * Combines system instructions + context + user message
 * 
 * UPDATED: Now includes current time for time-aware suggestions
 */
export function buildPrompt(message: string, context: IPCDayContext, history: IPCChatMessage[] = []): string {
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

  const historyText = history.length > 0 
    ? "\nCHAT HISTORY:\n" + history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')
    : "";

  const fullPrompt = `${systemPrompt}

═══════════════════════════════════════════

CURRENT DATE: ${currentDate}
CURRENT TIME: ${currentTime} (24-hour format)
TIMESTAMP: ${timestamp}

${contextText}
${historyText}

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