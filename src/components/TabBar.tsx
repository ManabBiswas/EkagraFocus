import React from 'react';
import { useStore } from '../store/useStore';

export function TabBar() {
  const { activeTab, setActiveTab } = useStore();

  const tabs = [
    { id: 'chat', label: 'Chat', color: 'cyan' },
    { id: 'timer', label: 'Timer', color: 'green' },
    { id: 'logger', label: 'Log', color: 'blue' },
    { id: 'stats', label: 'Stats', color: 'purple' },
    { id: 'plan', label: 'Plan', color: 'orange' },
    { id: 'notes', label: 'Notes', color: 'pink' },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/40 to-slate-800/30 backdrop-blur-sm p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`tab-btn transition-all duration-300 ${
            activeTab === tab.id
              ? 'tab-btn-active shadow-glow-sm'
              : 'border-slate-600/30 bg-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
