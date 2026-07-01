import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  autoLinkRecentNotesToSession,
  deleteNote,
  getNoteById,
  getNotes,
  getTodayTasks,
  getActiveGoals,
  getTodaySessions,
  getFullContext,
  updateTaskStatus,
  updateNote,
  insertNote,
  insertSession,
  getTaskById,
  getWeeklySessions,
  getWeeklyStatsByDate,
  getWeeklySubjectBreakdown,
  getActivePlanMetadata,
  getPlanAnalysis,
  getPlanMilestones,
  getCurrentWeekTasks,
  getWeeklyProgress,
  getUserState,
  calculateAndUpsertWeeklyProgress,
  getTotalMinutesToday,
  todayIso,
} from '../db/queries';
import { receiveMessage } from '../services/messageReceiver';
import { processPlanFile } from '../services/planParser';
import { generateViaOllama, llmService } from '../services/llmService';
import type {
  IPCResponse,
  IPCDayContext,
  IPCTask,
  IPCSession,
  IPCNote,
  IPCNoteInsights,
  IPCNotesListParams,
  IPCNoteCreateInput,
  IPCNoteUpdateInput,
} from '../../shared/ipc';
import {
  redistributeIncompleteHours,
  getRedistributionSummary,
  getRedistributedHoursForDate,
  getAllPendingRedistributions,
  markRedistributionApplied,
  clearRedistributionForSource,
  detectIncompleteGoal,
} from '../db/redistributionQueries';
import { generateBurnoutReport, getTodayLiveRisk } from '../db/burnoutQueries';
import * as https from 'https';
import * as http from 'http';

// Guard to prevent duplicate handler registration
let handlersInitialized = false;

type DBStateEvent = 'SESSION_LOGGED' | 'TASK_UPDATED' | 'PLAN_IMPORTED';

function notifyRendererStateChange(eventName: DBStateEvent, data: unknown): void {
  const payload = {
    event: eventName,
    data,
    timestamp: new Date().toISOString(),
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('db-state-changed', payload);
  }
}

function normalizeJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function safeParseInsights(raw: string): IPCNoteInsights | null {
  try {
    const normalized = normalizeJsonPayload(raw);
    const parsed = JSON.parse(normalized) as Partial<IPCNoteInsights>;

    if (!parsed || typeof parsed !== 'object') return null;

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0)
      : [];
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((keyword) => String(keyword).trim()).filter((keyword) => keyword.length > 0)
      : [];

    if (!summary && tags.length === 0 && keywords.length === 0) {
      return null;
    }

    return {
      summary,
      tags: Array.from(new Set(tags)).slice(0, 8),
      keywords: Array.from(new Set(keywords)).slice(0, 12),
    };
  } catch {
    return null;
  }
}

function buildFallbackSummary(content: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No content to summarize yet.';

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences.slice(0, 2).join(' ').slice(0, 280);
}

function buildFallbackKeywords(content: string): string[] {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'from',
    'into',
    'your',
    'have',
    'will',
    'about',
    'when',
    'where',
    'what',
    'why',
    'how',
    'are',
    'was',
    'were',
    'been',
    'can',
    'could',
    'should',
    'would',
  ]);

  const tokens = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !stopWords.has(token));

  const frequency = new Map<string, number>();
  tokens.forEach((token) => {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token]) => token);
}

function parseStringList(source: string | null | undefined): string[] {
  if (!source) return [];

  const trimmed = source.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
    }
  } catch {
    // Ignore and use comma-split fallback.
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function generateNoteInsights(title: string, content: string): Promise<IPCNoteInsights> {
  const prompt = [
    'You are an assistant that analyzes study notes.',
    'Return ONLY strict JSON with this shape:',
    '{"summary":"2-3 sentence summary","tags":["tag1"],"keywords":["kw1"]}',
    'Rules:',
    '- summary must be concise.',
    '- tags should be 3-6 subject labels.',
    '- keywords should be 5-10 specific terms.',
    `Title: ${title}`,
    `Note Content: ${content}`,
  ].join('\n');

  let raw = '';

  if (llmService.isInitialized()) {
    try {
      raw = await llmService.generateResponse(prompt, { temperature: 0.2, maxTokens: 260 });
    } catch (error) {
      console.warn('[Notes] Embedded LLM insight generation failed, trying Ollama fallback:', error);
    }
  }

  if (!raw) {
    const ollamaRaw = await generateViaOllama(prompt, 'tinyllama');
    raw = ollamaRaw || '';
  }

  const parsed = raw ? safeParseInsights(raw) : null;
  if (parsed) {
    if (!parsed.summary) {
      parsed.summary = buildFallbackSummary(content);
    }
    if (parsed.tags.length === 0) {
      parsed.tags = buildFallbackKeywords(`${title} ${content}`).slice(0, 5);
    }
    if (parsed.keywords.length === 0) {
      parsed.keywords = buildFallbackKeywords(content);
    }
    return parsed;
  }

  const fallbackKeywords = buildFallbackKeywords(`${title} ${content}`);
  return {
    summary: buildFallbackSummary(content),
    tags: fallbackKeywords.slice(0, 5),
    keywords: fallbackKeywords.slice(0, 8),
  };
}

/**
 * Remove all existing handlers to prevent duplicates
 */
// function clearExistingHandlers(): void {
//   // Note: ipcMain doesn't expose a way to list/remove handlers directly,
//   // so we just proceed with registration. The guard flag handles most cases.
//   // For webpack hot reload, the app restart should clear handlers naturally.
// }

export function setupDatabaseHandlers(): void {
  /**
   * Get all tasks for today
   */
  ipcMain.handle('db:getTodayTasks', async (event, date: string) => {
    try {
      const tasks = getTodayTasks(date);
      return { success: true, data: tasks } as IPCResponse<IPCTask[]>;
    } catch (error) {
      console.error('Error getting today tasks:', error);
      return { success: false, error: 'Failed to fetch tasks' } as IPCResponse;
    }
  });

  /**
   * Get active sessions for today
   */
  ipcMain.handle('db:getActiveSessions', async (event, date: string) => {
    try {
      const sessions = getTodaySessions(date);
      return { success: true, data: sessions } as IPCResponse<IPCSession[]>;
    } catch (error) {
      console.error('Error getting sessions:', error);
      return { success: false, error: 'Failed to fetch sessions' } as IPCResponse;
    }
  });

  /**
   * Get today's goals
   */
  ipcMain.handle('db:getActiveGoals', async (event, date: string) => {
    try {
      const goals = getActiveGoals(date);
      return { success: true, data: goals } as IPCResponse;
    } catch (error) {
      console.error('Error getting goals:', error);
      return { success: false, error: 'Failed to fetch goals' } as IPCResponse;
    }
  });

  /**
   * Get full day context (tasks + sessions + goals)
   * Used by Context Builder in the agent
   */
  ipcMain.handle('db:getDayContext', async (event, date: string) => {
    try {
      const context = getFullContext(date);
      return { success: true, data: context } as IPCResponse<IPCDayContext>;
    } catch (error) {
      console.error('Error getting day context:', error);
      return { success: false, error: 'Failed to fetch context' } as IPCResponse;
    }
  });

  /**
   * Get weekly sessions (last 7 days)
   */
  ipcMain.handle('db:getWeeklySessions', async (event, endDate?: string) => {
    try {
      const sessions = getWeeklySessions(endDate);
      return { success: true, data: sessions } as IPCResponse<IPCSession[]>;
    } catch (error) {
      console.error('Error getting weekly sessions:', error);
      return { success: false, error: 'Failed to fetch weekly sessions' } as IPCResponse;
    }
  });

  /**
   * Get weekly stats aggregated by date
   */
  ipcMain.handle('db:getWeeklyStats', async (event, endDate?: string) => {
    try {
      const stats = getWeeklyStatsByDate(endDate);
      return { success: true, data: stats } as IPCResponse;
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      return { success: false, error: 'Failed to fetch weekly stats' } as IPCResponse;
    }
  });

  /**
   * Get subject breakdown for last 7 days
   */
  ipcMain.handle('db:getSubjectBreakdown', async (event, endDate?: string) => {
    try {
      const breakdown = getWeeklySubjectBreakdown(endDate);
      return { success: true, data: breakdown } as IPCResponse;
    } catch (error) {
      console.error('Error getting subject breakdown:', error);
      return { success: false, error: 'Failed to fetch subject breakdown' } as IPCResponse;
    }
  });

   /**
   * Get burnout risk report for last 7 days
   */
  // ipcMain.handle('db:getBurnoutReport', async () => {
  //   try {
  //     const report = detectBurnoutRisk(7); // <-- THIS IS CAUSING THE ERROR
  //     return { success: true, data: report } as IPCResponse;
  //   } catch (error) {
  //     console.error('Error getting burnout report:', error);
  //     return { success: false, error: 'Failed to fetch burnout report' } as IPCResponse;
  //   }
  // });
}

export function setupPlanHandlers(): void {
  ipcMain.handle('plan:getActiveMetadata', async () => {
    try {
      return { success: true, data: getActivePlanMetadata() } as IPCResponse;
    } catch (error) {
      console.error('Error getting active plan metadata:', error);
      return { success: false, error: 'Failed to fetch active plan metadata' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:getAnalysis', async () => {
    try {
      return { success: true, data: getPlanAnalysis() } as IPCResponse;
    } catch (error) {
      console.error('Error getting plan analysis:', error);
      return { success: false, error: 'Failed to fetch plan analysis' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:getMilestones', async () => {
    try {
      return { success: true, data: getPlanMilestones() } as IPCResponse;
    } catch (error) {
      console.error('Error getting milestones:', error);
      return { success: false, error: 'Failed to fetch milestones' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:getCurrentWeekTasks', async () => {
    try {
      return { success: true, data: getCurrentWeekTasks() } as IPCResponse;
    } catch (error) {
      console.error('Error getting current week tasks:', error);
      return { success: false, error: 'Failed to fetch current week tasks' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:getWeeklyProgress', async () => {
    try {
      return { success: true, data: getWeeklyProgress() } as IPCResponse;
    } catch (error) {
      console.error('Error getting weekly progress:', error);
      return { success: false, error: 'Failed to fetch weekly progress' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:getUserState', async () => {
    try {
      return { success: true, data: getUserState() } as IPCResponse;
    } catch (error) {
      console.error('Error getting user state:', error);
      return { success: false, error: 'Failed to fetch user state' } as IPCResponse;
    }
  });

  ipcMain.handle('plan:recalculateWeeklyProgress', async () => {
    try {
      return { success: true, data: calculateAndUpsertWeeklyProgress() } as IPCResponse;
    } catch (error) {
      console.error('Error recalculating weekly progress:', error);
      return { success: false, error: 'Failed to recalculate weekly progress' } as IPCResponse;
    }
  });
}

export function setupTaskHandlers(): void {
  /**
   * Mark a task as done
   */
  ipcMain.handle('task:markDone', async (event, taskId: string) => {
    try {
      const success = updateTaskStatus(taskId, 'done');
      if (!success) {
        throw new Error('Task not found');
      }
      const updated = getTaskById(taskId);

      const today = todayIso();
      notifyRendererStateChange('TASK_UPDATED', {
        taskId,
        status: 'done',
        context: getFullContext(today),
      });

      return { success: true, data: updated } as IPCResponse;
    } catch (error) {
      console.error('Error marking task done:', error);
      return { success: false, error: 'Failed to update task' } as IPCResponse;
    }
  });

  /**
   * Log a study session for a task.
   * Accepts optional start_time and end_time ("HH:MM") for burnout analysis.
   */
  ipcMain.handle(
    'task:logSession',
    async (
      event,
      taskId: string,
      minutes: number,
      notes?: string,
      startTime?: string | null,
      endTime?: string | null,
    ) => {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const today = todayIso();

        insertSession({
          id: sessionId,
          task_id: taskId || null,
          date: today,
          duration_minutes: minutes,
          notes: notes || null,
          start_time: startTime ?? null,
          end_time: endTime ?? null,
        });

        const linkedNotesCount = autoLinkRecentNotesToSession(sessionId, {
          windowMinutes: 180,
          maxNotes: 3,
        });

        notifyRendererStateChange('SESSION_LOGGED', {
          sessionId,
          taskId: taskId || null,
          minutes,
          linkedNotesCount,
          context: getFullContext(today),
        });

        return { success: true, data: { sessionId, linkedNotesCount } } as IPCResponse;
      } catch (error) {
        console.error('Error logging session:', error);
        return { success: false, error: 'Failed to log session' } as IPCResponse;
      }
    },
  );

  /**
   * Update task status
   */
  ipcMain.handle('task:updateStatus', async (event, taskId: string, status: string) => {
    try {
      const validStatuses = ['pending', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }
      const success = updateTaskStatus(taskId, status as 'pending' | 'in_progress' | 'done');
      if (!success) {
        throw new Error('Task not found');
      }

      const today = todayIso();
      notifyRendererStateChange('TASK_UPDATED', {
        taskId,
        status,
        context: getFullContext(today),
      });

      return { success: true } as IPCResponse;
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: 'Failed to update task status' } as IPCResponse;
    }
  });
}

export function setupAgentHandlers(): void {
  /**
   * Agent: Send message
   * Entry point for chat messages from React UI
   * Routes through Message Receiver → Context Builder → LLM/SLM → Response
   */
  ipcMain.handle('agent:sendMessage', async (event, message: string) => {
    try {
      if (typeof message !== 'string') {
        return {
          success: false,
          error: 'Message must be a string',
        } as IPCResponse;
      }

      const response = await receiveMessage(message);
      return response;
    } catch (error) {
      console.error('Error in agent:sendMessage handler:', error);
      return {
        success: false,
        error: 'Failed to process message',
      } as IPCResponse;
    }
  });

  /**
   * Agent: Get today context
   * Returns today's tasks, sessions, and goals for UI display
   */
  ipcMain.handle('agent:getTodayContext', async () => {
    try {
      const today = todayIso();
      const context = getFullContext(today);
      return { success: true, data: context } as IPCResponse;
    } catch (error) {
      console.error('Error in agent:getTodayContext handler:', error);
      return { success: false, error: 'Failed to fetch context' } as IPCResponse;
    }
  });
}

export function setupNotesHandlers(): void {
  ipcMain.handle('notes:list', async (_event, params?: IPCNotesListParams) => {
    try {
      const notes = getNotes(params || {});
      return { success: true, data: notes } as IPCResponse<IPCNote[]>;
    } catch (error) {
      console.error('Error listing notes:', error);
      return { success: false, error: 'Failed to list notes' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:getById', async (_event, noteId: string) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        return { success: false, error: 'Invalid note id' } as IPCResponse;
      }
      const note = getNoteById(noteId);
      return { success: true, data: note } as IPCResponse<IPCNote | null>;
    } catch (error) {
      console.error('Error getting note by id:', error);
      return { success: false, error: 'Failed to fetch note' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:create', async (_event, note: IPCNoteCreateInput) => {
    try {
      if (!note || typeof note !== 'object') {
        return { success: false, error: 'Invalid note payload' } as IPCResponse;
      }

      const created = insertNote({
        ...note,
        title: (note.title || 'Untitled Note').trim(),
      });

      return { success: true, data: created } as IPCResponse<IPCNote>;
    } catch (error) {
      console.error('Error creating note:', error);
      return { success: false, error: 'Failed to create note' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:update', async (_event, noteId: string, updates: IPCNoteUpdateInput) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        return { success: false, error: 'Invalid note id' } as IPCResponse;
      }

      const updated = updateNote(noteId, updates || {});
      return { success: true, data: updated } as IPCResponse<IPCNote | null>;
    } catch (error) {
      console.error('Error updating note:', error);
      return { success: false, error: 'Failed to update note' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:delete', async (_event, noteId: string) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        return { success: false, error: 'Invalid note id' } as IPCResponse;
      }

      const deleted = deleteNote(noteId);
      return { success: true, data: { deleted } } as IPCResponse<{ deleted: boolean }>;
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: 'Failed to delete note' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:generateInsights', async (_event, noteId: string) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        return { success: false, error: 'Invalid note id' } as IPCResponse;
      }

      const note = getNoteById(noteId);
      if (!note) {
        return { success: false, error: 'Note not found' } as IPCResponse;
      }

      const baseContent = [note.title, note.content || '', note.canvas_data || '']
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join('\n\n');

      const insights = await generateNoteInsights(note.title, baseContent);

      const mergedTags = Array.from(new Set([...parseStringList(note.tags), ...insights.tags])).slice(0, 10);
      const mergedKeywords = Array.from(new Set([...parseStringList(note.ai_keywords), ...insights.keywords])).slice(0, 15);

      const updated = updateNote(noteId, {
        ai_summary: insights.summary,
        tags: JSON.stringify(mergedTags),
        ai_keywords: JSON.stringify(mergedKeywords),
      });

      return { success: true, data: updated } as IPCResponse<IPCNote | null>;
    } catch (error) {
      console.error('Error generating note insights:', error);
      return { success: false, error: 'Failed to generate note insights' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:fetchUrl', async (_event, url: string) => {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, error: 'Invalid URL' } as IPCResponse;
      }

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return { success: false, error: 'Malformed URL' } as IPCResponse;
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { success: false, error: 'Only http and https URLs are supported' } as IPCResponse;
      }

      // Fetch raw HTML from main process (no CORS)
      const rawHtml = await new Promise<string>((resolve, reject) => {
        const client = parsedUrl.protocol === 'https:' ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 EkagraFocus/1.0' } }, (res) => {
          // Follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).toString();
            const redirectClient = redirectUrl.startsWith('https') ? https : http;
            redirectClient.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0 EkagraFocus/1.0' } }, (res2) => {
              let data = '';
              res2.on('data', (chunk: Buffer) => { data += chunk.toString(); });
              res2.on('end', () => resolve(data));
              res2.on('error', reject);
            }).on('error', reject);
            return;
          }
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => resolve(data));
          res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timed out')); });
      });

      // Extract page title
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

      // Strip scripts, styles, nav, footer, header, ads
      const cleaned = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

      // Extract heading+paragraph pairs as sections
      const sections: { heading: string; text: string }[] = [];

      // Pull all headings and paragraphs in document order
      const blockRegex = /<(h[1-3]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
      let currentHeading = 'Introduction';
      let currentTexts: string[] = [];

      let match: RegExpExecArray | null;
      while ((match = blockRegex.exec(cleaned)) !== null) {
        const tag = match[1].toLowerCase();
        // Strip inner HTML tags to get plain text
        const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text || text.length < 20) continue;

        if (tag.startsWith('h')) {
          // Flush previous section
          if (currentTexts.length > 0) {
            sections.push({ heading: currentHeading, text: currentTexts.join(' ') });
            currentTexts = [];
          }
          currentHeading = text;
        } else {
          currentTexts.push(text);
        }
      }

      // Flush last section
      if (currentTexts.length > 0) {
        sections.push({ heading: currentHeading, text: currentTexts.join(' ') });
      }

      if (sections.length === 0) {
        return { success: false, error: 'Could not extract readable content from this URL. Try a different page.' } as IPCResponse;
      }

      return {
        success: true,
        data: { url, title: pageTitle, sections },
      } as IPCResponse;
    } catch (error) {
      console.error('[Notes] fetchUrl error:', error);
      return { success: false, error: 'Failed to fetch URL content' } as IPCResponse;
    }
  });

  ipcMain.handle('notes:analyzeUrls', async (_event, urls: string[]) => {
    try {
      if (!Array.isArray(urls) || urls.length === 0) {
        return { success: false, error: 'No URLs provided' } as IPCResponse;
      }

      // Fetch and extract text from all URLs
      const fetchedContents: string[] = [];

      for (const url of urls) {
        try {
          let parsedUrl: URL;
          try { parsedUrl = new URL(url); } catch { continue; }
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) continue;

          const rawHtml = await new Promise<string>((resolve, reject) => {
            const client = parsedUrl.protocol === 'https:' ? https : http;
            const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 EkagraFocus/1.0' } }, (res) => {
              if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, url).toString();
                const redirectClient = redirectUrl.startsWith('https') ? https : http;
                redirectClient.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0 EkagraFocus/1.0' } }, (res2) => {
                  let data = '';
                  res2.on('data', (chunk: Buffer) => { data += chunk.toString(); });
                  res2.on('end', () => resolve(data));
                  res2.on('error', reject);
                }).on('error', reject);
                return;
              }
              let data = '';
              res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
              res.on('end', () => resolve(data));
              res.on('error', reject);
            });
            req.on('error', reject);
            req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
          });

          // Strip HTML and extract readable text
          const cleaned = rawHtml
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[\s\S]*?<\/header>/gi, '')
            .replace(/<aside[\s\S]*?<\/aside>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

          const blockRegex = /<(h[1-3]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
          const textParts: string[] = [];
          let match: RegExpExecArray | null;
          while ((match = blockRegex.exec(cleaned)) !== null) {
            const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (text && text.length >= 20) textParts.push(text);
          }

          if (textParts.length > 0) {
            fetchedContents.push(`--- Source: ${url} ---\n${textParts.join('\n')}`);
          }
        } catch (err) {
          console.warn(`[Notes] analyzeUrls: failed to fetch ${url}:`, err);
        }
      }

      if (fetchedContents.length === 0) {
        return { success: false, error: 'Could not extract content from any of the provided URLs.' } as IPCResponse;
      }

      const combinedText = fetchedContents.join('\n\n');
      // Truncate to avoid overwhelming the LLM context window
      const truncated = combinedText.slice(0, 4000);

      const prompt = [
        'You are a study assistant. Analyze the following web content and generate structured study notes.',
        'Return ONLY a JSON array of sections with this exact shape:',
        '[{"heading":"Section Title","text":"Full explanation of this topic in clear, student-friendly language."}]',
        'Rules:',
        '- Create 5-12 meaningful sections based on the content.',
        '- Each heading should be a clear topic name.',
        '- Each text should be a thorough explanation (3-8 sentences).',
        '- Focus on key concepts, definitions, examples, and important points.',
        '- Do NOT include source URLs or metadata in the output.',
        '- Return ONLY the JSON array, no other text.',
        '',
        'Content to analyze:',
        truncated,
      ].join('\n');

      let raw = '';

      if (llmService.isInitialized()) {
        try {
          raw = await llmService.generateResponse(prompt, { temperature: 0.3, maxTokens: 2000 });
        } catch (err) {
          console.warn('[Notes] analyzeUrls: local LLM failed, trying Ollama:', err);
        }
      }

      if (!raw) {
        const ollamaRaw = await generateViaOllama(prompt, 'tinyllama');
        raw = ollamaRaw || '';
      }

      if (!raw) {
        return { success: false, error: 'No AI model available. Please set up a local LLM or Ollama to use this feature.' } as IPCResponse;
      }

      // Parse AI response
      let sections: { heading: string; text: string }[] = [];
      try {
        console.log('[Notes] analyzeUrls raw AI response:', raw.slice(0, 500));
        const normalized = raw.trim().replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed)) {
          sections = parsed
            .filter(s => s && typeof s.heading === 'string' && typeof s.text === 'string')
            .map(s => ({ heading: s.heading.trim(), text: s.text.trim() }))
            .filter(s => s.heading.length > 0 && s.text.length > 0);
        }
      } catch {
        console.warn('[Notes] analyzeUrls: JSON parse failed, falling back to plain text parsing');
      }

      // Fallback: parse plain text into sections if JSON failed
      if (sections.length === 0 && raw.trim().length > 0) {
        const lines = raw.trim().split('\n').filter(l => l.trim().length > 0);
        let currentHeading = 'Overview';
        let currentTexts: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          const isHeading =
            /^\d+\.\s+[A-Z]/.test(trimmed) ||
            (trimmed.endsWith(':') && trimmed.length < 60) ||
            /^#{1,3}\s/.test(trimmed);

          if (isHeading) {
            if (currentTexts.length > 0) {
              sections.push({ heading: currentHeading, text: currentTexts.join(' ') });
              currentTexts = [];
            }
            currentHeading = trimmed.replace(/^#{1,3}\s/, '').replace(/:$/, '').replace(/^\d+\.\s*/, '');
          } else {
            currentTexts.push(trimmed);
            // Split into new section every ~400 chars to avoid one giant blob
            const combined = currentTexts.join(' ');
            if (combined.length >= 400) {
              sections.push({ heading: currentHeading, text: combined });
              currentTexts = [];
              currentHeading = `${currentHeading} (cont.)`;
            }
          }
        }

        if (currentTexts.length > 0) {
          sections.push({ heading: currentHeading, text: currentTexts.join(' ') });
        }
      }

      if (sections.length === 0) {
        return { success: false, error: 'AI could not generate structured notes from the provided content.' } as IPCResponse;
      }

      return { success: true, data: { sections } } as IPCResponse;
    } catch (error) {
      console.error('[Notes] analyzeUrls error:', error);
      return { success: false, error: 'Failed to analyze URLs' } as IPCResponse;
    }
  });
}

/**
 * File Operation Handlers (Markdown/Text file import)
 * Handles importing study plans from files
 */
export function setupFileHandlers(): void {
  console.log('[FileHandler] Registering import-plan-file...');
  /**
   * Import plan file: Open file picker, read file, and parse into database
   */
  ipcMain.handle('import-plan-file', async () => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow();
      if (!mainWindow) {
        return { success: false, error: 'No active window' } as IPCResponse;
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Study Plan',
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' } as IPCResponse;
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        console.log(`[FileHandler] Read file: ${fileName} (${content.length} bytes)`);
        
        // Parse markdown and import to database
        const parseResult = await processPlanFile(content, todayIso(), filePath);
        console.log(`[FileHandler] Parse result:`, parseResult);

        if (parseResult.success) {
          const today = todayIso();
          notifyRendererStateChange('PLAN_IMPORTED', {
            fileName,
            filePath,
            tasksImported: parseResult.tasksCount,
            planId: parseResult.planId,
            context: getFullContext(today),
          });
        }
        
        return {
          success: parseResult.success,
          data: {
            fileName,
            filePath,
            content,
            parseResult: {
              tasksImported: parseResult.tasksCount,
              details: parseResult.details,
              planId: parseResult.planId,
              metadata: parseResult.metadata,
              analysis: parseResult.analysis,
            },
          },
        } as IPCResponse;
      } catch (readError) {
        console.error(`[FileHandler] Error reading file: ${readError}`);
        return { success: false, error: 'Failed to read file' } as IPCResponse;
      }
    } catch (error) {
      console.error('[FileHandler] Error in import-plan-file:', error);
      return { success: false, error: 'File operation failed' } as IPCResponse;
    }
  });

  /**
   * Read plan file: Read from a given path
   */
  ipcMain.handle('read-plan-file', async (event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path' } as IPCResponse;
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      console.log(`[FileHandler] Read file: ${fileName} (${content.length} bytes)`);
      
      return {
        success: true,
        data: {
          fileName,
          filePath,
          content,
        },
      } as IPCResponse<{ fileName: string; filePath: string; content: string }>;
    } catch (error) {
      console.error('[FileHandler] Error in read-plan-file:', error);
      return { success: false, error: 'Failed to read file' } as IPCResponse;
    }
  });
  console.log('[FileHandler] ✓ All file handlers registered');
}

export function setupRedistributionHandlers(): void {
  ipcMain.handle(
    'redistribution:trigger',
    async (_event, payload: {
      date: string;
      totalGoalHours: number;
      hoursCompleted: number;
      subject?: string | null;
      spreadDays?: number;
      maxExtraHoursPerDay?: number;
    }) => {
      try {
        const { date, totalGoalHours, hoursCompleted, subject, spreadDays, maxExtraHoursPerDay } = payload;
        const { isIncomplete, remainingHours } = detectIncompleteGoal(date, totalGoalHours, hoursCompleted);
        if (!isIncomplete) {
          return { success: true, data: { redistributed: false, message: 'Goal already met.' } };
        }
        const entries = redistributeIncompleteHours(date, remainingHours, {
          spreadDays: spreadDays ?? 5,
          maxExtraHoursPerDay: maxExtraHoursPerDay ?? 2,
          subject: subject ?? null,
          includeWeekends: false,
        });
        return { success: true, data: { redistributed: true, sourceDate: date, remainingHours, entriesCreated: entries.length, entries } };
      } catch (error) {
        console.error('[Redistribution] Error:', error);
        return { success: false, error: 'Failed to redistribute workload' };
      }
    }
  );

  ipcMain.handle('redistribution:getSummary', async () => {
    try {
      return { success: true, data: getRedistributionSummary() };
    } catch (error) {
      return { success: false, error: 'Failed to get summary' };
    }
  });

  ipcMain.handle('redistribution:getHoursForDate', async (_event, targetDate: string) => {
    try {
      const hours = getRedistributedHoursForDate(targetDate);
      return { success: true, data: { hours } };
    } catch (error) {
      return { success: false, error: 'Failed to get hours' };
    }
  });

  ipcMain.handle('redistribution:getAllPending', async () => {
    try {
      return { success: true, data: getAllPendingRedistributions() };
    } catch (error) {
      return { success: false, error: 'Failed to get pending' };
    }
  });

  ipcMain.handle('redistribution:markApplied', async (_event, targetDate: string) => {
    try {
      const changes = markRedistributionApplied(targetDate);
      return { success: true, data: { markedApplied: changes } };
    } catch (error) {
      return { success: false, error: 'Failed to mark applied' };
    }
  });

  ipcMain.handle('redistribution:clear', async (_event, sourceDate: string) => {
    try {
      const changes = clearRedistributionForSource(sourceDate);
      return { success: true, data: { cleared: changes } };
    } catch (error) {
      return { success: false, error: 'Failed to clear' };
    }
  });
}

// ─── Burnout handlers ────────────────────────────────────────────────────────

/**
 * burnout:getReport  — full 7-day heuristic analysis.
 * Returns BurnoutReport. Does not affect streaks or penalties.
 */
export function setupBurnoutHandlers(): void {
  ipcMain.handle('burnout:getReport', async () => {
    try {
      const report = generateBurnoutReport();
      return { success: true, data: report } as IPCResponse;
    } catch (error) {
      console.error('[Burnout] Error generating report:', error);
      return { success: false, error: 'Failed to generate burnout report' } as IPCResponse;
    }
  });

  /**
   * burnout:getLiveRisk  — lightweight check based on today's logged minutes.
   * Used by TimerPanel to warn mid-session without a full DB scan.
   */
  ipcMain.handle('burnout:getLiveRisk', async () => {
    try {
      const today = todayIso();
      const todayMinutes = getTotalMinutesToday(today);
      const risk = getTodayLiveRisk(todayMinutes);
      return { success: true, data: risk } as IPCResponse;
    } catch (error) {
      console.error('[Burnout] Error getting live risk:', error);
      return { success: false, error: 'Failed to get live risk' } as IPCResponse;
    }
  });
}

export function setupAllHandlers(): void {
  // Prevent duplicate handler registration
  if (handlersInitialized) {
    console.log('[IPC] Handlers already initialized, skipping setup');
    return;
  }

  console.log('[IPC] Setting up IPC handlers...');
  
  console.log('[IPC] Setting up database handlers...');
  setupDatabaseHandlers();
  console.log('[IPC] ✓ Database handlers done');

  console.log('[IPC] Setting up plan handlers...');
  setupPlanHandlers();
  console.log('[IPC] ✓ Plan handlers done');
  
  console.log('[IPC] Setting up task handlers...');
  setupTaskHandlers();
  console.log('[IPC] ✓ Task handlers done');
  
  console.log('[IPC] Setting up agent handlers...');
  setupAgentHandlers();
  console.log('[IPC] ✓ Agent handlers done');

  console.log('[IPC] Setting up notes handlers...');
  setupNotesHandlers();
  console.log('[IPC] ✓ Notes handlers done');
  
  console.log('[IPC] Setting up file handlers...');
  setupFileHandlers();
  console.log('[IPC] ✓ File handlers done');

  setupRedistributionHandlers();

  console.log('[IPC] Setting up burnout handlers...');
  setupBurnoutHandlers();
  console.log('[IPC] ✓ Burnout handlers done');

  handlersInitialized = true;
  console.log('[IPC] ✓ All handlers initialized successfully');
}
