import React from 'react';
import { useStore } from '../store/useStore';

export function GoalBanner() {
  const { dailyStatus } = useStore();

  if (!dailyStatus) return null;

  const progressPercent = Math.min(
    (dailyStatus.hoursCompleted / dailyStatus.totalGoal) * 100,
    100
  );

  const remaining = Math.max(dailyStatus.totalGoal - dailyStatus.hoursCompleted, 0);
  const goalStatus = dailyStatus.goalMet ? 'Goal Met! 🎉' : `${remaining.toFixed(1)}h remaining`;

  return (
    <div className="panel-shell p-4">
      <div className="mb-3 border-b border-white/10 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="section-label">Today&apos;s goal</h3>
            <p className="mt-2 text-sm text-slate-400">{dailyStatus.date}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-cyan-300">
              {dailyStatus.hoursCompleted.toFixed(1)}h / {dailyStatus.totalGoal}h
            </p>
            <p className={`text-sm font-medium ${dailyStatus.goalMet ? 'text-emerald-300' : 'text-amber-300'}`}>
              {dailyStatus.goalMet ? 'COMPLETE' : 'IN PROGRESS'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-slate-950/70">
          <div
            className={`h-full transition-all duration-300 ${
              dailyStatus.goalMet ? 'bg-emerald-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Goal Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Base</p>
          <p className="mt-1 font-semibold text-slate-100">{dailyStatus.baseGoal}h</p>
        </div>
        {dailyStatus.debtAssigned > 0 && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200">Debt</p>
            <p className="mt-1 font-semibold text-amber-100">+{dailyStatus.debtAssigned}h</p>
          </div>
        )}
        {dailyStatus.penaltyAssigned > 0 && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-200">Penalty</p>
            <p className="mt-1 font-semibold text-red-100">+{dailyStatus.penaltyAssigned}h</p>
          </div>
        )}
      </div>

      {/* Penalty Warning */}
      {dailyStatus.penaltyModeActive && (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm">
          <p className="font-medium text-red-100">
            Penalty mode active - 7 day duration
          </p>
        </div>
      )}
    </div>
  );
}
