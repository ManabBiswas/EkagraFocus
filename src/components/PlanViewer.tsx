import React from 'react';
import { useStore } from '../store/useStore';
import type { SchedulePlan } from '../types';

export function PlanViewer() {
  const { schedulePlan, setSchedulePlan, addNotification } = useStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleImportPlan = async () => {
    if (!window.electronAPI) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Electron API not available',
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.importPlanFile();

      if (result) {
        const plan: SchedulePlan = {
          fileName: result.fileName,
          filePath: result.filePath,
          content: result.content,
          importedAt: new Date().toISOString(),
        };

        setSchedulePlan(plan);
        addNotification({
          id: `notif-${Date.now()}`,
          type: 'success',
          title: 'Plan imported',
          message: `Successfully imported "${result.fileName}"`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error importing plan:', error);
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Import failed',
        message: 'Failed to import plan file',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
      {schedulePlan ? (
        <>
          {/* Plan loaded view */}
          <section className="panel-shell p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <p className="section-label text-emerald-400">Schedule</p>
                <h2 className="mt-3 text-lg font-bold text-white truncate">
                  {schedulePlan.fileName}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Imported {new Date(schedulePlan.importedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSchedulePlan(null)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-red-400/40 hover:bg-red-400/10"
              >
                Clear
              </button>
            </div>

            {/* Markdown content display */}
            <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-100">
                {schedulePlan.content.split('\n').map((line, idx) => {
                  // Basic markdown rendering
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="mb-3 text-lg font-bold text-cyan-100">
                        {line.substring(2)}
                      </h1>
                    );
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="mb-2 text-base font-semibold text-cyan-200">
                        {line.substring(3)}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="mb-2 text-sm font-semibold text-slate-300">
                        {line.substring(4)}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <div key={idx} className="mb-1 ml-4 flex gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{line.substring(2)}</span>
                      </div>
                    );
                  }
                  if (line.trim() === '') {
                    return <div key={idx} className="mb-2" />;
                  }
                  return (
                    <p key={idx} className="mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* No plan loaded view */}
          <section className="panel-shell p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <p className="section-label text-slate-400">Schedule Plan</p>
                <h2 className="mt-3 text-2xl font-bold text-white">No plan loaded</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-300">
                  Import a markdown file to view your schedule and planning details.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleImportPlan}
                disabled={isLoading}
                className={`w-full rounded-lg border transition-all px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] ${
                  isLoading
                    ? 'border-slate-400/20 bg-slate-400/5 text-slate-400 cursor-not-allowed'
                    : 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-400/15'
                }`}
              >
                {isLoading ? 'Importing...' : '+ Import Plan'}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tips</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="text-emerald-400">→</span>
                  <span>Import any .md file to view it here</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">→</span>
                  <span>Supports standard Markdown formatting</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">→</span>
                  <span>Perfect for study plans and schedules</span>
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
