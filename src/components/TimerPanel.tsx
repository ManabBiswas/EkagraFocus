import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function TimerPanel() {
  const {
    timerRunning,
    timerSeconds,
    currentSessionSubject,
    setTimerSubject,
    startTimer,
    stopTimer,
    tickTimer,
    resetTimer,
    addSession,
  } = useStore();

  const [sessionSubject, setSessionSubject] = React.useState(currentSessionSubject);

  // Tick timer every second
  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, tickTimer]);

  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const handleStartStop = () => {
    if (timerRunning) {
      stopTimer();
    } else {
      if (!sessionSubject.trim()) return;
      startTimer(sessionSubject);
    }
  };

  const handleSaveSession = () => {
    if (timerSeconds === 0) return;
    const durationHours = timerSeconds / 3600;
    addSession({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      subject: currentSessionSubject || 'Unknown',
      durationHours,
      notes: '',
      loggedVia: 'timer',
      timestamp: new Date().toISOString(),
    });
    resetTimer();
    setSessionSubject('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-6 bg-transparent p-6 text-center">
      {/* Timer Display */}
      <div className="panel-shell rounded-4xl px-10 py-12">
        <p className="section-label text-cyan-300 mb-3">Study timer</p>
        <p className="font-mono text-6xl font-black tracking-[0.08em] text-cyan-300 md:text-7xl">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>
      </div>

      {/* Subject Input */}
      <div className="flex gap-2 w-full max-w-md">
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

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleStartStop}
          className={`rounded-2xl border px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
            timerRunning
              ? 'border-red-400/35 bg-red-400/20 text-red-200 hover:bg-red-400/30'
              : 'border-emerald-400/35 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30'
          }`}
        >
          {timerRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetTimer}
          className="rounded-2xl border border-white/20 bg-black/35 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-black/50"
        >
          RESET
        </button>
        <button
          onClick={handleSaveSession}
          disabled={timerSeconds === 0 || !currentSessionSubject}
          className="rounded-2xl border border-cyan-400/35 bg-cyan-400/20 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
