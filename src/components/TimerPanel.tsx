import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const timerPresets = [25, 45, 60, 90];
const defaultSubject = 'Focus Session';

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

  const handleStartStop = () => {
    if (timerRunning) {
      stopTimer();
    } else {
      const subject = sessionSubject.trim() || defaultSubject;
      setSessionSubject(subject);
      setTimerSubject(subject);
      startTimer(subject, selectedDuration);
    }
  };

  const handleReset = () => {
    resetTimer();
  };

  const handleSaveSession = async () => {
    if (timerSeconds === 0) return;
    
    try {
      const minutes = Math.round((timerSeconds / 60) * 4) / 4; // Round to nearest 15 mins
      const subject = currentSessionSubject || sessionSubject.trim() || defaultSubject;
      
      // Call backend to save session ONLY - let db-state-changed event refresh UI
      const result = await window.api.task.logSession(
        null,
        minutes,
        `${subject} (${timerSeconds}s)`
      );
      
      resetTimer();
      setSessionSubject('');
      setSelectedDuration(25);
      // Toast notification would go here if available
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
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          {activeDuration} min preset
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
          className={`${
            timerRunning
              ? 'btn-danger'
              : 'btn-success'
          } transition-all duration-300`}
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
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
