import React from 'react';
import { useStore } from '../store/useStore';

export function PlanAnalysisView() {
  const { planSummary, planInsight } = useStore();

  if (!planSummary || !planInsight) {
    return (
      <section className="panel-shell p-4">
        <h3 className="section-label text-cyan-300">Plan Analysis</h3>
        <p className="mt-2 text-sm text-slate-400">Import a plan to view AI analysis.</p>
      </section>
    );
  }

  const subjectRows = Object.entries(planInsight.subjectBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <section className="panel-shell p-4">
      <h3 className="section-label text-cyan-300">Plan Analysis</h3>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Total Hours</p>
          <p className="mt-2 text-2xl font-bold text-cyan-100">{planInsight.totalHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Weekly Avg</p>
          <p className="mt-2 text-2xl font-bold text-emerald-100">{planInsight.weeklyAverage.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Feasibility</p>
          <p className="mt-2 text-2xl font-bold text-amber-100">{planInsight.feasibilityScore}%</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/15 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Subject Breakdown</p>
          <div className="mt-3 space-y-2">
            {subjectRows.map(([subject, hours]) => {
              const pct = planInsight.totalHours > 0 ? (hours / planInsight.totalHours) * 100 : 0;
              return (
                <div key={subject}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{subject}</span>
                    <span>{hours.toFixed(1)}h ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-slate-950">
                    <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/15 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Risks</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {planInsight.risks.length === 0 ? (
              <li className="text-slate-400">No major risks detected.</li>
            ) : (
              planInsight.risks.map((risk) => (
                <li key={risk.text} className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-2">
                  {risk.text}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/15 bg-black/30 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Suggestions</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-200">
          {planInsight.suggestions.map((suggestion) => (
            <li key={suggestion} className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-2">
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
