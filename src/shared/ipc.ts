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

export interface IPCPlanMetadata {
  plan_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  total_hours_estimated: number;
  weekly_hours_avg: number;
  file_path: string | null;
  file_content: string | null;
  imported_at: string;
  analyzed_at: string | null;
  is_active: number;
}

export interface IPCPlanPhase {
  phase_id: string;
  plan_id: string;
  phase_number: number;
  name: string;
  description: string | null;
  week_start: number;
  week_end: number;
  total_hours_allocated: number;
  focus_areas: string | null;
  created_at: string;
}

export interface IPCPlanTask {
  task_id: string;
  phase_id: string;
  week_number: number;
  date_start: string;
  date_end: string;
  subject: string;
  task_type: 'study' | 'project' | 'practice' | 'leetcode' | 'other';
  hours_allocated: number;
  description: string | null;
  deliverables: string | null;
  checkpoint: string | null;
  created_at: string;
}

export interface IPCPlanMilestone {
  milestone_id: string;
  plan_id: string;
  week_number: number;
  description: string;
  success_criteria: string | null;
  completion_status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface IPCPlanAnalysis {
  analysis_id: string;
  plan_id: string;
  total_hours: number;
  weekly_average: number;
  subject_breakdown: string;
  risks: string;
  suggestions: string;
  difficulty_level: string | null;
  feasibility_score: number | null;
  analyzed_at: string;
}

export interface IPCWeeklyProgress {
  progress_id: string;
  plan_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  hours_completed: number;
  hours_target: number;
  completion_percentage: number;
  on_track: number;
  subjects_json: string;
  variance_json: string | null;
  notes: string | null;
  calculated_at: string;
}

export interface IPCUserState {
  state_id: string;
  current_plan_id: string | null;
  current_week: number;
  current_phase: number;
  base_goal_hours: number;
  streak_days: number;
  penalty_mode_active: number;
  penalty_expiration_date: string | null;
  total_hours_studied: number;
  last_study_date: string | null;
  created_at: string;
  updated_at: string;
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
  'db:getWeeklySessions': (endDate?: string) => Promise<IPCSession[]>;
  'db:getWeeklyStats': (endDate?: string) => Promise<Array<{ date: string; total_minutes: number; session_count: number }>>;
  'db:getSubjectBreakdown': (endDate?: string) => Promise<Array<{ subject: string; sessions: number; total_minutes: number }>>;

  // Plan and progress queries
  'plan:getActiveMetadata': () => Promise<IPCPlanMetadata | null>;
  'plan:getAnalysis': () => Promise<IPCPlanAnalysis | null>;
  'plan:getMilestones': () => Promise<IPCPlanMilestone[]>;
  'plan:getCurrentWeekTasks': () => Promise<IPCPlanTask[]>;
  'plan:getWeeklyProgress': () => Promise<IPCWeeklyProgress | null>;
  'plan:getUserState': () => Promise<IPCUserState | null>;
  'plan:recalculateWeeklyProgress': () => Promise<IPCWeeklyProgress | null>;

  // Agent communication
  'agent:sendMessage': (message: string) => Promise<IPCResponse<IPCAgentMessage>>;
  'agent:getTodayContext': () => Promise<IPCResponse<IPCDayContext>>;

  // Task operations
  'task:markDone': (taskId: string) => Promise<IPCResponse>;
  'task:logSession': (taskId: string, minutes: number, notes?: string) => Promise<IPCResponse>;
  'task:updateStatus': (taskId: string, status: string) => Promise<IPCResponse>;
}
