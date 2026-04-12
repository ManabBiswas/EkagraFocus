import { getDatabase } from './database';
import type { IPCTask, IPCSession, IPCGoal, IPCDayContext } from '../../shared/ipc';

/**
 * Database Query Layer
 * All queries are executed in the Main Process (Node.js backend)
 * Results are serialized and sent to Renderer via IPC
 */

/**
 * Get all tasks for a specific date
 */
export function getTodayTasks(date: string): IPCTask[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY start_time');
  return stmt.all(date) as IPCTask[];
}

/**
 * Get a single task by ID
 */
export function getTaskById(taskId: string): IPCTask | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  return stmt.get(taskId) as IPCTask | undefined;
}

/**
 * Get all active goals for a date
 */
export function getActiveGoals(date: string): IPCGoal[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM goals WHERE date = ? AND active = 1');
  return stmt.all(date) as IPCGoal[];
}

/**
 * Get all sessions for a specific date
 */
export function getTodaySessions(date: string): IPCSession[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE date = ? ORDER BY created_at');
  return stmt.all(date) as IPCSession[];
}

/**
 * Get sessions for a specific task
 */
export function getSessionsForTask(taskId: string): IPCSession[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE task_id = ? ORDER BY created_at DESC');
  return stmt.all(taskId) as IPCSession[];
}

/**
 * Get total minutes studied on a specific date
 */
export function getTotalMinutesToday(date: string): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT SUM(duration_minutes) as total FROM sessions WHERE date = ?');
  const result = stmt.get(date) as { total: number | null };
  return result.total ?? 0;
}

/**
 * Get all tasks (across all dates) with a specific status
 */
export function getTasksByStatus(status: 'pending' | 'in_progress' | 'done'): IPCTask[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY date DESC, start_time');
  return stmt.all(status) as IPCTask[];
}

/**
 * Update task status
 */
export function updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'done'): boolean {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const result = stmt.run(status, taskId);
  return result.changes > 0;
}

/**
 * Insert a new task
 */
export function insertTask(task: Omit<IPCTask, 'created_at' | 'updated_at'>): string {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, date, name, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(task.id, task.date, task.name, task.start_time, task.end_time, task.status);
  return task.id;
}

/**
 * Insert a new session
 */
export function insertSession(session: Omit<IPCSession, 'created_at'>): string {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, task_id, date, duration_minutes, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(session.id, session.task_id, session.date, session.duration_minutes, session.notes);
  return session.id;
}

/**
 * Insert a new goal
 */
export function insertGoal(goal: Omit<IPCGoal, 'created_at' | 'updated_at'>): string {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO goals (id, date, description, active)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(goal.id, goal.date, goal.description, goal.active);
  return goal.id;
}

/**
 * Get all data for context building (the full state for a day)
 * This is what gets passed to the AI context builder
 */
export function getFullContext(date: string): IPCDayContext {
  return {
    tasks: getTodayTasks(date),
    sessions: getTodaySessions(date),
    goals: getActiveGoals(date),
    totalMinutes: getTotalMinutesToday(date),
  };
}

/**
 * Get sessions for the last 7 days (for weekly stats)
 */
export function getWeeklySessions(endDate? : string): IPCSession[] {
  const db = getDatabase();
  
  // Calculate 7 days ago
  const end = endDate || new Date().toISOString().split('T')[0];
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];
  
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE date >= ? AND date <= ? 
    ORDER BY date DESC, created_at DESC
  `);
  return stmt.all(start, end) as IPCSession[];
}

/**
 * Get aggregated stats by date for last 7 days
 */
export function getWeeklyStatsByDate(endDate?: string) {
  const db = getDatabase();
  
  // Calculate 7 days ago
  const end = endDate || new Date().toISOString().split('T')[0];
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];
  
  const stmt = db.prepare(`
    SELECT date, SUM(duration_minutes) as total_minutes, COUNT(*) as session_count
    FROM sessions 
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date DESC
  `);
  return stmt.all(start, end) as Array<{ date: string; total_minutes: number; session_count: number }>;
}

/**
 * Get subject breakdown for last 7 days
 */
export function getWeeklySubjectBreakdown(endDate?: string) {
  const db = getDatabase();
  
  // Calculate 7 days ago
  const end = endDate || new Date().toISOString().split('T')[0];
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];
  
  const stmt = db.prepare(`
    SELECT 
      COALESCE(notes, 'Untagged') as subject,
      COUNT(*) as sessions,
      SUM(duration_minutes) as total_minutes
    FROM sessions
    WHERE date >= ? AND date <= ? AND notes IS NOT NULL
    GROUP BY subject
    ORDER BY total_minutes DESC
  `);
  return stmt.all(start, end) as Array<{ subject: string; sessions: number; total_minutes: number }>;
}
