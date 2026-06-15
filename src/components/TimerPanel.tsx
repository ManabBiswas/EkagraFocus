import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const timerPresets = [25, 45, 60, 90];
const defaultSubject = 'Focus Session';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

// How often to poll live risk while timer is running (ms)
const LIVE_RISK_POLL_INTERVAL_MS = 60 * 1000; // every 1 minute

// Warn the user in-session if they've been running the current timer this long
const IN_SESSION_WARN_MINUTES = 90;
const IN_SESSION_CRIT_MINUTES = 150;

function formatHHMM(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

export function TimerPanel() {
  const {
    timerRunning,
    timerSeconds,
    timerDurationMinutes,
    currentSessionSubject,
    setTimerSubject,
    startTimer,
    stopTimer,
    resetTimer,
    burnoutReport,
    burnoutLiveRisk,
    fetchBurnoutReport,
    fetchBurnoutLiveRisk,
  } = useStore();

  const [sessionSubject, setSessionSubject] = useState(currentSessionSubject);
  const [selectedDuration, setSelectedDuration] = useState(timerDurationMinutes || 25);

  const activeDuration = timerDurationMinutes || selectedDuration;
  const durationSeconds = activeDuration * 60;
  const displaySeconds = timerRunning || timerSeconds > 0
    ? Math.max(durationSeconds - timerSeconds, 0)
    : durationSeconds;
  const hours = Math.floor(displaySeconds / 3600);
  const minutes = Math.floor((displaySeconds % 3600) / 60);
  const seconds = displaySeconds % 60;

  useEffect(() => {
    if (!timerRunning && timerDurationMinutes > 0) {
      setSelectedDuration(timerDurationMinutes);
    }
  }, [timerDurationMinutes, timerRunning]);
  // Track wall-clock start/end times for accurate burnout analysis
  const sessionStartTimeRef = useRef<string | null>(null);

  // ── Fetch burnout data on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetchBurnoutReport();
    fetchBurnoutLiveRisk();
  }, [fetchBurnoutReport, fetchBurnoutLiveRisk]);

  // ── Poll live risk every minute while timer is running ──────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      fetchBurnoutLiveRisk();
    }, LIVE_RISK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [timerRunning, fetchBurnoutLiveRisk]);

  // ── Record wall-clock start time when timer begins ──────────────────────────
  useEffect(() => {
    if (timerRunning && sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = formatHHMM(new Date());
    }
    if (!timerRunning && timerSeconds === 0) {
      // Timer was reset — clear start time
      sessionStartTimeRef.current = null;
    }
  }, [timerRunning, timerSeconds]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const currentSessionMinutes = timerSeconds / 60;
  const inSessionWarnActive =
    timerRunning && currentSessionMinutes >= IN_SESSION_WARN_MINUTES;
  const inSessionCritActive =
    timerRunning && currentSessionMinutes >= IN_SESSION_CRIT_MINUTES;

  // ── Burnout warning display logic ───────────────────────────────────────────
  // Priority: in-session timer warnings > live risk > historical report warnings
  const timerWarnings: Array<{ severity: 'warning' | 'critical'; message: string }> = [];

  if (inSessionCritActive) {
    timerWarnings.push({
      severity: 'critical',
      message: `You've been studying for ${Math.floor(currentSessionMinutes / 60)}h ${Math.floor(currentSessionMinutes % 60)}m without saving — consider taking a break.`,
    });
  } else if (inSessionWarnActive) {
    timerWarnings.push({
      severity: 'warning',
      message: `${Math.floor(currentSessionMinutes)}m into this session — a short break improves retention.`,
    });
  }

  if (burnoutLiveRisk?.isAtRisk && burnoutLiveRisk.message) {
    timerWarnings.push({
      severity: burnoutLiveRisk.severity === 'critical' ? 'critical' : 'warning',
      message: burnoutLiveRisk.message,
    });
  }

  // Show up to 2 historical warnings only when not already showing timer/live warnings
  const historicalWarnings =
    timerWarnings.length === 0 && burnoutReport
      ? burnoutReport.warnings
          .filter((w) => w.severity !== 'info')
          .slice(0, 2)
      : [];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStartStop = useCallback(() => {
    if (timerRunning) {
      stopTimer();
    } else {
      const subject = sessionSubject.trim() || defaultSubject;
      setSessionSubject(subject);
      setTimerSubject(subject);
      startTimer(subject, selectedDuration);
      if (!sessionSubject.trim()) return;
      sessionStartTimeRef.current = formatHHMM(new Date());
      startTimer(sessionSubject);
    }
  }, [timerRunning, sessionSubject, startTimer, stopTimer]);

  const handleReset = () => {
    resetTimer();
  };

  const handleSaveSession = async () => {
  const handleSaveSession = useCallback(async () => {
    if (timerSeconds === 0) return;

    try {
      const minutes = Math.round((timerSeconds / 60) * 4) / 4; // Round to nearest 15 mins
      const subject = currentSessionSubject || sessionSubject.trim() || defaultSubject;
      
      // Call backend to save session ONLY - let db-state-changed event refresh UI
      const result = await window.api.task.logSession(
        null,
        minutes,
        `${subject} (${timerSeconds}s)`
      const durationMinutes = Math.round((timerSeconds / 60) * 4) / 4;

      const result = await window.api.task.logSession(
        null,
        durationMinutes,
        `${currentSessionSubject} (${timerSeconds}s)`,
      );

      // Refresh live risk now that a new session has been logged
      await fetchBurnoutLiveRisk();

      sessionStartTimeRef.current = null;
      resetTimer();
      setSessionSubject('');
      setSelectedDuration(25);
      // Toast notification would go here if available


      if (result.linkedNotesCount > 0) {
        console.log(
          `✓ Saved ${durationMinutes}m of ${currentSessionSubject}. Auto-linked notes: ${result.linkedNotesCount}`
        );
      } else {
        console.log(`✓ Saved ${durationMinutes}m of ${currentSessionSubject}`);
      }
    } catch (error) {
      console.error('[TimerPanel] Error saving session:', error);
    }
  }, [timerSeconds, currentSessionSubject, resetTimer, fetchBurnoutLiveRisk]);

  const handleReset = useCallback(() => {
    sessionStartTimeRef.current = null;
    resetTimer();
  }, [resetTimer]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-6 bg-transparent p-6 text-center">

      {/* Timer Display */}
      <div className={`panel-shell rounded-4xl px-10 py-12 transition-all duration-500 ${
        inSessionCritActive
          ? 'border-red-400/50 shadow-[0_0_24px_rgba(248,113,113,0.18)]'
          : inSessionWarnActive
          ? 'border-orange-400/40 shadow-[0_0_16px_rgba(251,146,60,0.14)]'
          : ''
      }`}>
        <p className="section-label text-cyan-300 mb-3">Study timer</p>
        <p className={`font-mono text-6xl font-black tracking-[0.08em] md:text-7xl transition-colors duration-300 ${
          inSessionCritActive
            ? 'text-red-300'
            : inSessionWarnActive
            ? 'text-orange-300'
            : 'text-cyan-300'
        }`}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          {activeDuration} min preset
        </p>

        {/* In-session duration nudge shown inside the clock panel */}
        {inSessionWarnActive && (
          <p className={`mt-3 text-xs font-semibold tracking-wide ${
            inSessionCritActive ? 'text-red-400' : 'text-orange-400'
          }`}>
            {inSessionCritActive ? '⛔ Long session — save & rest' : '⏸ Consider a short break'}
          </p>
        )}
      </div>

      {/* Burnout Warnings */}
      {(timerWarnings.length > 0 || historicalWarnings.length > 0) && (
        <div className="flex w-full max-w-md flex-col gap-2">
          {timerWarnings.map((w, i) => (
            <div
              key={`timer-${i}`}
              className={`rounded-xl border px-4 py-2.5 text-xs text-left leading-relaxed ${
                w.severity === 'critical'
                  ? 'border-red-400/40 bg-red-500/10 text-red-300'
                  : 'border-orange-400/35 bg-orange-500/10 text-orange-300'
              }`}
            >
              {w.severity === 'critical' ? '⛔' : '⚠️'} {w.message}
            </div>
          ))}

          {historicalWarnings.map((w, i) => (
            <div
              key={`hist-${i}`}
              className={`rounded-xl border px-4 py-2.5 text-xs text-left leading-relaxed ${
                w.severity === 'critical'
                  ? 'border-red-400/40 bg-red-500/10 text-red-300'
                  : 'border-orange-400/35 bg-orange-500/10 text-orange-300'
              }`}
            >
              {w.severity === 'critical' ? '⛔' : '⚠️'} {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Recommendation strip — only show top recommendation when at risk */}
      {burnoutReport &&
        burnoutReport.riskLevel !== 'none' &&
        burnoutReport.recommendations.length > 0 && (
          <div className="w-full max-w-md rounded-xl border border-sky-400/25 bg-sky-500/8 px-4 py-2.5 text-xs text-sky-300 text-left">
            💡 {burnoutReport.recommendations[0]}
          </div>
        )}

      {/* Subject Input */}
      <div className="flex w-full max-w-md gap-2">
        <input
          type="text"
          value={sessionSubject}
          onChange={(e) => {
            setSessionSubject(e.target.value);
            setTimerSubject(e.target.value);
          }}
          placeholder="Subject"
          className="metal-input flex-1 rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      {/* Time Presets */}
      <div className="flex flex-wrap justify-center gap-2">
        {timerPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setSelectedDuration(preset);
              if (timerSeconds > 0) {
                resetTimer();
              }
            }}
            disabled={timerRunning}
            className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
              selectedDuration === preset
                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-lg'
                : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-100'
            }`}
          >
            {preset} min
          </button>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleStartStop}
          disabled={!timerRunning && !sessionSubject.trim()}
          className={`${
            timerRunning ? 'btn-danger' : 'btn-success'
          } transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {timerRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={handleReset}
          className="btn-secondary"
        >
          RESET
        </button>
        <button
          onClick={handleSaveSession}
          disabled={timerSeconds === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={timerSeconds === 0 || !currentSessionSubject}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}