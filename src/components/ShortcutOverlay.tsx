import React from 'react';

interface ShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutOverlay({ isOpen, onClose }: ShortcutOverlayProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="panel-shell max-w-md w-full p-6 bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.15)]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-cyan-400 transition-colors text-2xl leading-none"
          >&times;</button>
        </div>
        <div className="space-y-4 text-sm text-slate-300">
          <div className="flex justify-between items-center">
            <span>Start / Pause Timer (Timer tab)</span>
            <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-cyan-300 font-mono">Space</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span>Switch to Tabs 1-6</span>
            <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-cyan-300 font-mono">Ctrl + 1-6</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span>Go to Logger</span>
            <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-cyan-300 font-mono">Ctrl + L</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span>Go to Notes</span>
            <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-cyan-300 font-mono">Ctrl + N</kbd>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <span>Show this menu</span>
            <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-cyan-300 font-mono">Ctrl + /</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
