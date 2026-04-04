import { ipcMain } from 'electron';
import {
  getTodayTasks,
  getActiveGoals,
  getTodaySessions,
  getFullContext,
  updateTaskStatus,
  insertSession,
  getTaskById,
} from '../db/queries';
import { receiveMessage } from '../services/messageReceiver';
import type { IPCResponse, IPCDayContext, IPCTask, IPCSession } from '../../shared/ipc';

/**
 * IPC Handlers
 * All handlers receive data from Renderer via IPC and return responses
 * The bridge between Main Process (backend) and Renderer Process (frontend)
 */

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
  ipcMain.handle('agent:getTodayContext', async (event) => {
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

export function setupAllHandlers(): void {
  setupDatabaseHandlers();
  setupTaskHandlers();
  setupAgentHandlers();
}
