import React from 'react';
import { useStore } from '../store/useStore';

export function TabBar() {
  const { activeTab, setActiveTab } = useStore();

  const tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'timer', label: 'Timer' },
    { id: 'logger', label: 'Log' },
    { id: 'stats', label: 'Stats' },
  ] as const;

  return (
    <div className="flex gap-1 bg-slate-900 p-1 border-b border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-slate-700 text-cyan-400 shadow-sm border border-cyan-500'
              : 'bg-transparent accent-steel hover:bg-slate-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
