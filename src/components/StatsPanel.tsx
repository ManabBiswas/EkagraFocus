import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { BurnoutReport } from '../store/useStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskColors: Record<BurnoutReport['riskLevel'], { border: string; bg: string; text: string; badge: string }> = {
  none: {
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-300',
    badge: 'bg-emerald-400/20 text-emerald-200',
  },
  low: {
    border: 'border-sky-400/30',
    bg: 'bg-sky-400/10',
    text: 'text-sky-300',
    badge: 'bg-sky-400/20 text-sky-200',
  },
  moderate: {
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/10',
    text: 'text-orange-300',
    badge: 'bg-orange-400/20 text-orange-200',
  },
  high: {
    border: 'border-red-400/30',
    bg: 'bg-red-400/10',
    text: 'text-red-300',
    badge: 'bg-red-400/20 text-red-200',
  },
};

const riskLabels: Record<BurnoutReport['riskLevel'], string> = {
  none: 'No risk',
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
};

const riskIcons: Record<BurnoutReport['riskLevel'], string> = {
  none: '✅',
  low: '🔵',
  moderate: '⚠️',
  high: '⛔',
};

function severityDot(severity: string): string {
  if (severity === 'critical') return 'bg-red-400';
  if (severity === 'warning') return 'bg-orange-400';
  return 'bg-sky-400';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatsPanel() {
  const {
    weeklyStats,
    subjectBreakdown,
    currentStreak,
    userState,
    planSummary,
    weeklyProgress,
    burnoutReport,
    fetchBurnoutReport,
  } = useStore();

  // Fetch burnout report when the Stats tab is opened
  useEffect(() => {
    fetchBurnoutReport();
  }, [fetchBurnoutReport]);

  const totalWeeklyHours = weeklyStats.reduce((sum, s) => sum + s.hoursStudied, 0);
  const goalsMetCount = weeklyStats.filter((s) => s.goalMet).length;
  const planProgressPct = planSummary && weeklyProgress
    ? Math.min(100, weeklyProgress.completionPercentage)
    : 0;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4 pr-3">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/35 bg-cyan-400/20 p-4">
          <p className="section-label text-cyan-300">Weekly H</p>
          <p className="mt-3 text-2xl font-bold text-cyan-200">
            {totalWeeklyHours.toFixed(1)}h
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/20 p-4">
          <p className="section-label text-emerald-300">Goals</p>
          <p className="mt-3 text-2xl font-bold text-emerald-200">
            {goalsMetCount}/7
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/35 bg-amber-400/20 p-4">
          <p className="section-label text-amber-300">Streak</p>
          <p className="mt-3 text-2xl font-bold text-amber-200">
            {currentStreak}
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-4">
          <p className="section-label text-cyan-300">Total</p>
          <p className="mt-3 text-2xl font-bold text-white">
            {userState?.totalHoursStudied.toFixed(0)}h
          </p>
        </div>
      </div>

      {/* Plan Progress */}
      {planSummary && weeklyProgress && (
        <div className="panel-shell p-4">
          <h3 className="section-label text-cyan-300 mb-3">Plan Progress</h3>
          <p className="text-sm text-slate-200">
            Week {weeklyProgress.weekNumber}: {weeklyProgress.hoursCompleted.toFixed(1)}h / {weeklyProgress.hoursTarget.toFixed(1)}h
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950">
            <div
              className={`h-full ${weeklyProgress.onTrack ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${planProgressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {weeklyProgress.onTrack ? 'On track' : 'Behind schedule'} • {planProgressPct.toFixed(1)}% complete
          </p>
        </div>
      )}

      {/* Weekly Breakdown */}
      <div className="panel-shell p-4">
        <h3 className="section-label text-cyan-300 mb-3">Weekly</h3>

        {weeklyStats.length === 0 ? (
          <p className="text-sm text-slate-400">No data</p>
        ) : (
          <div className="space-y-2">
            {weeklyStats.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <p className="w-12 text-xs font-semibold text-slate-300">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="flex h-6 flex-1 overflow-hidden rounded-full border border-white/20 bg-slate-950">
                  <div
                    className={`flex h-full items-center justify-center text-xs font-bold text-slate-950 ${
                      day.goalMet ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    }`}
                    style={{ width: `${Math.min((day.hoursStudied / 3) * 100, 100)}%` }}
                  >
                    {day.hoursStudied.toFixed(1)}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject Breakdown */}
      <div className="panel-shell p-4">
        <h3 className="section-label text-cyan-300 mb-3">Subjects</h3>

        {subjectBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400">No subjects</p>
        ) : (
          <div className="space-y-2">
            {subjectBreakdown.map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-200">
                    {subject.subject}
                  </p>
                  <p className="text-xs text-slate-400">
                    {subject.hours.toFixed(1)}h ({subject.sessions})
                  </p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/20 bg-slate-950">
                  <div
                    className="h-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                    style={{ width: `${subject.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Burnout Risk Section ─────────────────────────────────────────────── */}
      {burnoutReport && (
        <div className={`rounded-2xl border p-4 ${riskColors[burnoutReport.riskLevel].border} ${riskColors[burnoutReport.riskLevel].bg}`}>
          {/* Header row */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-label text-slate-300">Burnout Check</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${riskColors[burnoutReport.riskLevel].badge}`}>
              {riskIcons[burnoutReport.riskLevel]} {riskLabels[burnoutReport.riskLevel]}
            </span>
          </div>

          {/* Stats row */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-2 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg / day</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {burnoutReport.stats.avgDailyHoursLast7.toFixed(1)}h
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Max block</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {burnoutReport.stats.longestContinuousBlockHours.toFixed(1)}h
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Consistency</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {burnoutReport.stats.consistencyScore}%
              </p>
            </div>
          </div>

          {/* Warnings list */}
          {burnoutReport.warnings.length > 0 ? (
            <div className="mb-3 space-y-1.5">
              {burnoutReport.warnings.slice(0, 4).map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(w.severity)}`}
                  />
                  <span>{w.message}</span>
                </div>
              ))}
              {burnoutReport.warnings.length > 4 && (
                <p className="text-[10px] text-slate-500 pl-3.5">
                  +{burnoutReport.warnings.length - 4} more signals
                </p>
              )}
            </div>
          ) : (
            <p className="mb-3 text-xs text-slate-400">
              No burnout signals detected in the past 7 days.
            </p>
          )}

          {/* Recommendations */}
          {burnoutReport.recommendations.length > 0 && burnoutReport.riskLevel !== 'none' && (
            <div className="space-y-1.5 border-t border-white/10 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                Recommendations
              </p>
              {burnoutReport.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="mt-0.5 shrink-0 text-sky-400">→</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Penalty Status */}
      {userState?.penaltyModeActive && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/15 p-3">
          <p className="mb-1 text-xs font-bold text-red-200">
            PENALTY MODE ACTIVE
          </p>
          <p className="text-xs text-red-300">
            Expires: {new Date(userState.penaltyExpirationDate || '').toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
 );
}
