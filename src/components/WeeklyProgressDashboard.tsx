import React from 'react';
import { useStore } from '../store/useStore';

export function WeeklyProgressDashboard() {
  const { weeklyProgress, weekTasks } = useStore();

  if (!weeklyProgress) {
    return (
      <section className="panel-shell p-4">
        <h3 className="section-label text-cyan-300">Weekly Progress</h3>
        <p className="mt-2 text-sm text-slate-400">No active weekly progress yet.</p>
      </section>
    );
  }

  const progressPct = Math.min(100, weeklyProgress.completionPercentage);

  return (
    <section className="panel-shell p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="section-label text-cyan-300">Weekly Progress</h3>
        <span className="text-xs text-slate-400">Week {weeklyProgress.weekNumber}</span>
      </div>

      <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-3">
        <p className="text-sm text-slate-200">
          {weeklyProgress.hoursCompleted.toFixed(1)}h / {weeklyProgress.hoursTarget.toFixed(1)}h
        </p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950">
          <div
            className={`h-full ${weeklyProgress.onTrack ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {weeklyProgress.onTrack ? 'On track' : 'Behind target'} • {weeklyProgress.completionPercentage.toFixed(1)}%
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-white/15 bg-black/30 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Current Week Tasks</p>
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-2">
          {weekTasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks parsed for the current week.</p>
          ) : (
            weekTasks.map((task) => (
              <div key={task.taskId} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <div>
                  <p className="text-sm text-slate-200">{task.subject}</p>
                  <p className="text-xs text-slate-400">{task.type}</p>
                </div>
                <span className="text-xs text-cyan-300">{task.hoursAllocated.toFixed(1)}h</span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Week window: {weeklyProgress.weekStartDate} to {weeklyProgress.weekEndDate}
      </p>
    </section>
  );
}
