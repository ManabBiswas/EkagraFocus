import { contextBridge, ipcRenderer } from 'electron';
import type { IPCDayContext, IPCTask, IPCSession, IPCGoal } from './shared/ipc';

interface DBStateChangedPayload {
  event: 'SESSION_LOGGED' | 'TASK_UPDATED' | 'PLAN_IMPORTED';
  data: unknown;
  timestamp: string;
}

/**
 * SECURE IPC BRIDGE
 *
 * This preload script safely exposes IPC channels using contextBridge.
 * React code can ONLY call what's exposed here - no direct node/fs access.
 * Each exposed function is type-safe and validated.
 */

const api = {
  // ─────────────────────────────────────────────────────────────
  // DATABASE QUERIES (Read-only)
  // ─────────────────────────────────────────────────────────────

  db: {
    /**
     * Get all tasks for a specific date
     */
    getTodayTasks: async (date: string): Promise<IPCTask[]> => {
      const result = await ipcRenderer.invoke('db:getTodayTasks', date);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    /**
     * Get all active goals for a date
     */
    getActiveGoals: async (date: string): Promise<IPCGoal[]> => {
      const result = await ipcRenderer.invoke('db:getActiveGoals', date);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    /**
     * Get all study sessions for a date
     */
    getActiveSessions: async (date: string): Promise<IPCSession[]> => {
      const result = await ipcRenderer.invoke('db:getActiveSessions', date);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    /**
     * Get full day context (everything: tasks, goals, sessions)
     */
    getDayContext: async (date: string): Promise<IPCDayContext> => {
      const result = await ipcRenderer.invoke('db:getDayContext', date);
      if (!result.success) throw new Error(result.error);
      return result.data || { tasks: [], sessions: [], goals: [], totalMinutes: 0 };
    },
  },

  // ─────────────────────────────────────────────────────────────
  // TASK OPERATIONS (Write)
  // ─────────────────────────────────────────────────────────────

  task: {
    /**
     * Mark a task as done
     */
    markDone: async (taskId: string): Promise<void> => {
      const result = await ipcRenderer.invoke('task:markDone', taskId);
      if (!result.success) throw new Error(result.error);
    },

    /**
     * Log a study session
     */
    logSession: async (
      taskId: string | null,
      durationMinutes: number,
      notes?: string,
    ): Promise<void> => {
      const result = await ipcRenderer.invoke('task:logSession', taskId, durationMinutes, notes);
      if (!result.success) throw new Error(result.error);
    },

    /**
     * Update task status
     */
    updateStatus: async (taskId: string, status: 'pending' | 'in_progress' | 'done'): Promise<void> => {
      const result = await ipcRenderer.invoke('task:updateStatus', taskId, status);
      if (!result.success) throw new Error(result.error);
    },
  },

  // ─────────────────────────────────────────────────────────────
  // AGENT / AI OPERATIONS
  // ─────────────────────────────────────────────────────────────

  agent: {
    /**
     * Send a message to the AI agent
     * Receives parsed response with action + reply
     */
    sendMessage: async (message: string) => {
      const result = await ipcRenderer.invoke('agent:sendMessage', message);
      return result;
    },

    /**
     * Get today's context for the agent
     */
    getTodayContext: async (): Promise<IPCDayContext> => {
      const result = await ipcRenderer.invoke('agent:getTodayContext');
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  },

  // ─────────────────────────────────────────────────────────────
  // FILE OPERATIONS
  // ─────────────────────────────────────────────────────────────

  file: {
    /**
     * Open file picker and read markdown plan
     */
    importPlanFile: async () => {
      return await ipcRenderer.invoke('import-plan-file');
    },

    /**
     * Read a plan file from a given path
     */
    readPlanFile: async (filePath: string) => {
      return await ipcRenderer.invoke('read-plan-file', filePath);
    },
  },

  events: {
    onDbStateChanged: (callback: (payload: DBStateChangedPayload) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: DBStateChangedPayload) => {
        callback(payload);
      };

      ipcRenderer.on('db-state-changed', listener);

      return () => {
        ipcRenderer.removeListener('db-state-changed', listener);
      };
    },
  },
};

// Expose API to React context
contextBridge.exposeInMainWorld('api', api);

export {};
