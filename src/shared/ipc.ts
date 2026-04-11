/**
 * Shared Types for IPC Communication
 * Used by both Main Process and Renderer Process
 */

export interface IPCTask {
  id: string;
  date: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  status: 'pending' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

export interface IPCSession {
  id: string;
  task_id: string | null;
  date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface IPCGoal {
  id: string;
  date: string;
  description: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface IPCDayContext {
  tasks: IPCTask[];
  sessions: IPCSession[];
  goals: IPCGoal[];
  totalMinutes: number;
}

export interface IPCAgentMessage {
  action:
    | 'mark_done'
    | 'log_session'
    | 'start_timer'
    | 'update_goal'
    | 'start_task'
    | 'pause_task'
    | 'ask_clarification';
  data: Record<string, unknown>;
  reply: string;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * IPC Handler Types for type-safe communication
 */
export interface IPCHandlers {
  // Database queries
  'db:getTodayTasks': (date: string) => Promise<IPCTask[]>;
  'db:getActiveSessions': (date: string) => Promise<IPCSession[]>;
  'db:getActiveGoals': (date: string) => Promise<IPCGoal[]>;
  'db:getDayContext': (date: string) => Promise<IPCDayContext>;

  // Agent communication
  'agent:sendMessage': (message: string) => Promise<IPCResponse<IPCAgentMessage>>;
  'agent:getTodayContext': () => Promise<IPCResponse<IPCDayContext>>;

  // Task operations
  'task:markDone': (taskId: string) => Promise<IPCResponse>;
  'task:logSession': (taskId: string, minutes: number, notes?: string) => Promise<IPCResponse>;
  'task:updateStatus': (taskId: string, status: string) => Promise<IPCResponse>;
}
