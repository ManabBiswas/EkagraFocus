import { getDatabase } from './database';
import type {
  IPCDayContext,
  IPCGoal,
  IPCPlanAnalysis,
  IPCPlanMetadata,
  IPCPlanMilestone,
  IPCPlanTask,
  IPCSession,
  IPCTask,
  IPCUserState,
  IPCWeeklyProgress,
} from '../../shared/ipc';

export interface PlanImportMetadataInput {
  plan_id?: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  total_hours_estimated: number;
  weekly_hours_avg: number;
  file_path?: string | null;
  file_content?: string | null;
}

export interface PlanImportPhaseInput {
  phase_id?: string;
  phase_number: number;
  name: string;
  description?: string | null;
  week_start: number;
  week_end: number;
  total_hours_allocated: number;
  focus_areas?: string | null;
}

export interface PlanImportTaskInput {
  task_id?: string;
  phase_number: number;
  week_number: number;
  date_start: string;
  date_end: string;
  subject: string;
  task_type: 'study' | 'project' | 'practice' | 'leetcode' | 'other';
  hours_allocated: number;
  description?: string | null;
  deliverables?: string | null;
  checkpoint?: string | null;
}

export interface PlanImportMilestoneInput {
  milestone_id?: string;
  week_number: number;
  description: string;
  success_criteria?: string | null;
}

export interface PlanImportAnalysisInput {
  total_hours: number;
  weekly_average: number;
  subject_breakdown: Record<string, number>;
  risks: string[];
  suggestions: string[];
  difficulty_level?: string;
  feasibility_score?: number;
}

export interface PlanImportBundle {
  metadata: PlanImportMetadataInput;
  phases: PlanImportPhaseInput[];
  tasks: PlanImportTaskInput[];
  milestones: PlanImportMilestoneInput[];
  analysis: PlanImportAnalysisInput;
  initialWeek?: number;
  initialPhase?: number;
}

export interface PlanImportResult {
  planId: string;
  importedPhases: number;
  importedTasks: number;
  importedMilestones: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const todayIso = (): string => new Date().toISOString().split('T')[0];

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toTaskDisplayName(subject: string, description?: string | null): string {
  const cleanSubject = (subject || '').replace(/\s+/g, ' ').trim();
  const cleanDescription = (description || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

  if (!cleanDescription) return cleanSubject || 'Study Task';
  if (!cleanSubject) return cleanDescription;

  const subjectLower = cleanSubject.toLowerCase();
  const descriptionLower = cleanDescription.toLowerCase();

  // Avoid duplicates like "Math: Math (2h)" in the today task list used by chat responses.
  if (
    descriptionLower === subjectLower ||
    descriptionLower.includes(subjectLower) ||
    subjectLower.includes(descriptionLower)
  ) {
    return cleanSubject;
  }

  return `${cleanSubject} - ${cleanDescription}`;
}

function getWeekDateRangeFromStart(startDate: string, weekNumber: number): { start: string; end: string } {
  const base = new Date(startDate);
  base.setDate(base.getDate() + (weekNumber - 1) * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  return {
    start: base.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getTodayTasks(date: string): IPCTask[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY start_time').all(date) as IPCTask[];
}

export function getTaskById(taskId: string): IPCTask | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as IPCTask | undefined;
}

export function getActiveGoals(date: string): IPCGoal[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM goals WHERE date = ? AND active = 1').all(date) as IPCGoal[];
}

export function getTodaySessions(date: string): IPCSession[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM sessions WHERE date = ? ORDER BY created_at').all(date) as IPCSession[];
}

export function getSessionsForTask(taskId: string): IPCSession[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM sessions WHERE task_id = ? ORDER BY created_at').all(taskId) as IPCSession[];
}

export function getTotalMinutesToday(date: string): number {
  const db = getDatabase();
  const result = db
    .prepare('SELECT SUM(duration_minutes) as total FROM sessions WHERE date = ?')
    .get(date) as { total?: number } | undefined;
  return result?.total || 0;
}

export function updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'done'): boolean {
  const db = getDatabase();
  const result = db
    .prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, taskId);
  return result.changes > 0;
}

export function insertSession(session: Omit<IPCSession, 'created_at'>): string {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO sessions (id, task_id, date, duration_minutes, notes)
     VALUES (?, ?, ?, ?, ?)`
  ).run(session.id, session.task_id, session.date, session.duration_minutes, session.notes);
  return session.id;
}

export function insertTask(task: Omit<IPCTask, 'created_at' | 'updated_at'>): string {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO tasks (id, date, name, start_time, end_time, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(task.id, task.date, task.name, task.start_time, task.end_time, task.status);
  return task.id;
}

export function insertGoal(goal: Omit<IPCGoal, 'created_at' | 'updated_at'>): string {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO goals (id, date, description, active)
     VALUES (?, ?, ?, ?)`
  ).run(goal.id, goal.date, goal.description, goal.active);
  return goal.id;
}

export function getFullContext(date: string): IPCDayContext {
  return {
    tasks: getTodayTasks(date),
    sessions: getTodaySessions(date),
    goals: getActiveGoals(date),
    totalMinutes: getTotalMinutesToday(date),
  };
}

export function getWeeklySessions(endDate?: string): IPCSession[] {
  const db = getDatabase();
  const end = endDate || todayIso();
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];

  return db
    .prepare(
      `SELECT * FROM sessions
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC, created_at DESC`
    )
    .all(start, end) as IPCSession[];
}

export function getWeeklyStatsByDate(endDate?: string): Array<{ date: string; total_minutes: number; session_count: number }> {
  const db = getDatabase();
  const end = endDate || todayIso();
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];

  return db
    .prepare(
      `SELECT date, SUM(duration_minutes) as total_minutes, COUNT(*) as session_count
       FROM sessions
       WHERE date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date DESC`
    )
    .all(start, end) as Array<{ date: string; total_minutes: number; session_count: number }>;
}

export function getWeeklySubjectBreakdown(endDate?: string): Array<{ subject: string; sessions: number; total_minutes: number }> {
  const db = getDatabase();
  const end = endDate || todayIso();
  const startDateObj = new Date(end);
  startDateObj.setDate(startDateObj.getDate() - 7);
  const start = startDateObj.toISOString().split('T')[0];

  return db
    .prepare(
      `SELECT COALESCE(notes, 'Untagged') as subject,
              COUNT(*) as sessions,
              SUM(duration_minutes) as total_minutes
       FROM sessions
       WHERE date >= ? AND date <= ?
       GROUP BY subject
       ORDER BY total_minutes DESC`
    )
    .all(start, end) as Array<{ subject: string; sessions: number; total_minutes: number }>;
}

export function getActivePlanMetadata(): IPCPlanMetadata | null {
  const db = getDatabase();
  return (
    (db
      .prepare('SELECT * FROM plan_metadata WHERE is_active = 1 ORDER BY imported_at DESC LIMIT 1')
      .get() as IPCPlanMetadata | undefined) || null
  );
}

export function getPlanAnalysis(planId?: string): IPCPlanAnalysis | null {
  const db = getDatabase();
  const resolvedPlanId = planId || getActivePlanMetadata()?.plan_id;
  if (!resolvedPlanId) return null;
  return (
    (db
      .prepare('SELECT * FROM plan_analysis WHERE plan_id = ? ORDER BY analyzed_at DESC LIMIT 1')
      .get(resolvedPlanId) as IPCPlanAnalysis | undefined) || null
  );
}

export function getPlanMilestones(planId?: string): IPCPlanMilestone[] {
  const db = getDatabase();
  const resolvedPlanId = planId || getActivePlanMetadata()?.plan_id;
  if (!resolvedPlanId) return [];
  return db
    .prepare('SELECT * FROM plan_milestones WHERE plan_id = ? ORDER BY week_number ASC')
    .all(resolvedPlanId) as IPCPlanMilestone[];
}

export function getPlanTasksByWeek(weekNumber: number, planId?: string): IPCPlanTask[] {
  const db = getDatabase();
  const resolvedPlanId = planId || getActivePlanMetadata()?.plan_id;
  if (!resolvedPlanId) return [];

  return db
    .prepare(
      `SELECT pt.*
       FROM plan_tasks pt
       JOIN plan_phases pp ON pp.phase_id = pt.phase_id
       WHERE pp.plan_id = ? AND pt.week_number = ?
       ORDER BY pt.subject ASC`
    )
    .all(resolvedPlanId, weekNumber) as IPCPlanTask[];
}

export function getUserState(): IPCUserState | null {
  const db = getDatabase();
  return (
    (db
      .prepare('SELECT * FROM user_state WHERE state_id = ?')
      .get('singleton') as IPCUserState | undefined) || null
  );
}

export function updateUserState(partial: Partial<Omit<IPCUserState, 'state_id' | 'created_at'>>): void {
  const db = getDatabase();

  const fields = Object.entries(partial).filter(([, value]) => value !== undefined);
  if (fields.length === 0) return;

  const setClause = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);

  db.prepare(
    `UPDATE user_state
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE state_id = 'singleton'`
  ).run(...values);
}

export function savePlanImport(bundle: PlanImportBundle): PlanImportResult {
  const db = getDatabase();
  const planId = bundle.metadata.plan_id || createId('plan');
  const currentWeek = bundle.initialWeek || 1;
  const currentPhase = bundle.initialPhase || 1;

  const transaction = db.transaction(() => {
    db.prepare('UPDATE plan_metadata SET is_active = 0 WHERE is_active = 1').run();

    db.prepare(
      `INSERT INTO plan_metadata (
        plan_id, title, description, start_date, end_date, duration_days,
        total_hours_estimated, weekly_hours_avg, file_path, file_content,
        analyzed_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`
    ).run(
      planId,
      bundle.metadata.title,
      bundle.metadata.description || null,
      bundle.metadata.start_date,
      bundle.metadata.end_date,
      bundle.metadata.duration_days,
      bundle.metadata.total_hours_estimated,
      bundle.metadata.weekly_hours_avg,
      bundle.metadata.file_path || null,
      bundle.metadata.file_content || null
    );

    const phaseIdByNumber = new Map<number, string>();
    for (const phase of bundle.phases) {
      const phaseId = phase.phase_id || createId(`phase_${phase.phase_number}`);
      phaseIdByNumber.set(phase.phase_number, phaseId);

      db.prepare(
        `INSERT INTO plan_phases (
          phase_id, plan_id, phase_number, name, description, week_start,
          week_end, total_hours_allocated, focus_areas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        phaseId,
        planId,
        phase.phase_number,
        phase.name,
        phase.description || null,
        phase.week_start,
        phase.week_end,
        phase.total_hours_allocated,
        phase.focus_areas || null
      );
    }

    for (const task of bundle.tasks) {
      const taskId = task.task_id || createId(`ptask_w${task.week_number}`);
      const phaseId = phaseIdByNumber.get(task.phase_number);
      if (!phaseId) continue;

      db.prepare(
        `INSERT INTO plan_tasks (
          task_id, phase_id, week_number, date_start, date_end, subject,
          task_type, hours_allocated, description, deliverables, checkpoint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        taskId,
        phaseId,
        task.week_number,
        task.date_start,
        task.date_end,
        task.subject,
        task.task_type,
        task.hours_allocated,
        task.description || null,
        task.deliverables || null,
        task.checkpoint || null
      );
    }

    for (const milestone of bundle.milestones) {
      db.prepare(
        `INSERT INTO plan_milestones (
          milestone_id, plan_id, week_number, description, success_criteria
        ) VALUES (?, ?, ?, ?, ?)`
      ).run(
        milestone.milestone_id || createId(`mile_w${milestone.week_number}`),
        planId,
        milestone.week_number,
        milestone.description,
        milestone.success_criteria || null
      );
    }

    db.prepare(
      `INSERT INTO plan_analysis (
        analysis_id, plan_id, total_hours, weekly_average,
        subject_breakdown, risks, suggestions, difficulty_level, feasibility_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      createId('analysis'),
      planId,
      bundle.analysis.total_hours,
      bundle.analysis.weekly_average,
      JSON.stringify(bundle.analysis.subject_breakdown),
      JSON.stringify(bundle.analysis.risks),
      JSON.stringify(bundle.analysis.suggestions),
      bundle.analysis.difficulty_level || null,
      bundle.analysis.feasibility_score ?? null
    );

    db.prepare(
      `UPDATE user_state
       SET current_plan_id = ?,
           current_week = ?,
           current_phase = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE state_id = 'singleton'`
    ).run(planId, currentWeek, currentPhase);

    db.prepare(`DELETE FROM tasks WHERE id LIKE 'plan_%'`).run();

    const currentWeekTasks = bundle.tasks.filter((task) => task.week_number === currentWeek);
    currentWeekTasks.forEach((task, idx) => {
      const taskDate = task.date_start || todayIso();
      db.prepare(
        `INSERT INTO tasks (id, date, name, start_time, end_time, status)
         VALUES (?, ?, ?, NULL, NULL, 'pending')`
      ).run(
        `plan_${planId}_${idx + 1}`,
        taskDate,
        toTaskDisplayName(task.subject, task.description || task.task_type)
      );
    });
  });

  transaction();

  return {
    planId,
    importedPhases: bundle.phases.length,
    importedTasks: bundle.tasks.length,
    importedMilestones: bundle.milestones.length,
  };
}

export function calculateAndUpsertWeeklyProgress(planId?: string, weekNumber?: number): IPCWeeklyProgress | null {
  const db = getDatabase();
  const activePlan = planId ? null : getActivePlanMetadata();
  const resolvedPlanId = planId || activePlan?.plan_id;
  const state = getUserState();
  const resolvedWeek = weekNumber || state?.current_week || 1;

  if (!resolvedPlanId) return null;

  const weeklyTasks = getPlanTasksByWeek(resolvedWeek, resolvedPlanId);
  if (weeklyTasks.length === 0) return null;

  const weekStart = weeklyTasks.map((task) => task.date_start).sort()[0];
  const weekEnd = weeklyTasks.map((task) => task.date_end).sort().slice(-1)[0];

  const targetHours = round2(
    weeklyTasks.reduce((sum, task) => sum + Number(task.hours_allocated || 0), 0)
  );

  const sessionsResult = db
    .prepare(
      `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM sessions
       WHERE date >= ? AND date <= ?`
    )
    .get(weekStart, weekEnd) as { total_minutes: number };

  const hoursCompleted = round2((sessionsResult.total_minutes || 0) / 60);
  const completionPercentage = targetHours > 0 ? round2((hoursCompleted / targetHours) * 100) : 0;

  const subjectRows = db
    .prepare(
      `SELECT COALESCE(notes, 'Untagged') as subject, SUM(duration_minutes) as total_minutes
       FROM sessions
       WHERE date >= ? AND date <= ?
       GROUP BY subject`
    )
    .all(weekStart, weekEnd) as Array<{ subject: string; total_minutes: number }>;

  const subjectActual: Record<string, number> = {};
  subjectRows.forEach((row) => {
    subjectActual[row.subject] = round2(row.total_minutes / 60);
  });

  const subjectPlan: Record<string, number> = {};
  weeklyTasks.forEach((task) => {
    subjectPlan[task.subject] = round2((subjectPlan[task.subject] || 0) + Number(task.hours_allocated || 0));
  });

  const variance: Record<string, number> = {};
  Object.keys(subjectPlan).forEach((subject) => {
    variance[subject] = round2((subjectActual[subject] || 0) - subjectPlan[subject]);
  });

  const progressId = `${resolvedPlanId}_week_${resolvedWeek}`;
  db.prepare(
    `INSERT OR REPLACE INTO weekly_progress (
      progress_id, plan_id, week_number, week_start_date, week_end_date,
      hours_completed, hours_target, completion_percentage, on_track,
      subjects_json, variance_json, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(
    progressId,
    resolvedPlanId,
    resolvedWeek,
    weekStart,
    weekEnd,
    hoursCompleted,
    targetHours,
    completionPercentage,
    completionPercentage >= 100 ? 1 : 0,
    JSON.stringify(subjectActual),
    JSON.stringify(variance)
  );

  const totalAcrossAllDays = db
    .prepare('SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes FROM sessions')
    .get() as { total_minutes: number };

  updateUserState({
    total_hours_studied: round2((totalAcrossAllDays.total_minutes || 0) / 60),
    last_study_date: totalAcrossAllDays.total_minutes > 0 ? todayIso() : state?.last_study_date || null,
  });

  return (
    (db
      .prepare('SELECT * FROM weekly_progress WHERE progress_id = ?')
      .get(progressId) as IPCWeeklyProgress | undefined) || null
  );
}

export function getWeeklyProgress(planId?: string, weekNumber?: number): IPCWeeklyProgress | null {
  const db = getDatabase();
  const resolvedPlanId = planId || getActivePlanMetadata()?.plan_id;
  const resolvedWeek = weekNumber || getUserState()?.current_week || 1;
  if (!resolvedPlanId) return null;

  const existing = db
    .prepare('SELECT * FROM weekly_progress WHERE plan_id = ? AND week_number = ? ORDER BY calculated_at DESC LIMIT 1')
    .get(resolvedPlanId, resolvedWeek) as IPCWeeklyProgress | undefined;

  return existing || calculateAndUpsertWeeklyProgress(resolvedPlanId, resolvedWeek);
}

export function getCurrentWeekTasks(): IPCPlanTask[] {
  const state = getUserState();
  const week = state?.current_week || 1;
  return getPlanTasksByWeek(week);
}

export function getNextPendingTask(date: string, currentTime?: string): IPCTask | null {
  const db = getDatabase();
  const now = currentTime || new Date().toTimeString().slice(0, 5);

  const tasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE date = ? AND status = 'pending'
       ORDER BY start_time ASC`
    )
    .all(date) as IPCTask[];

  if (tasks.length === 0) return null;

  const upcoming = tasks.find((task) => task.start_time && task.start_time >= now);
  return upcoming || tasks[0];
}

export function getTaskByName(date: string, namePattern: string): IPCTask | null {
  const db = getDatabase();
  return (
    (db
      .prepare(
        `SELECT * FROM tasks
         WHERE date = ? AND LOWER(name) LIKE LOWER(?)
         LIMIT 1`
      )
      .get(date, `%${namePattern}%`) as IPCTask | undefined) || null
  );
}

export function getUpcomingTasks(date: string, currentTime?: string): IPCTask[] {
  const db = getDatabase();
  const now = currentTime || new Date().toTimeString().slice(0, 5);

  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE date = ?
         AND status = 'pending'
         AND (start_time IS NULL OR start_time >= ?)
       ORDER BY start_time ASC`
    )
    .all(date, now) as IPCTask[];
}

export function getTasksByStatusFiltered(
  date: string,
  status: 'pending' | 'in_progress' | 'done',
  includeNoTime = true
): IPCTask[] {
  const db = getDatabase();
  const query = includeNoTime
    ? 'SELECT * FROM tasks WHERE date = ? AND status = ? ORDER BY start_time ASC'
    : 'SELECT * FROM tasks WHERE date = ? AND status = ? AND start_time IS NOT NULL ORDER BY start_time ASC';

  return db.prepare(query).all(date, status) as IPCTask[];
}

export function estimateWeekDateRange(weekNumber: number): { start: string; end: string } {
  const activePlan = getActivePlanMetadata();
  const planStart = activePlan?.start_date || todayIso();
  return getWeekDateRangeFromStart(planStart, weekNumber);
}

