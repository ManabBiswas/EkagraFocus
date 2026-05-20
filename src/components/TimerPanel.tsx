import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function TimerPanel() {
  const {
    timerRunning,
    timerSeconds,
    currentSessionSubject,
    setTimerSubject,
    startTimer,
    stopTimer,
    resetTimer,
  } = useStore();

  const [sessionSubject, setSessionSubject] = useState(currentSessionSubject);
  const [burnoutWarnings, setBurnoutWarnings] = useState<Array<{ type: string; severity: string; message: string }>>([]);

  useEffect(() => {
    window.Electron.ipcRenderer.invoke('db:getBurnoutReport')
      .then((res: any) => {
        if (res?.success && res.data?.warnings?.length > 0) {
          setBurnoutWarnings(res.data.warnings.filter((w: any) => w.severity === 'warning'));
        }
      })
      .catch(() => {});
  }, []);

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

  const handleSaveSession = async () => {
    if (timerSeconds === 0) return;
    
    try {
      const minutes = Math.round((timerSeconds / 60) * 4) / 4;
      
      const result = await window.api.task.logSession(
        null,
        minutes,
        `${currentSessionSubject} (${timerSeconds}s)`
      );
      
      resetTimer();
      setSessionSubject('');

      if (result.linkedNotesCount > 0) {
        console.log(
          `✓ Saved ${minutes} minutes of ${currentSessionSubject}. Auto-linked notes: ${result.linkedNotesCount}`
        );
      } else {
        console.log(`✓ Saved ${minutes} minutes of ${currentSessionSubject}`);
      }
    } catch (error) {
      console.error('[TimerPanel] Error saving session:', error);
    }
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

      {/* Burnout Warnings */}
      {burnoutWarnings.length > 0 && (
        <div className="flex flex-col gap-1 w-full max-w-md">
          {burnoutWarnings.map((w, i) => (
            <div key={i} className="rounded-xl bg-orange-500/10 border border-orange-500/30 px-4 py-2 text-xs text-orange-300 text-left">
              ⚠️ {w.message}
            </div>
          ))}
        </div>
      )}

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
          className={`${
            timerRunning
              ? 'btn-danger'
              : 'btn-success'
          } transition-all duration-300`}
        >
          {timerRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetTimer}
          className="btn-secondary"
        >
          RESET
        </button>
        <button
          onClick={handleSaveSession}
          disabled={timerSeconds === 0 || !currentSessionSubject}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}