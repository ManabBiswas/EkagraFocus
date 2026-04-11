/**
 * Plan Parser Service
 * 
 * Parses markdown study plans and converts them into database tasks
 * Supports formats like:
 * - "2h Math" → Creates 2-hour Math task
 * - "## Monday\n- 1.5h Physics\n- 45min Chemistry" → Parses schedule
 */

import { insertTask } from '../db/queries';

interface ParsedTask {
  name: string;
  duration_minutes: number;
  date: string;
}

/**
 * Parse markdown study plan into tasks
 */
export function parsePlanMarkdown(markdownContent: string, baseDate: string = new Date().toISOString().split('T')[0]): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = markdownContent.split('\n');
  const currentDate = baseDate;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Check for date headers (e.g., "## Monday", "### 2026-04-11", "# Day 2")
    if (trimmed.match(/^#+\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Day\s+\d+|\d{4}-\d{2}-\d{2})/i)) {
      // Could parse specific dates here if needed
      console.log(`[PlanParser] Found date header: ${trimmed}`);
      continue;
    }

    // Parse task lines with duration (e.g., "- 2h Math", "* 45min Chemistry", "- 1.5 hours Physics")
    const taskMatch = trimmed.match(/^[-*•]\s*(\d+(?:\.\d+)?)\s*(h|hour|min|minute)s?\s+(.+)$/i);
    if (taskMatch) {
      const durationNum = parseFloat(taskMatch[1]);
      const unit = taskMatch[2].toLowerCase()[0]; // 'h' or 'm'
      const taskName = taskMatch[3].trim();
      const durationMinutes = unit === 'h' ? durationNum * 60 : durationNum;

      tasks.push({
        name: taskName,
        duration_minutes: Math.round(durationMinutes),
        date: currentDate,
      });

      console.log(`[PlanParser] Parsed task: ${taskName} (${durationMinutes}min)`);
      continue;
    }

    // Alternative format without bullet point (e.g., "Math: 2 hours")
    const colonFormatMatch = trimmed.match(/^([^:]+):\s*(\d+(?:\.\d+)?)\s*(h|hour|min|minute)s?(?:\s+|$)/i);
    if (colonFormatMatch) {
      const taskName = colonFormatMatch[1].trim();
      const durationNum = parseFloat(colonFormatMatch[2]);
      const unit = colonFormatMatch[3].toLowerCase()[0];
      const durationMinutes = unit === 'h' ? durationNum * 60 : durationNum;

      tasks.push({
        name: taskName,
        duration_minutes: Math.round(durationMinutes),
        date: currentDate,
      });

      console.log(`[PlanParser] Parsed task (colon format): ${taskName} (${durationMinutes}min)`);
      continue;
    }

    // Plain text time extraction (e.g., text contains "2 hours" or "45 minutes")
    const plainTimeMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(h|hour|min|minute)s?\s+(.+)/i);
    if (plainTimeMatch && !trimmed.startsWith('#') && !trimmed.match(/^[-*•]/)) {
      const durationNum = parseFloat(plainTimeMatch[1]);
      const unit = plainTimeMatch[2].toLowerCase()[0];
      const taskName = plainTimeMatch[3].trim();
      const durationMinutes = unit === 'h' ? durationNum * 60 : durationNum;

      tasks.push({
        name: taskName,
        duration_minutes: Math.round(durationMinutes),
        date: currentDate,
      });

      console.log(`[PlanParser] Parsed task (plain): ${taskName} (${durationMinutes}min)`);
    }
  }

  console.log(`[PlanParser] Extracted ${tasks.length} tasks from markdown`);
  return tasks;
}

/**
 * Import parsed tasks into database
 */
export function importPlanToDB(tasks: ParsedTask[]): { success: boolean; count: number; error?: string } {
  try {
    let importedCount = 0;

    for (const task of tasks) {
      try {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate start and end times (using simple time allocation)
        // If not specified, spread tasks throughout the day starting at 9 AM
        const startHour = 9 + (importedCount % 8); // Stagger tasks throughout day
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endMinutes = (startHour * 60) + task.duration_minutes;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        insertTask({
          id: taskId,
          date: task.date,
          name: task.name,
          start_time: startTime,
          end_time: endTime,
          status: 'pending',
        });

        importedCount++;
        console.log(`[PlanParser] Imported task: ${task.name} (${startTime} - ${endTime})`);
      } catch (error) {
        console.error(`[PlanParser] Failed to import task ${task.name}:`, error);
      }
    }

    console.log(`[PlanParser] Successfully imported ${importedCount}/${tasks.length} tasks`);
    return {
      success: importedCount > 0,
      count: importedCount,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PlanParser] Import error:', errorMsg);
    return {
      success: false,
      count: 0,
      error: errorMsg,
    };
  }
}

/**
 * Complete pipeline: Parse markdown and import to DB
 */
export function processPlanFile(markdownContent: string, baseDate?: string): { success: boolean; tasksCount: number; details: string } {
  try {
    const parsed = parsePlanMarkdown(markdownContent, baseDate);
    const imported = importPlanToDB(parsed);

    const details = `Parsed ${parsed.length} tasks, imported ${imported.count}`;
    console.log(`[PlanParser] Process complete: ${details}`);

    return {
      success: imported.success,
      tasksCount: imported.count,
      details,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PlanParser] Processing error:', errorMsg);
    return {
      success: false,
      tasksCount: 0,
      details: `Error: ${errorMsg}`,
    };
  }
}
