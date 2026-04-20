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

/**
 * IPC Handlers
 * All handlers receive data from Renderer via IPC and return responses
 * The bridge between Main Process (backend) and Renderer Process (frontend)
 */

// Handler channel names for cleanup
// const HANDLER_CHANNELS = [
//   'db:getTodayTasks',
//   'db:getActiveSessions',
//   'db:getActiveGoals',
//   'db:getDayContext',
//   'task:markDone',
//   'task:logSession',
//   'task:updateStatus',
//   'agent:sendMessage',
//   'agent:getTodayContext',
//   'import-plan-file',
//   'read-plan-file',
// ];

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

      const today = new Date().toISOString().split('T')[0];
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
   * Log a study session for a task
   */
  ipcMain.handle(
    'task:logSession',
    async (event, taskId: string, minutes: number, notes?: string) => {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const today = new Date().toISOString().split('T')[0];

        insertSession({
          id: sessionId,
          task_id: taskId || null,
          date: today,
          duration_minutes: minutes,
          notes: notes || null,
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

      const today = new Date().toISOString().split('T')[0];
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
      const today = new Date().toISOString().split('T')[0];
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
        const parseResult = await processPlanFile(content, new Date().toISOString().split('T')[0], filePath);
        console.log(`[FileHandler] Parse result:`, parseResult);

        if (parseResult.success) {
          const today = new Date().toISOString().split('T')[0];
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

  handlersInitialized = true;
  console.log('[IPC] ✅ All handlers initialized successfully');
}
