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
