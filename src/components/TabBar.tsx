import React from 'react';
import { useStore } from '../store/useStore';

export function TabBar() {
  const { activeTab, setActiveTab } = useStore();

  const tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'timer', label: 'Timer' },
    { id: 'logger', label: 'Log' },
    { id: 'stats', label: 'Stats' },
    { id: 'plan', label: 'Plan' },
  ] as const;

  return (
    <div className="flex gap-2 border-b border-white/10 bg-black/20 p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition-all ${
            activeTab === tab.id
              ? 'border border-cyan-400/35 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.1)]'
              : 'border border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
