declare module '*.css' {
  const content: string;
  export default content;
}

import type {
  IPCTask,
  IPCSession,
  IPCGoal,
  IPCDayContext,
  IPCAgentMessage,
  IPCResponse,
} from './shared/ipc';

/**
 * Type definitions for the secure IPC bridge
 * Exposed in src/preload.ts via contextBridge
 */

interface IPCDB {
  getTodayTasks: (date: string) => Promise<IPCTask[]>;
  getActiveGoals: (date: string) => Promise<IPCGoal[]>;
  getActiveSessions: (date: string) => Promise<IPCSession[]>;
  getDayContext: (date: string) => Promise<IPCDayContext>;
  getWeeklySessions: (endDate?: string) => Promise<IPCSession[]>;
  getWeeklyStats: (endDate?: string) => Promise<Array<{ date: string; total_minutes: number; session_count: number }>>;
  getSubjectBreakdown: (endDate?: string) => Promise<Array<{ subject: string; sessions: number; total_minutes: number }>>;
}

interface IPCTaskOps {
  markDone: (taskId: string) => Promise<void>;
  logSession: (taskId: string | null, minutes: number, notes?: string) => Promise<void>;
  updateStatus: (taskId: string, status: 'pending' | 'in_progress' | 'done') => Promise<void>;
}

interface IPCAgent {
  sendMessage: (message: string) => Promise<IPCResponse<IPCAgentMessage>>;
  getTodayContext: () => Promise<IPCDayContext>;
}

interface IPCFile {
  importPlanFile: () => Promise<
    IPCResponse<{
      filePath: string;
      fileName: string;
      content: string;
      parseResult?: {
        tasksImported: number;
        details: string;
      };
    }>
  >;
  readPlanFile: (filePath: string) => Promise<IPCResponse<{ filePath: string; fileName: string; content: string }>>;
}

interface DBStateChangedPayload {
  event: 'SESSION_LOGGED' | 'TASK_UPDATED' | 'PLAN_IMPORTED';
  data: unknown;
  timestamp: string;
}

interface IPCEvents {
  onDbStateChanged: (callback: (payload: DBStateChangedPayload) => void) => () => void;
}

interface IPCWindow {
  minimize: () => Promise<boolean>;
  maximize: () => Promise<boolean>;
  close: () => Promise<boolean>;
}

interface API {
  db: IPCDB;
  task: IPCTaskOps;
  agent: IPCAgent;
  file: IPCFile;
  events: IPCEvents;
  window: IPCWindow;
}

declare global {
  interface Window {
    api: API;
  }
}

export {};
