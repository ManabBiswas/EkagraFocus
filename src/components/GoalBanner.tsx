import React from 'react';
import { useStore } from '../store/useStore';

export function GoalBanner() {
  const { dailyStatus } = useStore();

  if (!dailyStatus) return null;

  const progressPercent = Math.min(
    (dailyStatus.hoursCompleted / dailyStatus.totalGoal) * 100,
    100
  );

  return (
    <div className="panel-shell p-4">
      <div className="mb-3 border-b border-white/20 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="section-label text-cyan-300">Today&apos;s goal</h3>
            <p className="mt-2 text-sm text-slate-300">{dailyStatus.date}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">
              {dailyStatus.hoursCompleted.toFixed(1)}h / {dailyStatus.totalGoal}h
            </p>
            <p className={`text-sm font-semibold ${dailyStatus.goalMet ? 'text-emerald-300' : 'text-amber-300'}`}>
              {dailyStatus.goalMet ? 'COMPLETE' : 'IN PROGRESS'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/20 bg-slate-900">
          <div
            className={`h-full transition-all duration-300 shadow-[0_0_8px] ${
              dailyStatus.goalMet ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-cyan-400 shadow-cyan-400/50'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Goal Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-white/15 bg-black/35 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-300 font-semibold">Base</p>
          <p className="mt-1 font-bold text-white">{dailyStatus.baseGoal}h</p>
        </div>
        {dailyStatus.debtAssigned > 0 && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/15 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200 font-semibold">Debt</p>
            <p className="mt-1 font-bold text-amber-100">+{dailyStatus.debtAssigned}h</p>
          </div>
        )}
        {dailyStatus.penaltyAssigned > 0 && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/15 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-200 font-semibold">Penalty</p>
            <p className="mt-1 font-bold text-red-100">+{dailyStatus.penaltyAssigned}h</p>
          </div>
        )}
      </div>

      {/* Penalty Warning */}
      {dailyStatus.penaltyModeActive && (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-400/15 p-3 text-sm">
          <p className="font-semibold text-red-200">
            Penalty mode active - 7 day duration
          </p>
        </div>
      )}
    </div>
  );
}
