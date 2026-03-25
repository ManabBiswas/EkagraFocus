// src/renderer/src/components/GoalBanner.jsx
import { useStore } from '../store/useStore'

export function GoalBanner() {
  const { status } = useStore()

  const pct = status.progressPercent || 0
  const barColor =
    pct >= 100 ? '#22c55e' :
    pct >= 66  ? '#f5a623'  :
    pct >= 33  ? '#f59e0b'  :
                 '#ef4444'

  const basePercent = status.totalGoal > 0
    ? (status.baseGoal / status.totalGoal) * 100
    : 100

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        {/* Left — percentage + hours */}
        <div style={styles.left}>
          <span style={{ ...styles.pct, color: barColor }}>
            {Math.round(pct)}%
          </span>
          <span style={styles.hoursLabel}>
            {status.hoursCompleted.toFixed(2)}h&nbsp;/&nbsp;{status.totalGoal.toFixed(2)}h
          </span>
        </div>

        {/* Right — badges + remaining */}
        <div style={styles.right}>
          {status.debtHours > 0 && (
            <span style={styles.badge}>
              +{status.debtHours.toFixed(1)}h debt
            </span>
          )}
          {status.penaltyHours > 0 && (
            <span style={{ ...styles.badge, ...styles.badgeDanger }}>
              +{status.penaltyHours.toFixed(1)}h penalty
            </span>
          )}
          <span style={styles.remaining}>
            {status.goalMet
              ? '✓ done'
              : `${status.remaining.toFixed(2)}h left`}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div style={styles.track}>
        {/* Filled portion */}
        <div
          style={{
            ...styles.fill,
            width: `${Math.min(pct, 100)}%`,
            background: barColor
          }}
        />
        {/* Base-goal divider (shows where base 3h ends and debt begins) */}
        {status.debtHours > 0 && basePercent < 100 && (
          <div
            style={{
              ...styles.divider,
              left: `${basePercent}%`
            }}
            title={`Base goal: ${status.baseGoal}h`}
          />
        )}
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    padding: '7px 12px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px'
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  pct: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '17px',
    fontWeight: 800,
    lineHeight: 1,
    transition: 'color 0.3s'
  },
  hoursLabel: {
    fontSize: '10px',
    color: '#5c5a54',
    fontFamily: "'JetBrains Mono', monospace"
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  badge: {
    fontSize: '9px',
    padding: '2px 5px',
    background: 'rgba(245, 166, 35, 0.1)',
    border: '1px solid rgba(245, 166, 35, 0.25)',
    borderRadius: '3px',
    color: '#f5a623'
  },
  badgeDanger: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444'
  },
  remaining: {
    fontSize: '10px',
    color: '#9d9b94',
    fontFamily: "'JetBrains Mono', monospace"
  },
  track: {
    height: '3px',
    background: '#202028',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'visible'
  },
  fill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.3s ease',
    minWidth: pct => pct > 0 ? '4px' : '0'
  },
  divider: {
    position: 'absolute',
    top: '-3px',
    width: '1px',
    height: '9px',
    background: 'rgba(255,255,255,0.2)',
    transform: 'translateX(-50%)',
    pointerEvents: 'none'
  }
}
