import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

/**
 * Initialize SQLite database with schema
 * Creates tables for core app + plan analysis architecture
 * This runs only in the Main Process (Node.js backend)
 */
export function initializeDatabase(): Database.Database {
  if (db) return db;

  // Store database in app user data directory
  const dbPath = path.join(app.getPath('userData'), 'focus-agent.db');
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  db.exec(`
    -- Tasks table (schedule items)
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions table (completed study sessions)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    -- Goals table (daily/active goals)
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plan_metadata (
      plan_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      total_hours_estimated REAL NOT NULL,
      weekly_hours_avg REAL NOT NULL,
      file_path TEXT,
      file_content TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      analyzed_at DATETIME,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS plan_phases (
      phase_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      phase_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      week_start INTEGER NOT NULL,
      week_end INTEGER NOT NULL,
      total_hours_allocated REAL NOT NULL,
      focus_areas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plan_metadata(plan_id)
    );

    CREATE TABLE IF NOT EXISTS plan_tasks (
      task_id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      subject TEXT NOT NULL,
      task_type TEXT NOT NULL
        CHECK (task_type IN ('study', 'project', 'practice', 'leetcode', 'other')),
      hours_allocated REAL NOT NULL,
      description TEXT,
      deliverables TEXT,
      checkpoint TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (phase_id) REFERENCES plan_phases(phase_id)
    );

    CREATE TABLE IF NOT EXISTS plan_milestones (
      milestone_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      description TEXT NOT NULL,
      success_criteria TEXT,
      completion_status TEXT DEFAULT 'pending'
        CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'skipped')),
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plan_metadata(plan_id)
    );

    CREATE TABLE IF NOT EXISTS plan_analysis (
      analysis_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      total_hours REAL NOT NULL,
      weekly_average REAL NOT NULL,
      subject_breakdown TEXT NOT NULL,
      risks TEXT NOT NULL,
      suggestions TEXT NOT NULL,
      difficulty_level TEXT,
      feasibility_score REAL,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plan_metadata(plan_id)
    );

    CREATE TABLE IF NOT EXISTS weekly_progress (
      progress_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      week_start_date TEXT NOT NULL,
      week_end_date TEXT NOT NULL,
      hours_completed REAL NOT NULL,
      hours_target REAL NOT NULL,
      completion_percentage REAL NOT NULL,
      on_track INTEGER NOT NULL,
      subjects_json TEXT NOT NULL,
      variance_json TEXT,
      notes TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plan_metadata(plan_id)
    );

    CREATE TABLE IF NOT EXISTS user_state (
      state_id TEXT PRIMARY KEY DEFAULT 'singleton',
      current_plan_id TEXT,
      current_week INTEGER DEFAULT 1,
      current_phase INTEGER DEFAULT 1,
      base_goal_hours REAL DEFAULT 2.0,
      streak_days INTEGER DEFAULT 0,
      penalty_mode_active INTEGER DEFAULT 0,
      penalty_expiration_date TEXT,
      total_hours_studied REAL DEFAULT 0,
      last_study_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (current_plan_id) REFERENCES plan_metadata(plan_id)
    );

    -- Notes table (smart notepad)
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      canvas_data TEXT,
      tags TEXT,
      linked_task_id TEXT,
      linked_session_id TEXT,
      attachments TEXT,
      ai_summary TEXT,
      ai_keywords TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (linked_task_id) REFERENCES tasks(id),
      FOREIGN KEY (linked_session_id) REFERENCES sessions(id)
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(date);

    CREATE INDEX IF NOT EXISTS idx_plan_tasks_week ON plan_tasks(week_number);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_phase ON plan_tasks(phase_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_week ON plan_milestones(week_number);
    CREATE INDEX IF NOT EXISTS idx_weekly_progress_week ON weekly_progress(week_number);
    CREATE INDEX IF NOT EXISTS idx_weekly_progress_plan ON weekly_progress(plan_id);
    CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
  `);

  // Ensure singleton user_state row exists.
  db.prepare(`
    INSERT OR IGNORE INTO user_state (state_id)
    VALUES ('singleton')
  `).run();

  console.log(' Database initialized:', dbPath);
  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection (call on app quit)
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log(' Database closed');
  }
}

/**
 * Seed the database with sample data for testing
 */
export function seedDatabase(): void {
  const database = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Insert sample tasks
    const insertTask = database.prepare(`
      INSERT OR IGNORE INTO tasks (id, date, name, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertTask.run('phys_01', today, 'Physics - Thermal Dynamics', '09:00', '10:30', 'pending');
    insertTask.run('math_01', today, 'Mathematics - Calculus Review', '11:00', '12:30', 'pending');
    insertTask.run('chem_01', today, 'Chemistry - Lab Report', '14:00', '15:30', 'pending');

    // Insert sample goals
    const insertGoal = database.prepare(`
      INSERT OR IGNORE INTO goals (id, date, description, active)
      VALUES (?, ?, ?, ?)
    `);

    insertGoal.run('goal_01', today, 'Complete all 3 subjects without distractions', 1);
    insertGoal.run('goal_02', today, 'Finish Physics homework by 11 AM', 1);

    console.log(' Sample data seeded');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

/**
 * Clear all data (useful for testing)
 */
export function clearDatabase(): void {
  const database = getDatabase();
  try {
    database.exec(`
      DELETE FROM weekly_progress;
      DELETE FROM plan_analysis;
      DELETE FROM plan_milestones;
      DELETE FROM plan_tasks;
      DELETE FROM plan_phases;
      DELETE FROM plan_metadata;
      DELETE FROM notes;
      DELETE FROM sessions;
      DELETE FROM goals;
      DELETE FROM tasks;
      UPDATE user_state
      SET current_plan_id = NULL,
          current_week = 1,
          current_phase = 1,
          streak_days = 0,
          penalty_mode_active = 0,
          penalty_expiration_date = NULL,
          total_hours_studied = 0,
          last_study_date = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE state_id = 'singleton';
    `);
    console.log(' Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}
