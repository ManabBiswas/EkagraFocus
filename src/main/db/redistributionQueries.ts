import { getDatabase } from './database';
 
export interface RedistributionEntry {
  id: string;
  source_date: string;       // the day that was incomplete
  target_date: string;       // the future day getting extra hours
  hours_assigned: number;    // how many hours redistributed to this day
  subject: string | null;    // optional subject context
  reason: string;            // e.g. "incomplete_goal"
  applied: number;           // 0 = pending, 1 = applied
  created_at: string;
}
 
export interface RedistributionSummary {
  targetDate: string;
  totalRedistributedHours: number;
  entries: RedistributionEntry[];
}
 
function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
 
// ─── Table Bootstrap ──────────────────────────────────────────────────────────
// Call this once at app startup (from database.ts or index.ts).
// Uses CREATE TABLE IF NOT EXISTS so it is always safe to call.
 
export function ensureRedistributionTable(): void {
  const db = getDatabase();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS workload_redistribution (
      id           TEXT PRIMARY KEY,
      source_date  TEXT NOT NULL,
      target_date  TEXT NOT NULL,
      hours_assigned REAL NOT NULL,
      subject      TEXT,
      reason       TEXT NOT NULL DEFAULT 'incomplete_goal',
      applied      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
 
  // Index so lookups by target_date are fast
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_redistribution_target_date
    ON workload_redistribution(target_date)
  `).run();
 
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_redistribution_source_date
    ON workload_redistribution(source_date)
  `).run();
}
 
// ─── Core redistribution logic ────────────────────────────────────────────────
 
/**
 * Given a source date and remaining hours, spread the load across the next
 * `spreadDays` future study days, respecting `maxExtraHoursPerDay`.
 *
 * Rules:
 *  - Skip weekends (Saturday=6, Sunday=0) unless `includeWeekends` = true
 *  - Never assign more than `maxExtraHoursPerDay` extra on a single day
 *  - Distribute as evenly as possible; last bucket gets the remainder
 *
 * Returns the list of entries written to the DB.
 */
export function redistributeIncompleteHours(
  sourceDate: string,
  remainingHours: number,
  options: {
    spreadDays?: number;        // default 5
    maxExtraHoursPerDay?: number; // default 2
    subject?: string | null;
    includeWeekends?: boolean;
  } = {}
): RedistributionEntry[] {
  if (remainingHours <= 0) return [];
 
  const db = getDatabase();
  const {
    spreadDays = 5,
    maxExtraHoursPerDay = 2,
    subject = null,
    includeWeekends = false,
  } = options;
 
  // Remove any existing (non-applied) redistribution for this source_date
  // so we don't double-up if called again for the same day.
  db.prepare(`
    DELETE FROM workload_redistribution
    WHERE source_date = ? AND applied = 0
  `).run(sourceDate);
 
  // Build the list of future dates to spread onto
  const futureDates: string[] = [];
  const base = new Date(sourceDate);
  const cursor = new Date(base);
  cursor.setDate(cursor.getDate() + 1); // start from day after source
 
  while (futureDates.length < spreadDays) {
    const day = cursor.getDay(); // 0=Sun, 6=Sat
    const isWeekend = day === 0 || day === 6;
    if (includeWeekends || !isWeekend) {
      futureDates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
 
  // Calculate per-day allocation
  const perDay = Math.min(remainingHours / futureDates.length, maxExtraHoursPerDay);
  const rounded = Math.round(perDay * 100) / 100;
 
  const insertStmt = db.prepare(`
    INSERT INTO workload_redistribution
      (id, source_date, target_date, hours_assigned, subject, reason, applied)
    VALUES (?, ?, ?, ?, ?, 'incomplete_goal', 0)
  `);
 
  const insertMany = db.transaction((dates: string[]) => {
    const inserted: RedistributionEntry[] = [];
    let remaining = Math.round(remainingHours * 100) / 100;
 
    for (let i = 0; i < dates.length; i++) {
      if (remaining <= 0) break;
 
      // Last bucket gets whatever is left (avoids rounding loss)
      const isLast = i === dates.length - 1;
      const assign = isLast
        ? Math.round(Math.min(remaining, maxExtraHoursPerDay) * 100) / 100
        : Math.round(Math.min(rounded, remaining, maxExtraHoursPerDay) * 100) / 100;
 
      if (assign <= 0) break;
 
      const id = createId('redist');
      insertStmt.run(id, sourceDate, dates[i], assign, subject);
      remaining = Math.round((remaining - assign) * 100) / 100;
 
      inserted.push({
        id,
        source_date: sourceDate,
        target_date: dates[i],
        hours_assigned: assign,
        subject,
        reason: 'incomplete_goal',
        applied: 0,
        created_at: new Date().toISOString(),
      });
    }
    return inserted;
  });
 
  return insertMany(futureDates);
}
 
// ─── Queries ──────────────────────────────────────────────────────────────────
 
/** Get all redistribution entries that target a specific date */
export function getRedistributionForDate(targetDate: string): RedistributionEntry[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM workload_redistribution
    WHERE target_date = ?
    ORDER BY created_at ASC
  `).all(targetDate) as RedistributionEntry[];
}
 
/** Get total extra hours assigned to a target date (pending only) */
export function getRedistributedHoursForDate(targetDate: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT COALESCE(SUM(hours_assigned), 0) as total
    FROM workload_redistribution
    WHERE target_date = ? AND applied = 0
  `).get(targetDate) as { total: number };
  return Math.round((result?.total || 0) * 100) / 100;
}
 
/** Get all pending redistributions (for dashboard display) */
export function getAllPendingRedistributions(): RedistributionEntry[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM workload_redistribution
    WHERE applied = 0
    ORDER BY target_date ASC, created_at ASC
  `).all() as RedistributionEntry[];
}
 
/** Get a summary grouped by target date */
export function getRedistributionSummary(): RedistributionSummary[] {
  const db = getDatabase();
  const entries = db.prepare(`
    SELECT * FROM workload_redistribution
    WHERE applied = 0
    ORDER BY target_date ASC
  `).all() as RedistributionEntry[];
 
  const byDate = new Map<string, RedistributionEntry[]>();
  for (const entry of entries) {
    if (!byDate.has(entry.target_date)) byDate.set(entry.target_date, []);
    const dateEntries = byDate.get(entry.target_date);
if (dateEntries) dateEntries.push(entry);
  }
 
  return Array.from(byDate.entries()).map(([date, dateEntries]) => ({
    targetDate: date,
    totalRedistributedHours: Math.round(
      dateEntries.reduce((sum, e) => sum + e.hours_assigned, 0) * 100
    ) / 100,
    entries: dateEntries,
  }));
}
 
/** Mark all entries for a target date as applied */
export function markRedistributionApplied(targetDate: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE workload_redistribution
    SET applied = 1
    WHERE target_date = ? AND applied = 0
  `).run(targetDate);
  return result.changes;
}
 
/** Delete all redistribution entries for a source date (manual clear) */
export function clearRedistributionForSource(sourceDate: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    DELETE FROM workload_redistribution WHERE source_date = ?
  `).run(sourceDate);
  return result.changes;
}
 
/** Check if today has any incomplete hours that need redistribution */
export function detectIncompleteGoal(
  date: string,
  totalGoalHours: number,
  hoursCompleted: number
): { isIncomplete: boolean; remainingHours: number } {
  const remaining = Math.max(
    Math.round((totalGoalHours - hoursCompleted) * 100) / 100,
    0
  );
  return {
    isIncomplete: remaining > 0,
    remainingHours: remaining,
  };
}
 