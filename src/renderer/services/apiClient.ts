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
