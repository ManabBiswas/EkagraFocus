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
}

interface IPCTaskOps {
  markDone: (taskId: string) => Promise<void>;
  logSession: (taskId: string | null, minutes: number, notes?: string) => Promise<void>;
  updateStatus: (taskId: string, status: 'pending' | 'in_progress' | 'done') => Promise<void>;
}

interface IPCAgent {
  sendMessage: (message: string) => Promise<IPCAgentMessage>;
  getTodayContext: () => Promise<IPCDayContext>;
}

interface IPCFile {
  importPlanFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
  readPlanFile: (filePath: string) => Promise<{ filePath: string; fileName: string; content: string } | null>;
}

interface API {
  db: IPCDB;
  task: IPCTaskOps;
  agent: IPCAgent;
  file: IPCFile;
}

declare global {
  interface Window {
    api: API;
  }
}

export {};
