import React from 'react';

export function TitleBar() {
  return (
    <div className="h-12 metal-surface flex items-center justify-between px-4 select-none border-b border-slate-700">
      <div className="flex items-center gap-2 accent-steel">
        <span className="font-bold text-lg">FOCUS AGENT</span>
      </div>
      <div className="flex gap-2">
        <button className="hover:bg-slate-700 rounded px-3 py-1 transition-colors accent-steel text-sm">
          MIN
        </button>
        <button className="hover:bg-slate-700 rounded px-3 py-1 transition-colors accent-steel text-sm">
          MAX
        </button>
        <button className="hover:bg-red-900 rounded px-3 py-1 transition-colors text-red-200 text-sm">
          CLOSE
        </button>
      </div>
    </div>
  );
}
