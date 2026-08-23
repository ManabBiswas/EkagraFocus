declare module '*.css' {
  const content: string;
  export default content;
}

import type {
  IPCTask,
  IPCSession,
  IPCGoal,
  IPCNote,
  IPCNoteCreateInput,
  IPCNotesListParams,
  IPCNoteUpdateInput,
  IPCDayContext,
  IPCAgentMessage,
  IPCResponse,
  IPCSessionLogResult,
  IPCPlanMetadata,
  IPCPlanAnalysis,
  IPCPlanMilestone,
  IPCPlanTask,
  IPCWeeklyProgress,
  IPCUserState,
  IPCChatSession,
  IPCChatMessage,
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
  logSession: (taskId: string | null, minutes: number, notes?: string, startTime?: string | null, endTime?: string | null) => Promise<IPCSessionLogResult>;
  updateStatus: (taskId: string, status: 'pending' | 'in_progress' | 'done') => Promise<void>;
}

interface IPCAgent {
  sendMessage: (sessionId: string, message: string) => Promise<IPCResponse<IPCAgentMessage>>;
  getTodayContext: () => Promise<IPCDayContext>;
}

interface IPCChat {
  getSessions: () => Promise<IPCResponse<IPCChatSession[]>>;
  getMessages: (sessionId: string) => Promise<IPCResponse<IPCChatMessage[]>>;
  createSession: (title: string) => Promise<IPCResponse<IPCChatSession>>;
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
        planId?: string;
        metadata?: {
          title: string;
          durationDays: number;
          weeks: number;
        };
        analysis?: {
          totalHours: number;
          weeklyAverage: number;
          feasibilityScore?: number;
        };
      };
    }>
  >;
  readPlanFile: (filePath: string) => Promise<IPCResponse<{ filePath: string; fileName: string; content: string }>>;
  exportData: () => Promise<IPCResponse<{ exported: boolean }>>;
}

interface IPCNotes {
  list: (params?: IPCNotesListParams) => Promise<IPCNote[]>;
  getById: (noteId: string) => Promise<IPCNote | null>;
  create: (note: IPCNoteCreateInput) => Promise<IPCNote>;
  update: (noteId: string, updates: IPCNoteUpdateInput) => Promise<IPCNote | null>;
  delete: (noteId: string) => Promise<{ deleted: boolean }>;
  generateInsights: (noteId: string) => Promise<IPCNote | null>;
}

interface IPCPlan {
  getActiveMetadata: () => Promise<IPCPlanMetadata | null>;
  getAnalysis: () => Promise<IPCPlanAnalysis | null>;
  getMilestones: () => Promise<IPCPlanMilestone[]>;
  getCurrentWeekTasks: () => Promise<IPCPlanTask[]>;
  getWeeklyProgress: () => Promise<IPCWeeklyProgress | null>;
  getUserState: () => Promise<IPCUserState | null>;
  recalculateWeeklyProgress: () => Promise<IPCWeeklyProgress | null>;
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
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
  getZoomFactor: () => Promise<number>;
}

interface IPCRedistribution {
  trigger: (payload: { date: string; totalGoalHours: number; hoursCompleted: number; subject?: string | null; spreadDays?: number; maxExtraHoursPerDay?: number }) => Promise<unknown>;
  getSummary: () => Promise<unknown>;
  getHoursForDate: (date: string) => Promise<unknown>;
  getAllPending: () => Promise<unknown>;
  markApplied: (date: string) => Promise<unknown>;
  clear: (sourceDate: string) => Promise<unknown>;
}

interface IPCBurnout {
  getReport: () => Promise<IPCResponse>;
  getLiveRisk: () => Promise<IPCResponse>;
}

interface API {
  db: IPCDB;
  task: IPCTaskOps;
  agent: IPCAgent;
  chat: IPCChat;
  file: IPCFile;
  notes: IPCNotes;
  plan: IPCPlan;
  events: IPCEvents;
  redistribution: IPCRedistribution;
  burnout: IPCBurnout;
  window: IPCWindow;
}

declare global {
  interface Window {
    api: API;
  }
}

export {};
