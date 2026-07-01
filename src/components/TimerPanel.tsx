import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

// How often to poll live risk while timer is running (ms)
const LIVE_RISK_POLL_INTERVAL_MS = 60 * 1000; // every 1 minute
const IN_SESSION_WARN_MINUTES = 90;
const IN_SESSION_CRIT_MINUTES = 150;

function formatHHMM(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// ── Theme Definitions ────────────────────────────────────────────────────────
const THEMES = {
  default: {
    swatch: 'bg-cyan-500',
    container: 'bg-transparent',
    text: 'text-cyan-300',
    label: 'text-cyan-300',
  },
  deepFocus: {
    swatch: 'bg-slate-800',
    container: 'bg-slate-900 rounded-3xl shadow-inner border border-slate-800',
    text: 'text-indigo-400',
    label: 'text-indigo-500',
  },
  midnightPurple: {
    swatch: 'bg-purple-500',
    container: 'bg-[#0a0514] rounded-3xl border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]',
    text: 'text-purple-300',
    label: 'text-purple-400/70',
  },
  cyberNeon: {
    swatch: 'bg-pink-500',
    container: 'bg-slate-950 rounded-3xl border border-cyan-500/30',
    text: 'text-pink-400',
    label: 'text-cyan-400',
  },
  forestHacker: {
    swatch: 'bg-green-500',
    container: 'bg-black rounded-3xl border border-green-500/20',
    text: 'text-green-400',
    label: 'text-green-600',
  },
};

type ThemeKey = keyof typeof THEMES;

export function TimerPanel() {
  const {
    timerRunning,
    timerSeconds,
    currentSessionSubject,
    setTimerSubject,
    startTimer,
    stopTimer,
    resetTimer,
    burnoutReport,
    burnoutLiveRisk,
    fetchBurnoutReport,
    fetchBurnoutLiveRisk,
    activeTheme = 'default',
    setTheme,
  } = useStore();

  const [sessionSubject, setSessionSubject] = useState(currentSessionSubject);
  const sessionStartTimeRef = useRef<string | null>(null);

  // ── Existing Effects & Logic ────────────────────────────────────────────────
  useEffect(() => {
    fetchBurnoutReport();
    fetchBurnoutLiveRisk();
  }, [fetchBurnoutReport, fetchBurnoutLiveRisk]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      fetchBurnoutLiveRisk();
    }, LIVE_RISK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [timerRunning, fetchBurnoutLiveRisk]);

  useEffect(() => {
    if (timerRunning && sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = formatHHMM(new Date());
    }
    if (!timerRunning && timerSeconds === 0) {
      sessionStartTimeRef.current = null;
    }
  }, [timerRunning, timerSeconds]);

  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;
  const currentSessionMinutes = timerSeconds / 60;
  
  const inSessionWarnActive = timerRunning && currentSessionMinutes >= IN_SESSION_WARN_MINUTES;
  const inSessionCritActive = timerRunning && currentSessionMinutes >= IN_SESSION_CRIT_MINUTES;

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

  const historicalWarnings = timerWarnings.length === 0 && burnoutReport
    ? burnoutReport.warnings.filter((w) => w.severity !== 'info').slice(0, 2)
    : [];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStartStop = useCallback(() => {
    if (timerRunning) {
      stopTimer();
    } else {
      if (!sessionSubject.trim()) return;
      sessionStartTimeRef.current = formatHHMM(new Date());
      startTimer(sessionSubject);
    }
  }, [timerRunning, sessionSubject, startTimer, stopTimer]);

  const handleSaveSession = useCallback(async () => {
    if (timerSeconds === 0) return;
    try {
      const durationMinutes = Math.round((timerSeconds / 60) * 4) / 4;
      const result = await window.api.task.logSession(
        null,
        durationMinutes,
        `${currentSessionSubject} (${timerSeconds}s)`,
      );
      await fetchBurnoutLiveRisk();
      sessionStartTimeRef.current = null;
      resetTimer();
      setSessionSubject('');
    } catch (error) {
      console.error('[TimerPanel] Error saving session:', error);
    }
  }, [timerSeconds, currentSessionSubject, resetTimer, fetchBurnoutLiveRisk]);

  const handleReset = useCallback(() => {
    sessionStartTimeRef.current = null;
    resetTimer();
  }, [resetTimer]);

  // Apply current theme safely
  const currentTheme = THEMES[activeTheme as ThemeKey] || THEMES.default;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-full min-h-0 flex-col items-center justify-center gap-6 p-6 text-center transition-colors duration-500 ${currentTheme.container}`}>
      
      {/* Theme Switcher UI (Color Swatches) */}
      <div className="flex gap-3 self-end mb-[-0.5rem] mr-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            title={t.replace(/([A-Z])/g, ' $1').trim()}
            className={`h-5 w-5 rounded-full transition-all duration-300 ${THEMES[t].swatch} ${
              activeTheme === t 
                ? 'ring-2 ring-offset-2 ring-offset-[#0d1321] ring-white scale-110' 
                : 'opacity-50 hover:opacity-100 hover:scale-110'
            }`}
          />
        ))}
      </div>

      {/* Timer Display */}
      <div className={`panel-shell rounded-4xl px-10 py-12 transition-all duration-500 ${
        inSessionCritActive
          ? 'border-red-400/50 shadow-[0_0_24px_rgba(248,113,113,0.18)] bg-red-900/10'
          : inSessionWarnActive
          ? 'border-orange-400/40 shadow-[0_0_16px_rgba(251,146,60,0.14)] bg-orange-900/10'
          : ''
      }`}>
        <p className={`section-label mb-3 transition-colors duration-300 ${currentTheme.label}`}>
          Study timer
        </p>
        <p className={`font-mono text-6xl font-black tracking-[0.08em] md:text-7xl transition-colors duration-300 ${
          inSessionCritActive
            ? 'text-red-400'
            : inSessionWarnActive
            ? 'text-orange-400'
            : currentTheme.text
        }`}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>

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

      {/* Recommendation strip */}
      {burnoutReport && burnoutReport.riskLevel !== 'none' && burnoutReport.recommendations.length > 0 && (
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
          className="metal-input flex-1 rounded-2xl px-4 py-3 text-sm transition-colors duration-300"
        />
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
        <button onClick={handleReset} className="btn-secondary">
          RESET
        </button>
        <button
          onClick={handleSaveSession}
          disabled={timerSeconds === 0 || !currentSessionSubject}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}