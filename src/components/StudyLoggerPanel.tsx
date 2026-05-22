import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

// Hours threshold above which we warn before logging
const HOURS_WARN_THRESHOLD = 2.0;
const HOURS_CRIT_THRESHOLD = 4.0;

// How many total hours today triggers an additional daily-load warning
const DAILY_WARN_THRESHOLD = 6.0;
const DAILY_CRIT_THRESHOLD = 8.0;

export function StudyLoggerPanel() {
  const {
    todaySessions,
    burnoutLiveRisk,
    fetchBurnoutLiveRisk,
  } = useStore();

  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  // Inline warning shown above the submit button before the user logs
  const [preLogWarning, setPreLogWarning] = useState<{
    severity: 'warning' | 'critical';
    message: string;
  } | null>(null);

  // Fetch live risk on mount and whenever today's sessions change
  useEffect(() => {
    fetchBurnoutLiveRisk();
  }, [fetchBurnoutLiveRisk, todaySessions.length]);

  // Recompute pre-log warning whenever hours input or daily total changes
  useEffect(() => {
    const enteredHours = parseFloat(hours);
    if (!hours || isNaN(enteredHours) || enteredHours <= 0) {
      setPreLogWarning(null);
      return;
    }

    const totalHoursToday = todaySessions.reduce((sum, s) => sum + s.durationHours, 0);
    const projectedTotal = totalHoursToday + enteredHours;

    // Session-length check
    if (enteredHours >= HOURS_CRIT_THRESHOLD) {
      setPreLogWarning({
        severity: 'critical',
        message: `${enteredHours}h is an unusually long single session. Consider splitting it into shorter focused blocks.`,
      });
      return;
    }
    if (enteredHours >= HOURS_WARN_THRESHOLD) {
      setPreLogWarning({
        severity: 'warning',
        message: `${enteredHours}h is a long session. Make sure you took breaks during this time.`,
      });
      return;
    }

    // Daily total check
    if (projectedTotal >= DAILY_CRIT_THRESHOLD) {
      setPreLogWarning({
        severity: 'critical',
        message: `This will bring today's total to ${projectedTotal.toFixed(1)}h. Sustained study beyond 8 h/day impairs retention.`,
      });
      return;
    }
    if (projectedTotal >= DAILY_WARN_THRESHOLD) {
      setPreLogWarning({
        severity: 'warning',
        message: `This will bring today's total to ${projectedTotal.toFixed(1)}h — approaching the recommended 6 h/day ceiling.`,
      });
      return;
    }

    setPreLogWarning(null);
  }, [hours, todaySessions]);

  const handleLogSession = useCallback(async () => {
    if (!subject.trim() || !hours || parseFloat(hours) <= 0) {
      alert('Please fill in subject and hours');
      return;
    }

    try {
      const minutes = Math.round(parseFloat(hours) * 60);

      const result = await window.api.task.logSession(
        null,
        minutes,
        `${subject}${notes ? ` - ${notes}` : ''}`,
      );

      // Refresh live risk now that a new session was logged
      await fetchBurnoutLiveRisk();

      const linkedMessage =
        result.linkedNotesCount > 0
          ? `\nAuto-linked notes: ${result.linkedNotesCount}`
          : '';

      alert(`✓ Logged ${hours} hours of ${subject}${linkedMessage}`);

      // Reset form
      setSubject('');
      setHours('');
      setNotes('');
      setPreLogWarning(null);
    } catch (error) {
      console.error('[StudyLoggerPanel] Error:', error);
      alert('Error logging session. Check console.');
    }
  }, [subject, hours, notes, fetchBurnoutLiveRisk]);

  const totalHours = todaySessions.reduce((sum, s) => sum + s.durationHours, 0);

  // Show live risk warning from the store (today's cumulative hours check)
  const showLiveRisk = burnoutLiveRisk?.isAtRisk && burnoutLiveRisk.message;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto bg-transparent p-4">

      {/* ── Form Section ─────────────────────────────────────────────────── */}
      <div className="panel-shell p-4">
        <h3 className="section-label text-cyan-300 mb-3">Log session</h3>

        {/* Live risk banner — shown when today's hours are already high */}
        {showLiveRisk && (
          <div
            className={`mb-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
              burnoutLiveRisk!.severity === 'critical'
                ? 'border-red-400/40 bg-red-500/10 text-red-300'
                : 'border-orange-400/35 bg-orange-500/10 text-orange-300'
            }`}
          >
            {burnoutLiveRisk!.severity === 'critical' ? '⛔' : '⚠️'} {burnoutLiveRisk!.message}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="metal-input w-full rounded-2xl px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Hours"
            step={0.25}
            min={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="metal-input w-full rounded-2xl px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="metal-input w-full resize-none rounded-2xl px-3 py-2 text-sm"
            rows={2}
          />

          {/* Pre-log warning — shown when entered hours look high */}
          {preLogWarning && (
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                preLogWarning.severity === 'critical'
                  ? 'border-red-400/40 bg-red-500/10 text-red-300'
                  : 'border-orange-400/35 bg-orange-500/10 text-orange-300'
              }`}
            >
              {preLogWarning.severity === 'critical' ? '⛔' : '⚠️'} {preLogWarning.message}
            </div>
          )}

          <button
            onClick={handleLogSession}
            disabled={!subject || hours === ''}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            LOG SESSION
          </button>
        </div>
      </div>

      {/* ── Sessions List ─────────────────────────────────────────────────── */}
      <div className="panel-shell flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between border-b border-white/20 pb-3">
          <h3 className="section-label text-cyan-300">Sessions</h3>
          <p className="text-sm font-semibold text-cyan-300">TOTAL: {totalHours.toFixed(2)}h</p>
        </div>

        {todaySessions.length === 0 ? (
          <p className="py-4 text-center text-slate-400">No sessions logged</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-white/15 bg-black/35 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{session.subject}</p>
                    <p className="text-slate-300">{session.durationHours}h</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {session.notes && (
                  <p className="mt-1 italic text-slate-400">{session.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
