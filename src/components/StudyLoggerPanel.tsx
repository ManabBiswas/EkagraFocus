import React, { useState } from 'react';
import { useStore } from '../store/useStore';

export function StudyLoggerPanel() {
  const { todaySessions } = useStore();

  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  const handleLogSession = async () => {
    if (!subject.trim() || !hours || parseFloat(hours) <= 0) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const minutes = Math.round(parseFloat(hours) * 60);
      
      // Call backend to save session ONLY - let db-state-changed event refresh UI
      await window.api.task.logSession(null, minutes, `${subject} - ${notes}`);
      
      alert(`✓ Logged ${hours} hours of ${subject}`);

      // Reset form
      setSubject('');
      setHours('');
      setNotes('');
    } catch (error) {
      console.error('[StudyLoggerPanel] Error:', error);
      alert('Error logging session. Check console.');
    }
  };

  const totalHours = todaySessions.reduce((sum, s) => sum + s.durationHours, 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto bg-transparent p-4">
      {/* Form Section */}
      <div className="panel-shell p-4">
        <h3 className="section-label text-cyan-300 mb-3">Log session</h3>
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
          <button
            onClick={handleLogSession}
            disabled={!subject || hours === ''}
            className="w-full rounded-2xl border border-cyan-400/35 bg-cyan-400/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            LOG SESSION
          </button>
        </div>
      </div>

      {/* Sessions List */}
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
