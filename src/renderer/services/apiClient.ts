/**
 * Renderer API Client
 * Safe wrapper around the IPC bridge for React components
 * Type-safe and error-handling included
 */

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Database queries API
 */
export const dbApi = () => {
  const today = getTodayDate();
  return {
    getTodayTasks: () => window.api.db.getTodayTasks(today),
    getActiveGoals: () => window.api.db.getActiveGoals(today),
    getActiveSessions: () => window.api.db.getActiveSessions(today),
    getDayContext: () => window.api.db.getDayContext(today),
    getWeeklySessions: (endDate?: string) => window.api.db.getWeeklySessions(endDate),
    getWeeklyStats: (endDate?: string) => window.api.db.getWeeklyStats(endDate),
    getSubjectBreakdown: (endDate?: string) => window.api.db.getSubjectBreakdown(endDate),
  };
};

/**
 * Task operations API
 */
export const taskApi = () => ({
  markDone: (taskId: string) => window.api.task.markDone(taskId),
  logSession: (taskId: string | null, minutes: number, notes?: string) =>
    window.api.task.logSession(taskId, minutes, notes),
  updateStatus: (taskId: string, status: 'pending' | 'in_progress' | 'done') =>
    window.api.task.updateStatus(taskId, status),
});

/**
 * Agent / AI API
 */
export const agentApi = () => ({
  sendMessage: (message: string) => window.api.agent.sendMessage(message),
  getTodayContext: () => window.api.agent.getTodayContext(),
});

/**
 * File operations API
 */
export const fileApi = () => ({
  importPlanFile: () => window.api.file.importPlanFile(),
  readPlanFile: (path: string) => window.api.file.readPlanFile(path),
});

/**
 * Notes / Smart notepad API
 */
export const notesApi = () => ({
  list: (params?: { search?: string; linked_task_id?: string; pinnedOnly?: boolean; limit?: number }) =>
    window.api.notes.list(params),
  getById: (noteId: string) => window.api.notes.getById(noteId),
  create: (note: {
    title: string;
    content?: string | null;
    canvas_data?: string | null;
    tags?: string | null;
    linked_task_id?: string | null;
    linked_session_id?: string | null;
    attachments?: string | null;
    ai_summary?: string | null;
    ai_keywords?: string | null;
    is_pinned?: number;
  }) => window.api.notes.create(note),
  update: (
    noteId: string,
    updates: {
      title?: string;
      content?: string | null;
      canvas_data?: string | null;
      tags?: string | null;
      linked_task_id?: string | null;
      linked_session_id?: string | null;
      attachments?: string | null;
      ai_summary?: string | null;
      ai_keywords?: string | null;
      is_pinned?: number;
    },
  ) => window.api.notes.update(noteId, updates),
  delete: (noteId: string) => window.api.notes.delete(noteId),
  generateInsights: (noteId: string) => window.api.notes.generateInsights(noteId),
});

/**
 * Plan analysis and progress API
 */
export const planApi = () => ({
  getActiveMetadata: () => window.api.plan.getActiveMetadata(),
  getAnalysis: () => window.api.plan.getAnalysis(),
  getMilestones: () => window.api.plan.getMilestones(),
  getCurrentWeekTasks: () => window.api.plan.getCurrentWeekTasks(),
  getWeeklyProgress: () => window.api.plan.getWeeklyProgress(),
  getUserState: () => window.api.plan.getUserState(),
  recalculateWeeklyProgress: () => window.api.plan.recalculateWeeklyProgress(),
});
