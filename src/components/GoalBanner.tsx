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
    <div className="metal-surface border-b p-4">
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-semibold accent-steel">TODAY'S GOAL</h3>
            <p className="text-sm text-slate-400">{dailyStatus.date}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-cyan-400">
              {dailyStatus.hoursCompleted.toFixed(1)}h / {dailyStatus.totalGoal}h
            </p>
            <p className={`text-sm font-medium ${dailyStatus.goalMet ? 'text-green-400' : 'text-amber-400'}`}>
              {dailyStatus.goalMet ? 'COMPLETE' : 'IN PROGRESS'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-300 ${
              dailyStatus.goalMet ? 'bg-green-600' : 'bg-cyan-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Goal Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-blue-50 p-2 rounded">
          <p className="text-gray-600">Base</p>
          <p className="font-semibold text-blue-600">{dailyStatus.baseGoal}h</p>
        </div>
        {dailyStatus.debtAssigned > 0 && (
          <div className="bg-amber-50 p-2 rounded">
            <p className="text-gray-600">Debt</p>
            <p className="font-semibold text-amber-600">+{dailyStatus.debtAssigned}h</p>
          </div>
        )}
        {dailyStatus.penaltyAssigned > 0 && (
          <div className="bg-red-50 p-2 rounded">
            <p className="text-gray-600">Penalty</p>
            <p className="font-semibold text-red-600">+{dailyStatus.penaltyAssigned}h</p>
          </div>
        )}
      </div>

      {/* Penalty Warning */}
      {dailyStatus.penaltyModeActive && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-sm">
          <p className="text-red-800 font-medium">
            ⚠️ Penalty Mode Active - 7 day duration
          </p>
        </div>
      )}
    </div>
  );
}
