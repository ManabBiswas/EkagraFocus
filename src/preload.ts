import { contextBridge, ipcRenderer, webFrame } from 'electron';
import type {
  IPCDayContext,
  IPCGoal,
  IPCPlanAnalysis,
  IPCPlanMetadata,
  IPCPlanMilestone,
  IPCPlanTask,
  IPCResponse,
  IPCSession,
  IPCTask,
  IPCUserState,
  IPCWeeklyProgress,
} from './shared/ipc';

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

    getWeeklySessions: async (endDate?: string): Promise<IPCSession[]> => {
      const result = await ipcRenderer.invoke('db:getWeeklySessions', endDate);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    getWeeklyStats: async (
      endDate?: string,
    ): Promise<Array<{ date: string; total_minutes: number; session_count: number }>> => {
      const result = await ipcRenderer.invoke('db:getWeeklyStats', endDate);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    getSubjectBreakdown: async (
      endDate?: string,
    ): Promise<Array<{ subject: string; sessions: number; total_minutes: number }>> => {
      const result = await ipcRenderer.invoke('db:getSubjectBreakdown', endDate);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
  },

  // ─────────────────────────────────────────────────────────────
  // PLAN & PROGRESS (Read mostly)
  // ─────────────────────────────────────────────────────────────
  plan: {
    getActiveMetadata: async (): Promise<IPCPlanMetadata | null> => {
      const result = await ipcRenderer.invoke('plan:getActiveMetadata');
      if (!result.success) throw new Error(result.error);
      return result.data || null;
    },

    getAnalysis: async (): Promise<IPCPlanAnalysis | null> => {
      const result = await ipcRenderer.invoke('plan:getAnalysis');
      if (!result.success) throw new Error(result.error);
      return result.data || null;
    },

    getMilestones: async (): Promise<IPCPlanMilestone[]> => {
      const result = await ipcRenderer.invoke('plan:getMilestones');
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    getCurrentWeekTasks: async (): Promise<IPCPlanTask[]> => {
      const result = await ipcRenderer.invoke('plan:getCurrentWeekTasks');
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },

    getWeeklyProgress: async (): Promise<IPCWeeklyProgress | null> => {
      const result = await ipcRenderer.invoke('plan:getWeeklyProgress');
      if (!result.success) throw new Error(result.error);
      return result.data || null;
    },

    getUserState: async (): Promise<IPCUserState | null> => {
      const result = await ipcRenderer.invoke('plan:getUserState');
      if (!result.success) throw new Error(result.error);
      return result.data || null;
    },

    recalculateWeeklyProgress: async (): Promise<IPCWeeklyProgress | null> => {
      const result = await ipcRenderer.invoke('plan:recalculateWeeklyProgress');
      if (!result.success) throw new Error(result.error);
      return result.data || null;
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
    importPlanFile: async (): Promise<IPCResponse<unknown>> => {
      // Returns IPCResponse directly from handler
      return await ipcRenderer.invoke('import-plan-file');
    },

    /**
     * Read a plan file from a given path
     */
    readPlanFile: async (filePath: string): Promise<IPCResponse<unknown>> => {
      // Returns IPCResponse directly from handler
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

  // ─────────────────────────────────────────────────────────────
  // WINDOW CONTROLS
  // ─────────────────────────────────────────────────────────────
  window: {
    minimize: async () => {
      return await ipcRenderer.invoke('window:minimize');
    },
    maximize: async () => {
      return await ipcRenderer.invoke('window:maximize');
    },
    close: async () => {
      return await ipcRenderer.invoke('window:close');
    },
    zoomIn: async () => {
      const nextLevel = Math.min(4, webFrame.getZoomLevel() + 0.5);
      webFrame.setZoomLevel(nextLevel);
      return webFrame.getZoomFactor();
    },
    zoomOut: async () => {
      const nextLevel = Math.max(-3, webFrame.getZoomLevel() - 0.5);
      webFrame.setZoomLevel(nextLevel);
      return webFrame.getZoomFactor();
    },
    zoomReset: async () => {
      webFrame.setZoomLevel(0);
      return webFrame.getZoomFactor();
    },
    getZoomFactor: async () => {
      return webFrame.getZoomFactor();
    },
  },
};

// Expose API to React context
contextBridge.exposeInMainWorld('api', api);

export {};
