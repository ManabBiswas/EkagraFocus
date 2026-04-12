import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  getTodayTasks,
  getActiveGoals,
  getTodaySessions,
  getFullContext,
  updateTaskStatus,
  insertSession,
  getTaskById,
  getWeeklySessions,
  getWeeklyStatsByDate,
  getWeeklySubjectBreakdown,
} from '../db/queries';
import { receiveMessage } from '../services/messageReceiver';
import { processPlanFile } from '../services/planParser';
import type { IPCResponse, IPCDayContext, IPCTask, IPCSession } from '../../shared/ipc';

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

        notifyRendererStateChange('SESSION_LOGGED', {
          sessionId,
          taskId: taskId || null,
          minutes,
          context: getFullContext(today),
        });

        return { success: true, data: { sessionId } } as IPCResponse;
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
        const parseResult = processPlanFile(content);
        console.log(`[FileHandler] Parse result:`, parseResult);

        if (parseResult.success) {
          const today = new Date().toISOString().split('T')[0];
          notifyRendererStateChange('PLAN_IMPORTED', {
            fileName,
            filePath,
            tasksImported: parseResult.tasksCount,
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
  
  console.log('[IPC] Setting up task handlers...');
  setupTaskHandlers();
  console.log('[IPC] ✓ Task handlers done');
  
  console.log('[IPC] Setting up agent handlers...');
  setupAgentHandlers();
  console.log('[IPC] ✓ Agent handlers done');
  
  console.log('[IPC] Setting up file handlers...');
  setupFileHandlers();
  console.log('[IPC] ✓ File handlers done');

  handlersInitialized = true;
  console.log('[IPC] ✅ All handlers initialized successfully');
}
