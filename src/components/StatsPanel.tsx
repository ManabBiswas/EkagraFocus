import React from 'react';
import { useStore } from '../store/useStore';

export function StatsPanel() {
  const {
    weeklyStats,
    subjectBreakdown,
    currentStreak,
    userState,
    planSummary,
    weeklyProgress,
  } = useStore();

  const totalWeeklyHours = weeklyStats.reduce((sum, s) => sum + s.hoursStudied, 0);
  const goalsMetCount = weeklyStats.filter((s) => s.goalMet).length;
  const planProgressPct = planSummary && weeklyProgress
    ? Math.min(100, weeklyProgress.completionPercentage)
    : 0;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
