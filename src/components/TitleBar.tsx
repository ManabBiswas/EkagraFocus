import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const DEFAULT_ZOOM = 1;

export function TitleBar() {
  const { setActiveTab, addNotification } = useStore();
  const [zoomFactor, setZoomFactor] = useState<number>(DEFAULT_ZOOM);

  useEffect(() => {
    const syncZoom = async () => {
      try {
        const factor = await window.api.window.getZoomFactor();
        setZoomFactor(Number.isFinite(factor) ? factor : DEFAULT_ZOOM);
      } catch {
        setZoomFactor(DEFAULT_ZOOM);
      }
    };

    syncZoom();
  }, []);

  const handleZoomOut = async () => {
    try {
      const factor = await window.api.window.zoomOut();
      setZoomFactor(factor);
    } catch (error) {
      console.error('[TitleBar] Error zooming out:', error);
    }
  };

  const handleZoomReset = async () => {
    try {
      const factor = await window.api.window.zoomReset();
      setZoomFactor(factor);
    } catch (error) {
      console.error('[TitleBar] Error resetting zoom:', error);
    }
  };

  const handleZoomIn = async () => {
    try {
      const factor = await window.api.window.zoomIn();
      setZoomFactor(factor);
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
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300/50 text-emerald-200">
            <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
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
            {Math.round(zoomFactor * 100)}%
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
