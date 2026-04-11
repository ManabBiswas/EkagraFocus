import React from 'react';
import { useStore } from '../store/useStore';

/**
 * PlanViewer Component
 * 
 * Simplified to show imported study plans.
 * Schedule analysis is now handled by the AI agent in the chat (Local Ollama).
 * 
 * NO MORE GEMINI API - Everything uses local Ollama now!
 */
export function PlanViewer() {
  const {
    schedulePlan,
    setSchedulePlan,
    addNotification,
  } = useStore();

  const importPlan = async () => {
    if (!window.api?.file) {
      console.error('[PlanViewer] API not available');
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'File import API not available',
        duration: 5000,
      });
      return;
    }

    try {
      console.log('[PlanViewer] Starting file import...');
      const result: { success?: boolean; error?: string; data?: { fileName: string; filePath: string; content: string } } = 
        await window.api.file.importPlanFile();

      if (result?.success && result?.data) {
        const { fileName, filePath, content } = result.data;
        console.log(`[PlanViewer] File imported:${fileName}`);
        
        setSchedulePlan({
          fileName,
          filePath,
          content,
          importedAt: new Date().toISOString(),
        });

        addNotification({
          id: `notif-${Date.now()}`,
          type: 'success',
          title: 'Plan Imported!',
          message: `Successfully imported "${fileName}". Ask me about it in the chat!`,
          duration: 5000,
        });
      } else {
        throw new Error(result?.error || 'Failed to import plan');
      }
    } catch (error) {
      console.error('[PlanViewer] Error importing plan:', error);
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Could not import file',
        duration: 5000,
      });
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
                <p className="section-label text-emerald-400">Study Plan</p>
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

            {/* Local AI Analysis Info */}
            <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                ✨ AI Analysis Ready
              </p>
              <p className="mt-2 text-sm text-cyan-100">
                Your schedule is loaded! Ask the AI agent in the chat:
              </p>
              <ul className="mt-3 space-y-1 text-xs text-cyan-100">
                <li>💬 "What's my schedule?"</li>
                <li>💬 "What should I study next?"</li>
                <li>💬 "Analyze this plan"</li>
                <li>💬 "How many hours total?"</li>
              </ul>
            </div>

            {/* Plan Content Preview */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="section-label text-slate-400">Plan Content</p>
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
                <pre className="whitespace-pre-wrap break-word text-xs text-slate-300 font-mono">
                  {schedulePlan.content.substring(0, 1000)}
                  {schedulePlan.content.length > 1000 && '\n... (truncated)'}
                </pre>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* No plan view */}
          <section className="panel-shell p-5">
            <div className="flex flex-col gap-4 text-center">
              <p className="section-label text-slate-400">Study Plan</p>
              <h3 className="text-sm font-semibold text-slate-100">
                No Plan Imported Yet
              </h3>
              <p className="text-xs text-slate-400">
                Import your study schedule to get AI-powered analysis
              </p>
              
              <button
                onClick={importPlan}
                className="mt-4 rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/15"
              >
                📥 Import Schedule
              </button>

              {/* Supported formats */}
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Markdown Formats Supported
                </p>
                <ul className="mt-3 space-y-2 font-mono text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <code className="text-cyan-300">- 2h Mathematics</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <code className="text-cyan-300">Math: 2 hours</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <code className="text-cyan-300">## Day 1</code>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Features */}
          <section className="panel-shell p-5">
            <p className="section-label text-slate-400">Local AI Features</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong>Ollama + TinyLLaMA</strong> - No API keys needed</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong>Fast</strong> - 3-7 seconds per response</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong>Private</strong> - All processing local</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong>Free</strong> - No subscriptions or costs</span>
              </div>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
