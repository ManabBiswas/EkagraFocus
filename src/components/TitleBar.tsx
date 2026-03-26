import React from 'react';

export function TitleBar() {
  return (
    <div className="flex h-14 items-center justify-between border-b border-white/10 bg-black/30 px-5 select-none backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-slate-500">EkagraFocus</p>
          <p className="text-sm font-semibold tracking-[0.24em] text-slate-100">COMMAND DECK</p>
        </div>
      </div>
      <div className="flex gap-2 text-xs uppercase tracking-[0.25em] text-slate-300">
        <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10">
          MIN
        </button>
        <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10">
          MAX
        </button>
        <button className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-red-100 transition-colors hover:bg-red-400/20">
          CLOSE
        </button>
      </div>
    </div>
  );
}
