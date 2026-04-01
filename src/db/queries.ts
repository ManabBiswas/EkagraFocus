import { getDatabase } from './database';

export interface Task {
  id: string;
  date: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  status: 'pending' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  task_id: string | null;
  date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  date: string;
  description: string;
  active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all tasks for a specific date
 */
export function getTodayTasks(date: string): Task[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY start_time');
  return stmt.all(date) as Task[];
}

/**
 * Get a single task by ID
 */
export function getTaskById(taskId: string): Task | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  return stmt.get(taskId) as Task | undefined;
}

/**
 * Get all active goals for a date
 */
export function getActiveGoals(date: string): Goal[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM goals WHERE date = ? AND active = 1');
  return stmt.all(date) as Goal[];
}

/**
 * Get all sessions for a specific date
 */
export function getTodaySessions(date: string): Session[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE date = ? ORDER BY created_at');
  return stmt.all(date) as Session[];
}

/**
 * Get sessions for a specific task
 */
export function getSessionsForTask(taskId: string): Session[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE task_id = ? ORDER BY created_at DESC');
  return stmt.all(taskId) as Session[];
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
export function getTasksByStatus(status: 'pending' | 'in_progress' | 'done'): Task[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY date DESC, start_time');
  return stmt.all(status) as Task[];
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
export function insertTask(task: Omit<Task, 'created_at' | 'updated_at'>): string {
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
export function insertSession(session: Omit<Session, 'created_at'>): string {
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
export function insertGoal(goal: Omit<Goal, 'created_at' | 'updated_at'>): string {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO goals (id, date, description, active)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(goal.id, goal.date, goal.description, goal.active);
  return goal.id;
}

/**
 * Get all data for context building (the full state)
 */
export function getFullContext(date: string) {
  return {
    tasks: getTodayTasks(date),
    sessions: getTodaySessions(date),
    goals: getActiveGoals(date),
    totalMinutes: getTotalMinutesToday(date),
  };
}
