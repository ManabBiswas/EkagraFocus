import React from 'react';
import { useStore } from '../store/useStore';

export function TitleBar() {
  const { setActiveTab, addNotification } = useStore();

  const handleZoomOut = async () => {
    try {
      await window.api.window.zoomOut();
    } catch (error) {
      console.error('[TitleBar] Error zooming out:', error);
    }
  };

  const handleZoomReset = async () => {
    try {
      await window.api.window.zoomReset();
    } catch (error) {
      console.error('[TitleBar] Error resetting zoom:', error);
    }
  };

  const handleZoomIn = async () => {
    try {
      await window.api.window.zoomIn();
    } catch (error) {
      console.error('[TitleBar] Error zooming in:', error);
    }
  };

  const handleProfile = () => {
    setActiveTab('stats');
    addNotification({
      id: `notif-profile-${Date.now()}`,
      type: 'info',
      title: 'Profile',
      message: 'Profile workspace opened in Stats tab.',
      duration: 2600,
    });
  };

  return (
    <div className="flex h-14 items-center justify-between border-b border-white/10 bg-black/30 px-5 select-none backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-slate-500">EkagraFocus</p>
          <p className="text-sm font-semibold tracking-[0.24em] text-slate-100">COMMAND DECK</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
        <button
          onClick={handleProfile}
          className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/20"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300/50 text-[10px] font-bold text-emerald-200">
            P
          </span>
          PROFILE
        </button>

        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-1">
          <button
            onClick={handleZoomOut}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10"
            title="Zoom out"
          >
            -
          </button>
          <button
            onClick={handleZoomReset}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold tracking-widest text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10"
            title="Reset zoom"
          >
            100%
          </button>
          <button
            onClick={handleZoomIn}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10"
            title="Zoom in"
          >
            +
          </button>
        </div>

      </div>
    </div>
  );
}
