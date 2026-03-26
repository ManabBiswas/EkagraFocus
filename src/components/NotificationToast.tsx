import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClose: (id: string) => void;
}

function NotificationItem({ id, title, message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const styleMap = {
    info: 'border-cyan-400/35 bg-cyan-400/20',
    success: 'border-emerald-400/35 bg-emerald-400/20',
    warning: 'border-amber-400/35 bg-amber-400/20',
    error: 'border-red-400/35 bg-red-400/20',
  };

  const textMap = {
    info: 'text-cyan-200',
    success: 'text-emerald-200',
    warning: 'text-amber-200',
    error: 'text-red-200',
  };

  return (
    <div className={`panel-shell animate-slide-in flex items-start gap-3 px-4 py-3 ${styleMap[type]}`}>
      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-current opacity-90" />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold uppercase tracking-[0.28em] ${textMap[type]}`}>{title}</p>
        <p className="mt-1 text-sm text-slate-300">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="ml-auto rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-black/50"
      >
        Close
      </button>
    </div>
  );
}

export function NotificationToast() {
  const { notifications, removeNotification } = useStore();

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] space-y-2">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          id={notif.id}
          title={notif.title}
          message={notif.message}
          type={notif.type}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}
