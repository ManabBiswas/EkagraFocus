// src/renderer/src/components/NotificationToast.jsx
import { useStore } from '../store/useStore'

const TYPE_CONFIG = {
  info:    { border: 'rgba(96,165,250,0.35)',  bg: 'rgba(96,165,250,0.07)',  icon: 'ℹ', color: '#60a5fa' },
  success: { border: 'rgba(34,197,94,0.35)',   bg: 'rgba(34,197,94,0.07)',   icon: '✓', color: '#22c55e' },
  warning: { border: 'rgba(245,158,11,0.35)',  bg: 'rgba(245,158,11,0.07)',  icon: '⚠', color: '#f59e0b' },
  danger:  { border: 'rgba(239,68,68,0.35)',   bg: 'rgba(239,68,68,0.07)',   icon: '!', color: '#ef4444' }
}

export function NotificationToast() {
  const { notifications, removeNotification } = useStore()
  if (notifications.length === 0) return null

  return (
    <div style={styles.container}>
      {notifications.map(n => {
        const t = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
        return (
          <div
            key={n.id}
            style={{
              ...styles.toast,
              borderLeft: `2px solid ${t.border}`,
              background: t.bg,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <span style={{ color: t.color, fontSize: '11px', flexShrink: 0 }}>{t.icon}</span>
            <span style={styles.message}>{n.message}</span>
            <button
              style={styles.close}
              onClick={() => removeNotification(n.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    position: 'absolute',
    bottom: '10px',
    left: '8px',
    right: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    pointerEvents: 'none',
    zIndex: 9999
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '7px 9px',
    borderRadius: '6px',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'all',
    border: '1px solid transparent'
  },
  message: {
    flex: 1,
    fontSize: '11px',
    color: '#9d9b94',
    lineHeight: 1.4
  },
  close: {
    color: '#5c5a54',
    fontSize: '15px',
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    padding: '0 2px',
    background: 'none',
    border: 'none'
  }
}
