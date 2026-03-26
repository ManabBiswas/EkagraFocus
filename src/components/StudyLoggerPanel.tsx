import React, { useState } from 'react';
import { useStore } from '../store/useStore';

export function StudyLoggerPanel() {
  const { todaySessions, addSession } = useStore();

  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  const handleLogSession = () => {
    if (!subject.trim() || !hours || parseFloat(hours) <= 0) {
      alert('Please fill in all fields');
      return;
    }

    const session = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      subject,
      durationHours: parseFloat(hours),
      notes,
      loggedVia: 'manual' as const,
      timestamp: new Date().toISOString(),
    };

    addSession(session);
    alert(`Logged ${hours} hours of ${subject}`);

    // Reset form
    setSubject('');
    setHours('');
    setNotes('');
  };

  const totalHours = todaySessions.reduce((sum, s) => sum + s.durationHours, 0);

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-slate-900 overflow-y-auto">
      {/* Form Section */}
      <div className="metal-surface rounded-lg p-4 border-l-4 border-cyan-500 shadow">
        <h3 className="font-semibold accent-steel mb-3 uppercase tracking-wide">Log Session</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="number"
            placeholder="Hours"
            step={0.25}
            min={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
            rows={2}
          />
          <button
            onClick={handleLogSession}
            disabled={!subject || hours === ''}
            className="w-full px-4 py-2 bg-cyan-700 text-cyan-100 rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-600"
          >
            LOG SESSION
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="metal-surface rounded-lg p-4 shadow flex-1 overflow-y-auto border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold accent-steel uppercase">Sessions</h3>
          <p className="text-sm text-cyan-400">TOTAL: {totalHours.toFixed(2)}h</p>
        </div>

        {todaySessions.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No sessions logged</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => (
              <div key={session.id} className="bg-slate-800 p-2 rounded border border-slate-700 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-100">{session.subject}</p>
                    <p className="text-slate-400">{session.durationHours}h</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {session.notes && (
                  <p className="text-slate-400 italic mt-1">{session.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
