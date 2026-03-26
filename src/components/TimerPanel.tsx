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
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-900 space-y-6">
      {/* Timer Display */}
      <div className="metal-surface rounded-3xl p-12 shadow-lg border border-slate-700">
        <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider">STUDY TIMER</p>
        <p className="text-7xl font-black text-cyan-400 font-mono">
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
          className="flex-1 px-4 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleStartStop}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors border ${
            timerRunning
              ? 'bg-red-900 text-red-200 hover:bg-red-800 border-red-700'
              : 'bg-green-900 text-green-200 hover:bg-green-800 border-green-700'
          }`}
        >
          {timerRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-3 bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-colors border border-slate-600"
        >
          RESET
        </button>
        <button
          onClick={handleSaveSession}
          disabled={timerSeconds === 0 || !currentSessionSubject}
          className="px-6 py-3 bg-cyan-700 text-cyan-100 rounded-lg font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-600"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
