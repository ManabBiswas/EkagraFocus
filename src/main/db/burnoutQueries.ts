import { getDatabase } from './database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BurnoutSeverity = 'info' | 'warning' | 'critical';

export interface BurnoutWarning {
  type:
  | 'long_session'
  | 'high_daily_hours'
  | 'declining_consistency'
  | 'no_break'
  | 'overload_streak';
  severity: BurnoutSeverity;
  message: string;
  detail?: string;
}

export interface BurnoutReport {
  generatedAt: string;
  warnings: BurnoutWarning[];
  recommendations: string[];
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  stats: {
    avgDailyHoursLast7: number;
    maxSingleSessionHours: number;
    longestContinuousBlockHours: number;
    consistencyScore: number; // 0–100
    studyDaysLast7: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LONG_SESSION_WARN_HOURS = 2.0; // warn at 2 h
const LONG_SESSION_CRIT_HOURS = 2.5; // critical at 2.5 h
const HIGH_DAILY_WARN_HOURS = 6.0;
const HIGH_DAILY_CRIT_HOURS = 8.0;
const NO_BREAK_GAP_MINUTES = 10; // sessions ≤10 min apart = continuous block
const OVERLOAD_STREAK_DAYS = 4; // N consecutive high-hour days

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Raw session rows ─────────────────────────────────────────────────────────

interface RawSession {
  id: string;
  date: string;
  duration_minutes: number;
  start_time: string | null; // "HH:MM" or null
  end_time: string | null;
  notes: string | null;
}

function getSessionsLast7Days(): RawSession[] {
  const db = getDatabase();
  const start = dateNDaysAgo(7);
  const end = todayIso();
  return db
    .prepare(
      `SELECT id, date, duration_minutes, start_time, end_time, notes
       FROM sessions
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, COALESCE(start_time, '00:00') ASC`
    )
    .all(start, end) as RawSession[];
}

// Convert "HH:MM" on a given date to a JS timestamp (ms since epoch)
function toTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

/**
 * Per-session heuristics: flag any single session ≥ threshold.
 */
function detectLongSessions(sessions: RawSession[]): BurnoutWarning[] {
  const warnings: BurnoutWarning[] = [];

  for (const s of sessions) {
    const hours = s.duration_minutes / 60;
    if (hours >= LONG_SESSION_CRIT_HOURS) {
      warnings.push({
        type: 'long_session',
        severity: 'critical',
        message: `Session of ${hours.toFixed(1)}h on ${s.date} — consider taking a break every 90 min.`,
        detail: `session_id:${s.id}`,
      });
    } else if (hours >= LONG_SESSION_WARN_HOURS) {
      warnings.push({
        type: 'long_session',
        severity: 'warning',
        message: `Session of ${hours.toFixed(1)}h on ${s.date} — you've been studying for a while.`,
        detail: `session_id:${s.id}`,
      });
    }
  }

  return warnings;
}

/**
 * Per-day heuristics: flag days with ≥ HIGH_DAILY threshold.
 */
function detectHighDailyHours(
  sessions: RawSession[]
): { warnings: BurnoutWarning[]; dailyHoursMap: Map<string, number> } {
  const warnings: BurnoutWarning[] = [];
  const dailyMinutes = new Map<string, number>();

  for (const s of sessions) {
    dailyMinutes.set(s.date, (dailyMinutes.get(s.date) ?? 0) + s.duration_minutes);
  }

  const dailyHoursMap = new Map<string, number>();
  for (const [date, mins] of dailyMinutes) {
    const h = mins / 60;
    dailyHoursMap.set(date, h);
    if (h >= HIGH_DAILY_CRIT_HOURS) {
      warnings.push({
        type: 'high_daily_hours',
        severity: 'critical',
        message: `You studied ${h.toFixed(1)}h on ${date} — sustained effort beyond 8 h/day impairs retention.`,
      });
    } else if (h >= HIGH_DAILY_WARN_HOURS) {
      warnings.push({
        type: 'high_daily_hours',
        severity: 'warning',
        message: `You studied ${h.toFixed(1)}h on ${date} — approaching the recommended 6 h/day ceiling.`,
      });
    }
  }

  return { warnings, dailyHoursMap };
}

/**
 * Detect continuous study blocks formed by sessions with gaps ≤ NO_BREAK_GAP_MINUTES.
 * Only relevant when start_time / end_time are available.
 */
function detectNoBreakBlocks(sessions: RawSession[]): {
  warnings: BurnoutWarning[];
  maxBlockHours: number;
} {
  const warnings: BurnoutWarning[] = [];
  let maxBlockHours = 0;

  // Group by date, only consider sessions with timing data
  const byDate = new Map<string, RawSession[]>();
  for (const s of sessions) {
    if (!s.start_time || !s.end_time) continue;
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }

  for (const [date, daySessions] of byDate) {
    // Sort by start_time ascending
    daySessions.sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;

      return (
        toTimestamp(date, a.start_time) -
        toTimestamp(date, b.start_time)
      );
    });

    const firstSession = daySessions[0];

    if (!firstSession?.start_time || !firstSession?.end_time) {
      continue;
    }

    let blockStartMs = toTimestamp(date, firstSession.start_time);
    let blockEndMs = toTimestamp(date, firstSession.end_time);

    for (let i = 1; i < daySessions.length; i++) {
      const s = daySessions[i];
      if (!s.start_time) continue;

      const sStart = toTimestamp(date, s.start_time);
      const gapMinutes = (sStart - blockEndMs) / 60_000;

      if (gapMinutes <= NO_BREAK_GAP_MINUTES) {
        // Extend block
        if (!s.end_time) continue;

        blockEndMs = Math.max(
          blockEndMs,
          toTimestamp(date, s.end_time)
        );
      } else {
        // Evaluate completed block
        const blockHours = (blockEndMs - blockStartMs) / 3_600_000;
        maxBlockHours = Math.max(maxBlockHours, blockHours);
        if (blockHours >= LONG_SESSION_CRIT_HOURS) {
          warnings.push({
            type: 'no_break',
            severity: 'critical',
            message: `${blockHours.toFixed(1)}h continuous study block on ${date} with no meaningful break.`,
          });
        } else if (blockHours >= LONG_SESSION_WARN_HOURS) {
          warnings.push({
            type: 'no_break',
            severity: 'warning',
            message: `${blockHours.toFixed(1)}h continuous study block on ${date} — a short break would help.`,
          });
        }
        if (!s.start_time || !s.end_time) continue;

        blockStartMs = toTimestamp(date, s.start_time);
        blockEndMs = toTimestamp(date, s.end_time);
      }
    }

    // Evaluate last block
    const blockHours = (blockEndMs - blockStartMs) / 3_600_000;
    maxBlockHours = Math.max(maxBlockHours, blockHours);
    if (blockHours >= LONG_SESSION_CRIT_HOURS) {
      warnings.push({
        type: 'no_break',
        severity: 'critical',
        message: `${blockHours.toFixed(1)}h continuous study block on ${date} with no meaningful break.`,
      });
    } else if (blockHours >= LONG_SESSION_WARN_HOURS) {
      warnings.push({
        type: 'no_break',
        severity: 'warning',
        message: `${blockHours.toFixed(1)}h continuous study block on ${date} — a short break would help.`,
      });
    }
  }

  // Deduplicate: same date + same severity = keep only first per (date, type, severity)
  const seen = new Set<string>();
  const deduped: BurnoutWarning[] = [];
  for (const w of warnings) {
    const key = `${w.type}:${w.severity}:${w.message.slice(0, 40)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(w);
    }
  }

  return { warnings: deduped, maxBlockHours };
}

/**
 * Detect overload streak: N or more consecutive days with ≥ HIGH_DAILY_WARN_HOURS.
 */
function detectOverloadStreak(dailyHoursMap: Map<string, number>): BurnoutWarning[] {
  const warnings: BurnoutWarning[] = [];
  const sortedDates = Array.from(dailyHoursMap.keys()).sort();

  let streak = 0;
  let streakStart = '';

  for (const date of sortedDates) {
    const h = dailyHoursMap.get(date) ?? 0;
    if (h >= HIGH_DAILY_WARN_HOURS) {
      if (streak === 0) streakStart = date;
      streak++;
    } else {
      streak = 0;
    }
  }

  if (streak >= OVERLOAD_STREAK_DAYS) {
    warnings.push({
      type: 'overload_streak',
      severity: 'critical',
      message: `${streak} consecutive high-effort days (since ${streakStart}) — take a recovery day soon.`,
    });
  }

  return warnings;
}

/**
 * Consistency score: 0–100.
 * 100 = studied every day of the last 7.
 * Weighted by whether daily hours ≥ 1 h (minimum meaningful session).
 */
function calculateConsistencyScore(
  dailyHoursMap: Map<string, number>,
  lookbackDays = 7
): number {
  let score = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const d = dateNDaysAgo(i);
    const h = dailyHoursMap.get(d) ?? 0;
    if (h >= 1.0) score++;
  }
  return Math.round((score / lookbackDays) * 100);
}

/**
 * Detect declining consistency: compare first half of window vs second half.
 */
function detectDecliningConsistency(dailyHoursMap: Map<string, number>): BurnoutWarning[] {
  const warnings: BurnoutWarning[] = [];

  // Last 7 days split: recent 3 days vs prior 4 days
  const recentDays: number[] = [];
  const priorDays: number[] = [];

  for (let i = 0; i < 7; i++) {
    const d = dateNDaysAgo(i);
    const h = dailyHoursMap.get(d) ?? 0;
    if (i < 3) recentDays.push(h);
    else priorDays.push(h);
  }

  const recentAvg = recentDays.reduce((a, b) => a + b, 0) / recentDays.length;
  const priorAvg = priorDays.reduce((a, b) => a + b, 0) / priorDays.length;

  // Meaningful drop only if prior average was actually productive
  if (priorAvg >= 1.5 && recentAvg < priorAvg * 0.5) {
    warnings.push({
      type: 'declining_consistency',
      severity: 'warning',
      message: `Study hours have dropped by ${Math.round(100 - (recentAvg / priorAvg) * 100)}% compared to earlier this week — possible fatigue or burnout.`,
    });
  }

  return warnings;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(warnings: BurnoutWarning[]): string[] {
  const recs: string[] = [];
  const types = new Set(warnings.map((w) => w.type));
  const hasCritical = warnings.some((w) => w.severity === 'critical');

  if (types.has('long_session') || types.has('no_break')) {
    recs.push('Use the Pomodoro technique: 25–50 min focus → 5–10 min break.');
    recs.push('Stand up, stretch, or take a short walk between sessions.');
  }

  if (types.has('high_daily_hours')) {
    recs.push('Cap study at 6–8 h/day for sustainable long-term retention.');
    recs.push('Consider splitting heavy topics across multiple days instead of cramming.');
  }

  if (types.has('declining_consistency')) {
    recs.push('A lighter review day (1–2 h) can restore momentum without full rest.');
    recs.push('Check in with your sleep — fatigue is the #1 cause of declining study quality.');
  }

  if (types.has('overload_streak')) {
    recs.push('Plan a deliberate rest day or light day (≤2 h) to prevent cognitive fatigue.');
  }

  if (hasCritical) {
    recs.push('Your patterns suggest elevated burnout risk. Prioritising rest now protects your long-term plan.');
  }

  if (recs.length === 0) {
    recs.push('Your study patterns look healthy — keep up the balanced effort!');
  }

  // Deduplicate
  return Array.from(new Set(recs));
}

// ─── Risk level ───────────────────────────────────────────────────────────────

function deriveRiskLevel(warnings: BurnoutWarning[]): BurnoutReport['riskLevel'] {
  if (warnings.length === 0) return 'none';
  const hasCritical = warnings.some((w) => w.severity === 'critical');
  if (hasCritical) return warnings.length >= 2 ? 'high' : 'moderate';
  const warnCount = warnings.filter((w) => w.severity === 'warning').length;
  if (warnCount >= 3) return 'moderate';
  if (warnCount >= 1) return 'low';
  return 'none';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a complete burnout report for the last 7 days.
 * This is purely analytical — it does NOT modify streaks, goals, or penalties.
 */
export function generateBurnoutReport(): BurnoutReport {
  const sessions = getSessionsLast7Days();

  const { warnings: dailyWarnings, dailyHoursMap } = detectHighDailyHours(sessions);
  const longSessionWarnings = detectLongSessions(sessions);
  const { warnings: noBreakWarnings, maxBlockHours } = detectNoBreakBlocks(sessions);
  const overloadWarnings = detectOverloadStreak(dailyHoursMap);
  const consistencyWarnings = detectDecliningConsistency(dailyHoursMap);

  // Combine + deduplicate by (type + message prefix)
  const allRaw = [
    ...longSessionWarnings,
    ...dailyWarnings,
    ...noBreakWarnings,
    ...overloadWarnings,
    ...consistencyWarnings,
  ];

  const seen = new Set<string>();
  const allWarnings: BurnoutWarning[] = [];
  for (const w of allRaw) {
    const key = `${w.type}:${w.message.slice(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      allWarnings.push(w);
    }
  }

  // Sort: critical first, then warning, then info
  const order: Record<BurnoutSeverity, number> = { critical: 0, warning: 1, info: 2 };
  allWarnings.sort((a, b) => order[a.severity] - order[b.severity]);

  // Stats
  const allHoursValues = Array.from(dailyHoursMap.values());
  const avgDailyHoursLast7 =
    allHoursValues.length > 0
      ? allHoursValues.reduce((a, b) => a + b, 0) / 7 // divide by 7 days, not just study days
      : 0;

  const maxSingleSessionHours =
    sessions.length > 0
      ? Math.max(...sessions.map((s) => s.duration_minutes / 60))
      : 0;

  const studyDaysLast7 = dailyHoursMap.size;
  const consistencyScore = calculateConsistencyScore(dailyHoursMap);

  return {
    generatedAt: new Date().toISOString(),
    warnings: allWarnings,
    recommendations: buildRecommendations(allWarnings),
    riskLevel: deriveRiskLevel(allWarnings),
    stats: {
      avgDailyHoursLast7: Math.round(avgDailyHoursLast7 * 100) / 100,
      maxSingleSessionHours: Math.round(maxSingleSessionHours * 100) / 100,
      longestContinuousBlockHours: Math.round(maxBlockHours * 100) / 100,
      consistencyScore,
      studyDaysLast7,
    },
  };
}

/**
 * Lightweight check: is there currently an active (in-progress) long block today?
 * Used by TimerPanel to warn the user in real time.
 */
export function getTodayLiveRisk(todayMinutesStudied: number): {
  isAtRisk: boolean;
  severity: BurnoutSeverity | null;
  message: string | null;
} {
  const hours = todayMinutesStudied / 60;
  if (hours >= HIGH_DAILY_CRIT_HOURS) {
    return {
      isAtRisk: true,
      severity: 'critical',
      message: `You've studied ${hours.toFixed(1)}h today. Sustained sessions beyond 8 h impair retention — consider stopping for the day.`,
    };
  }
  if (hours >= HIGH_DAILY_WARN_HOURS) {
    return {
      isAtRisk: true,
      severity: 'warning',
      message: `You've studied ${hours.toFixed(1)}h today. You're approaching the recommended daily ceiling — take a real break.`,
    };
  }
  return { isAtRisk: false, severity: null, message: null };
}