import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

interface NotificationProps {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClose: (id: string) => void;
}

function NotificationItem({ id, message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000); // Auto-dismiss after 3 seconds

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const styleMap = {
    info: 'bg-blue-900 border border-blue-700',
    success: 'bg-green-900 border border-green-700',
    warning: 'bg-yellow-900 border border-yellow-700',
    error: 'bg-red-900 border border-red-700',
  };

  const textMap = {
    info: 'text-blue-200',
    success: 'text-green-200',
    warning: 'text-yellow-200',
    error: 'text-red-200',
  };

  return (
    <div
      className={`${styleMap[type]} px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-slide-in`}
    >
      <span className={`text-sm font-medium ${textMap[type]}`}>{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-auto hover:opacity-75 transition-opacity"
      >
        X
      </button>
    </div>
  );
}

export function NotificationToast() {
  const { notifications, removeNotification } = useStore();

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          id={notif.id}
          message={notif.message}
          type={notif.type}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  );
}
