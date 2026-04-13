import React from 'react';
import { useStore } from '../store/useStore';

const statusStyles: Record<string, string> = {
  pending: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  in_progress: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  skipped: 'border-red-400/30 bg-red-400/10 text-red-200',
};

export function MilestoneTracker() {
  const { milestones } = useStore();

  return (
    <section className="panel-shell p-4">
      <h3 className="section-label text-cyan-300">Milestone Tracker</h3>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-2">
        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400">No milestones available yet.</p>
        ) : (
          milestones.map((milestone) => (
            <div
              key={milestone.milestoneId}
              className="rounded-lg border border-white/10 bg-black/30 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-200">Week {milestone.weekNumber}: {milestone.description}</p>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    statusStyles[milestone.completionStatus] || statusStyles.pending
                  }`}
                >
                  {milestone.completionStatus.replace('_', ' ')}
                </span>
              </div>
              {milestone.completedAt && (
                <p className="mt-1 text-xs text-slate-400">Completed on {new Date(milestone.completedAt).toLocaleDateString()}</p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
