import React from 'react';
import { useStore } from '../store/useStore';

export function StatsPanel() {
  const {
    weeklyStats,
    subjectBreakdown,
    currentStreak,
    userState,
  } = useStore();

  const totalWeeklyHours = weeklyStats.reduce((sum, s) => sum + s.hoursStudied, 0);
  const goalsMetCount = weeklyStats.filter((s) => s.goalMet).length;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
          <p className="section-label">Weekly H</p>
          <p className="mt-3 text-2xl font-semibold text-cyan-100">
            {totalWeeklyHours.toFixed(1)}h
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
          <p className="section-label">Goals</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-100">
            {goalsMetCount}/7
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
          <p className="section-label">Streak</p>
          <p className="mt-3 text-2xl font-semibold text-amber-100">
            {currentStreak}
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="section-label">Total</p>
          <p className="mt-3 text-2xl font-semibold text-slate-50">
            {userState?.totalHoursStudied.toFixed(0)}h
          </p>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="panel-shell p-4">
        <h3 className="section-label mb-3">Weekly</h3>

        {weeklyStats.length === 0 ? (
          <p className="text-sm text-slate-500">No data</p>
        ) : (
          <div className="space-y-2">
            {weeklyStats.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <p className="w-12 text-xs font-medium text-slate-400">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="flex h-6 flex-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/70">
                  <div
                    className={`flex h-full items-center justify-center text-xs font-bold text-slate-950 ${
                      day.goalMet ? 'bg-emerald-400' : 'bg-amber-400'
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
        <h3 className="section-label mb-3">Subjects</h3>

        {subjectBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects</p>
        ) : (
          <div className="space-y-2">
            {subjectBreakdown.map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-300">
                    {subject.subject}
                  </p>
                  <p className="text-xs text-slate-400">
                    {subject.hours.toFixed(1)}h ({subject.sessions})
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-slate-950/70">
                  <div
                    className="h-full bg-cyan-500"
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
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
          <p className="mb-1 text-xs font-semibold text-red-100">
            PENALTY MODE ACTIVE
          </p>
          <p className="text-xs text-red-200">
            Expires: {new Date(userState.penaltyExpirationDate || '').toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
