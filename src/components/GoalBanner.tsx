import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface RedistributionSummary {
  targetDate: string;
  totalRedistributedHours: number;
  entries: Array<{
    id: string;
    source_date: string;
    target_date: string;
    hours_assigned: number;
    subject: string | null;
    reason: string;
    applied: number;
    created_at: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipc = async (channel: string, ...args: unknown[]): Promise<{success: boolean; data?: unknown; error?: string}> => {
  const [namespace, method] = channel.split(':');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).api?.[namespace];
  if (api && typeof api[method] === 'function') {
    return await api[method](...args);
  }
  return { success: false, error: `No handler for ${channel}` };
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

interface RedistributionPanelProps {
  summaries: RedistributionSummary[];
  todayExtra: number;
  onTrigger: () => void;
  onDismiss: (sourceDate: string) => void;
  isTriggering: boolean;
}

function RedistributionPanel({ summaries, todayExtra, onTrigger, onDismiss, isTriggering }: RedistributionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasPending = summaries.length > 0;

  return (
    <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-400/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-violet-300 text-base">⟳</span>
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-violet-300">
            Workload Redistribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPending && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/35 transition-colors"
            >
              {expanded ? 'Hide' : `View ${summaries.length}`}
            </button>
          )}
          <button
            onClick={onTrigger}
            disabled={isTriggering}
            className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTriggering ? '...' : 'Redistribute Now'}
          </button>
        </div>
      </div>

      {todayExtra > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-900/30 px-3 py-2">
          <span className="text-violet-300 text-sm">+</span>
          <p className="text-sm text-violet-100">
            <span className="font-bold">{todayExtra}h</span> redistributed to today from past incomplete goals
          </p>
        </div>
      )}

      {!hasPending && (
        <p className="mt-2 text-[11px] text-slate-400">
          No pending redistributions. All goals are on track.
        </p>
      )}

      {hasPending && expanded && (
        <div className="mt-3 space-y-2">
          {summaries.map((s) => (
            <div key={s.targetDate} className="rounded-lg border border-violet-400/20 bg-black/20 p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-violet-200">{formatDate(s.targetDate)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    +{s.totalRedistributedHours}h extra • {s.entries.length} source{s.entries.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(s.entries[0].source_date)}
                  className="text-[10px] text-slate-500 hover:text-red-300 transition-colors ml-2"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1.5 space-y-1">
                {s.entries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-violet-400">↳</span>
                    <span>{e.hours_assigned}h from {formatDate(e.source_date)}{e.subject ? ` · ${e.subject}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalBanner() {
  const { dailyStatus, updateDailyStatus } = useStore();
  const [redistributionSummaries, setRedistributionSummaries] = useState<RedistributionSummary[]>([]);
  const [todayExtraHours, setTodayExtraHours] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [burnoutWarnings, setBurnoutWarnings] = useState<Array<{ type: string; severity: string; message: string }>>([]);
  const today = getTodayIso();

  const loadRedistributionData = useCallback(async () => {
    try {
      const [summaryRes, todayRes, burnoutRes] = await Promise.all([
        ipc('redistribution:getSummary'),
        ipc('redistribution:getHoursForDate', today),
        ipc('db:getBurnoutReport'),
      ]);
      if (summaryRes?.success && Array.isArray(summaryRes.data)) {
        setRedistributionSummaries(summaryRes.data as RedistributionSummary[]);
      }
      if (todayRes?.success && todayRes.data) {
        const extra = (todayRes.data as { hours: number }).hours ?? 0;
        setTodayExtraHours(extra);
        if (extra > 0 && dailyStatus) {
          const newTotal = dailyStatus.baseGoal + dailyStatus.debtAssigned + dailyStatus.penaltyAssigned + extra;
          if (newTotal !== dailyStatus.totalGoal) {
            updateDailyStatus({
              totalGoal: newTotal,
              remaining: Math.max(newTotal - dailyStatus.hoursCompleted, 0),
              progressPercent: Math.min((dailyStatus.hoursCompleted / newTotal) * 100, 100),
            });
          }
        }
      }
      if (burnoutRes?.success && Array.isArray((burnoutRes.data as any)?.warnings)) {
        setBurnoutWarnings((burnoutRes.data as any).warnings);
      }
    } catch (err) {
      console.warn('[GoalBanner] Failed to load redistribution data:', err);
    }
  }, [today, dailyStatus, updateDailyStatus]);

  useEffect(() => {
    loadRedistributionData();
  }, [loadRedistributionData]);

  useEffect(() => {
    const checkAuto = async () => {
      if (!dailyStatus) return;
      const hour = new Date().getHours();
      const key = `auto_redist_${today}`;
      if (hour < 23 || localStorage.getItem(key) || dailyStatus.goalMet) return;
      localStorage.setItem(key, '1');
      await triggerRedistribution();
    };
    checkAuto();
    const interval = setInterval(checkAuto, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dailyStatus, today]);

  const triggerRedistribution = useCallback(async () => {
    if (!dailyStatus || isTriggering) return;
    setIsTriggering(true);
    try {
      const res = await ipc('redistribution:trigger', {
        date: today,
        totalGoalHours: dailyStatus.totalGoal,
        hoursCompleted: dailyStatus.hoursCompleted,
        subject: null,
        spreadDays: 5,
        maxExtraHoursPerDay: 2,
      });
      if (res?.success) await loadRedistributionData();
    } catch (err) {
      console.error('[GoalBanner] Error:', err);
    } finally {
      setIsTriggering(false);
    }
  }, [dailyStatus, isTriggering, today, loadRedistributionData]);

  const handleDismiss = useCallback(async (sourceDate: string) => {
    try {
      await ipc('redistribution:clear', sourceDate);
      await loadRedistributionData();
    } catch (err) {
      console.error('[GoalBanner] Dismiss error:', err);
    }
  }, [loadRedistributionData]);

  if (!dailyStatus) return null;

  const progressPercent = Math.min((dailyStatus.hoursCompleted / dailyStatus.totalGoal) * 100, 100);

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
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/20 bg-slate-900">
          <div
            className={`h-full transition-all duration-300 shadow-[0_0_8px] ${
              dailyStatus.goalMet ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-cyan-400 shadow-cyan-400/50'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

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
        {todayExtraHours > 0 && (
          <div className="rounded-xl border border-violet-400/30 bg-violet-400/15 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-violet-200 font-semibold">Redistributed</p>
            <p className="mt-1 font-bold text-violet-100">+{todayExtraHours}h</p>
          </div>
        )}
      </div>

      {dailyStatus.penaltyModeActive && (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-400/15 p-3 text-sm">
          <p className="font-semibold text-red-200">Penalty mode active — 7 day duration</p>
        </div>
      )}

      {burnoutWarnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {burnoutWarnings.map((w, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-xs text-left ${
                w.severity === 'warning'
                  ? 'border border-orange-500/30 bg-orange-500/10 text-orange-300'
                  : 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
              }`}
            >
              {w.severity === 'warning' ? '⚠️' : 'ℹ️'} {w.message}
            </div>
          ))}
        </div>
      )}

      <RedistributionPanel
        summaries={redistributionSummaries}
        todayExtra={todayExtraHours}
        onTrigger={triggerRedistribution}
        onDismiss={handleDismiss}
        isTriggering={isTriggering}
      />
    </div>
  );
}