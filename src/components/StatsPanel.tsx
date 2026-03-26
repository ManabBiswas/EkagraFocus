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
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800 p-3 rounded border border-blue-700">
          <p className="text-xs text-blue-400 font-medium uppercase">Weekly H</p>
          <p className="text-2xl font-bold text-blue-300">
            {totalWeeklyHours.toFixed(1)}h
          </p>
        </div>

        <div className="bg-slate-800 p-3 rounded border border-green-700">
          <p className="text-xs text-green-400 font-medium uppercase">Goals</p>
          <p className="text-2xl font-bold text-green-300">
            {goalsMetCount}/7
          </p>
        </div>

        <div className="bg-slate-800 p-3 rounded border border-purple-700">
          <p className="text-xs text-purple-400 font-medium uppercase">Streak</p>
          <p className="text-2xl font-bold text-purple-300">
            {currentStreak}
          </p>
        </div>

        <div className="bg-slate-800 p-3 rounded border border-cyan-700">
          <p className="text-xs text-cyan-400 font-medium uppercase">Total</p>
          <p className="text-2xl font-bold text-cyan-300">
            {userState?.totalHoursStudied.toFixed(0)}h
          </p>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="metal-surface rounded border p-3 border-slate-700">
        <h3 className="font-semibold text-sm accent-steel mb-3 uppercase">Weekly</h3>

        {weeklyStats.length === 0 ? (
          <p className="text-xs text-slate-500">No data</p>
        ) : (
          <div className="space-y-2">
            {weeklyStats.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-400 w-12">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="flex-1 bg-slate-800 rounded h-6 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full flex items-center justify-center text-xs font-bold text-slate-900 ${
                      day.goalMet ? 'bg-green-600' : 'bg-orange-600'
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
      <div className="metal-surface rounded border p-3 border-slate-700">
        <h3 className="font-semibold text-sm accent-steel mb-3 uppercase">Subjects</h3>

        {subjectBreakdown.length === 0 ? (
          <p className="text-xs text-slate-500">No subjects</p>
        ) : (
          <div className="space-y-2">
            {subjectBreakdown.map((subject) => (
              <div key={subject.subject}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-slate-300">
                    {subject.subject}
                  </p>
                  <p className="text-xs text-slate-400">
                    {subject.hours.toFixed(1)}h ({subject.sessions})
                  </p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-cyan-600"
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
        <div className="bg-red-900 border border-red-700 rounded p-3">
          <p className="text-xs font-semibold text-red-200 mb-1">
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
