import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

/**
 * Initialize SQLite database with schema
 * Creates tables: tasks, sessions, goals
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

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(date);
  `);

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
    database.exec('DELETE FROM sessions; DELETE FROM goals; DELETE FROM tasks;');
    console.log(' Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}
