// src/renderer/src/components/TitleBar.jsx
import { useStore } from '../store/useStore'

export function TitleBar() {
  const { status } = useStore()
  const api = window.focusAgent

  return (
    <div style={styles.bar}>
      {/* Drag region */}
      <div style={styles.drag}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <span style={styles.logoText}>FOCUS AGENT</span>
        </div>
        {status.penaltyModeActive && (
          <div style={styles.penaltyBadge}>⚡ PENALTY</div>
        )}
      </div>

      {/* Window controls */}
      <div style={styles.controls}>
        <button
          style={styles.ctrl}
          onClick={() => api.window.toggleAlwaysOnTop()}
          title="Toggle Always on Top"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M5 1L9 5H6V9H4V5H1L5 1Z" fill="currentColor" />
          </svg>
        </button>
        <button
          style={{ ...styles.ctrl, ...styles.ctrlMinimize }}
          onClick={() => api.window.minimize()}
          title="Minimize"
        >
          ─
        </button>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    WebkitAppRegion: 'drag',
    flexShrink: 0
  },
  drag: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    WebkitAppRegion: 'drag'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  logoIcon: {
    color: '#f5a623',
    fontSize: '14px',
    lineHeight: 1
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.15em',
    color: '#f0eee8'
  },
  penaltyBadge: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '2px 6px',
    borderRadius: '3px',
    animation: 'pulse-accent 2s ease infinite'
  },
  controls: {
    display: 'flex',
    gap: '6px',
    WebkitAppRegion: 'no-drag',
    alignItems: 'center'
  },
  ctrl: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5c5a54',
    fontSize: '11px',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer'
  },
  ctrlMinimize: {
    lineHeight: '10px'
  }
}


// ── TAB BAR ───────────────────────────────────────────────────────────────────

// src/renderer/src/components/TabBar.jsx
export function TabBar() {
  const { activeTab, setActiveTab } = useStore()

  const tabs = [
    { id: 'chat', label: 'CHAT', icon: '◐' },
    { id: 'timer', label: 'TIMER', icon: '◷' },
    { id: 'log', label: 'LOG', icon: '◈' },
    { id: 'stats', label: 'STATS', icon: '◉' }
  ]

  return (
    <div style={tabStyles.bar}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          style={{
            ...tabStyles.tab,
            ...(activeTab === tab.id ? tabStyles.tabActive : {})
          }}
          onClick={() => setActiveTab(tab.id)}
        >
          <span style={tabStyles.icon}>{tab.icon}</span>
          <span style={tabStyles.label}>{tab.label}</span>
          {activeTab === tab.id && <div style={tabStyles.indicator} />}
        </button>
      ))}
    </div>
  )
}

const tabStyles = {
  bar: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '0 4px',
    flexShrink: 0
  },
  tab: {
    flex: 1,
    padding: '8px 4px 7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    color: 'var(--text-muted)',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    position: 'relative',
    transition: 'color 0.15s',
    cursor: 'pointer'
  },
  tabActive: {
    color: 'var(--accent-primary)'
  },
  icon: {
    fontSize: '12px'
  },
  label: {
    fontFamily: 'var(--font-display)'
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '1px',
    background: 'var(--accent-primary)',
    borderRadius: '1px'
  }
}


// ── GOAL BANNER ───────────────────────────────────────────────────────────────

export function GoalBanner() {
  const { status } = useStore()

  const pct = status.progressPercent || 0
  const color = pct >= 100
    ? 'var(--status-success)'
    : pct >= 66
    ? 'var(--accent-primary)'
    : pct >= 33
    ? 'var(--status-warning)'
    : 'var(--status-danger)'

  return (
    <div style={bannerStyles.wrap}>
      <div style={bannerStyles.row}>
        <div style={bannerStyles.left}>
          <span style={{ ...bannerStyles.pct, color }}>{Math.round(pct)}%</span>
          <span style={bannerStyles.label}>
            {status.hoursCompleted.toFixed(2)}h / {status.totalGoal.toFixed(2)}h
          </span>
        </div>
        <div style={bannerStyles.right}>
          {status.debtHours > 0 && (
            <span style={bannerStyles.badge}>+{status.debtHours.toFixed(1)}h debt</span>
          )}
          {status.penaltyHours > 0 && (
            <span style={{ ...bannerStyles.badge, ...bannerStyles.badgeDanger }}>
              +{status.penaltyHours.toFixed(1)}h penalty
            </span>
          )}
          <span style={bannerStyles.remaining}>
            {status.goalMet ? '✓ done' : `${status.remaining.toFixed(2)}h left`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={bannerStyles.track}>
        <div style={{
          ...bannerStyles.fill,
          width: `${Math.min(pct, 100)}%`,
          background: color
        }} />
        {/* Debt marker */}
        {status.debtHours > 0 && (
          <div style={{
            ...bannerStyles.marker,
            left: `${(status.baseGoal / status.totalGoal) * 100}%`
          }} title="Base goal" />
        )}
      </div>
    </div>
  )
}

const bannerStyles = {
  wrap: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  pct: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 800,
    lineHeight: 1
  },
  label: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  badge: {
    fontSize: '9px',
    padding: '2px 5px',
    background: 'rgba(245, 166, 35, 0.1)',
    border: '1px solid var(--accent-border)',
    borderRadius: '3px',
    color: 'var(--accent-primary)'
  },
  badgeDanger: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444'
  },
  remaining: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)'
  },
  track: {
    height: '3px',
    background: 'var(--bg-overlay)',
    borderRadius: '2px',
    overflow: 'visible',
    position: 'relative'
  },
  fill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease, background 0.3s ease'
  },
  marker: {
    position: 'absolute',
    top: '-3px',
    width: '1px',
    height: '9px',
    background: 'var(--text-muted)',
    transform: 'translateX(-50%)'
  }
}


// ── NOTIFICATION TOAST ────────────────────────────────────────────────────────

export function NotificationToast() {
  const { notifications, removeNotification } = useStore()

  if (notifications.length === 0) return null

  const typeStyles = {
    info: { border: 'rgba(96, 165, 250, 0.3)', bg: 'rgba(96, 165, 250, 0.08)', icon: 'ℹ' },
    success: { border: 'rgba(34, 197, 94, 0.3)', bg: 'rgba(34, 197, 94, 0.08)', icon: '✓' },
    warning: { border: 'rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.08)', icon: '⚠' },
    danger: { border: 'rgba(239, 68, 68, 0.3)', bg: 'rgba(239, 68, 68, 0.08)', icon: '!' }
  }

  return (
    <div style={toastStyles.wrap}>
      {notifications.map(n => {
        const t = typeStyles[n.type] || typeStyles.info
        return (
          <div key={n.id} style={{
            ...toastStyles.toast,
            borderLeft: `2px solid ${t.border}`,
            background: t.bg,
            animation: 'fadeIn 0.2s ease'
          }}>
            <span style={{ color: t.border }}>{t.icon}</span>
            <span style={toastStyles.msg}>{n.message}</span>
            <button style={toastStyles.close} onClick={() => removeNotification(n.id)}>×</button>
          </div>
        )
      })}
    </div>
  )
}

const toastStyles = {
  wrap: {
    position: 'absolute',
    bottom: '12px',
    left: '10px',
    right: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    pointerEvents: 'none',
    zIndex: 1000
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    fontSize: '11px',
    pointerEvents: 'all',
    backdropFilter: 'blur(8px)'
  },
  msg: {
    flex: 1,
    color: 'var(--text-secondary)'
  },
  close: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px'
  }
}
