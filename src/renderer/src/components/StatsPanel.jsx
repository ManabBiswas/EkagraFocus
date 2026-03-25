// src/renderer/src/components/StatsPanel.jsx
import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const api = window.focusAgent

export function StatsPanel() {
  const {
    weeklyStats, subjectBreakdown, streak, futureDebts,
    setWeeklyStats, setSubjectBreakdown, setStreak, status
  } = useStore()

  useEffect(() => {
    const load = async () => {
      const [weekly, subjects, { streak }] = await Promise.all([
        api.analytics.weeklyStats(),
        api.analytics.subjectBreakdown(30),
        api.analytics.streak()
      ])
      setWeeklyStats(weekly)
      setSubjectBreakdown(subjects)
      setStreak(streak)
    }
    load()
  }, [])

  const maxHours = Math.max(...weeklyStats.map(d => d.total_goal || d.hours_completed || 0), 3)

  return (
    <div style={styles.wrap}>

      {/* Summary cards */}
      <div style={styles.cards}>
        <StatCard
          label="Streak"
          value={streak}
          unit="days"
          color="#22c55e"
        />
        <StatCard
          label="Total Studied"
          value={status.totalHoursStudied.toFixed(1)}
          unit="hours"
          color="#f5a623"
        />
        <StatCard
          label="Today"
          value={`${status.hoursCompleted.toFixed(1)}/${status.totalGoal.toFixed(1)}`}
          unit="h"
          color={status.goalMet ? '#22c55e' : '#9d9b94'}
        />
        <StatCard
          label="Breaks"
          value={status.streakBreaks}
          unit={status.streakBreaks === 1 ? 'miss' : 'misses'}
          color={status.streakBreaks > 0 ? '#ef4444' : '#5c5a54'}
        />
      </div>

      {/* Weekly bar chart */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Last 7 Days</div>
        <div style={styles.chart}>
          {weeklyStats.length === 0 ? (
            <div style={styles.empty}>No data yet</div>
          ) : (
            weeklyStats.slice(0, 7).reverse().map(day => {
              const goal = (day.base_goal || 3) + (day.debt_assigned || 0) + (day.penalty_assigned || 0)
              const pct = Math.min((day.hours_completed / goal) * 100, 100)
              const met = day.goal_met

              return (
                <div key={day.date} style={styles.bar}>
                  <div style={styles.barWrap}>
                    {/* Goal marker */}
                    <div style={{
                      ...styles.goalLine,
                      bottom: `${(goal / maxHours) * 100}%`
                    }} title={`Goal: ${goal}h`} />
                    {/* Bar fill */}
                    <div style={{
                      ...styles.barFill,
                      height: `${(day.hours_completed / maxHours) * 100}%`,
                      background: met ? '#22c55e' : pct > 50 ? '#f5a623' : '#ef4444'
                    }} title={`${day.hours_completed.toFixed(1)}h / ${goal.toFixed(1)}h`} />
                  </div>
                  <div style={styles.barLabel}>
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'narrow' })}
                  </div>
                  <div style={{
                    ...styles.barValue,
                    color: met ? '#22c55e' : '#5c5a54'
                  }}>
                    {day.hours_completed.toFixed(1)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Subject breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Subjects (30 days)</div>
        {subjectBreakdown.length === 0 ? (
          <div style={styles.empty}>No sessions logged</div>
        ) : (
          <div style={styles.subjects}>
            {(() => {
              const maxH = Math.max(...subjectBreakdown.map(s => s.total_hours))
              return subjectBreakdown.slice(0, 8).map(s => (
                <div key={s.subject} style={styles.subjectRow}>
                  <div style={styles.subjectName}>{s.subject}</div>
                  <div style={styles.subjectBar}>
                    <div style={{
                      ...styles.subjectFill,
                      width: `${(s.total_hours / maxH) * 100}%`
                    }} />
                  </div>
                  <div style={styles.subjectHours}>{s.total_hours.toFixed(1)}h</div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* Future debt schedule */}
      {futureDebts.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>⚠ Pending Debts</div>
          <div style={styles.debtList}>
            {futureDebts.slice(0, 5).map(d => (
              <div key={d.id} style={styles.debtRow}>
                <span style={styles.debtDate}>{d.target_date}</span>
                <span style={styles.debtReason}>{d.reason}</span>
                <span style={styles.debtHours}>+{d.debt_hours.toFixed(2)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={cardStyles.wrap}>
      <div style={cardStyles.label}>{label}</div>
      <div style={{ ...cardStyles.value, color }}>{value}</div>
      <div style={cardStyles.unit}>{unit}</div>
    </div>
  )
}

const cardStyles = {
  wrap: {
    flex: 1,
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '8px',
    textAlign: 'center',
    minWidth: 0
  },
  label: {
    fontSize: '8px',
    color: '#5c5a54',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  value: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '18px',
    fontWeight: 800,
    lineHeight: 1
  },
  unit: {
    fontSize: '8px',
    color: '#5c5a54',
    marginTop: '2px'
  }
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px',
    overflowY: 'auto',
    height: '100%'
  },
  cards: {
    display: 'flex',
    gap: '6px'
  },
  section: {
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  sectionTitle: {
    padding: '7px 10px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#5c5a54',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    textTransform: 'uppercase'
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: '#5c5a54',
    fontSize: '11px'
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    padding: '10px',
    height: '100px',
    gap: '4px'
  },
  bar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    flex: 1
  },
  barWrap: {
    flex: 1,
    width: '100%',
    maxWidth: '28px',
    background: '#202028',
    borderRadius: '2px',
    position: 'relative',
    minHeight: '60px'
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    zIndex: 2
  },
  barFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: '2px 2px 0 0',
    transition: 'height 0.5s ease',
    minHeight: '2px'
  },
  barLabel: {
    fontSize: '8px',
    color: '#5c5a54',
    textAlign: 'center'
  },
  barValue: {
    fontSize: '8px',
    fontFamily: "'JetBrains Mono', monospace"
  },
  subjects: {
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  subjectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  subjectName: {
    fontSize: '10px',
    color: '#9d9b94',
    width: '90px',
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  subjectBar: {
    flex: 1,
    height: '4px',
    background: '#202028',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  subjectFill: {
    height: '100%',
    background: '#f5a623',
    borderRadius: '2px',
    transition: 'width 0.5s ease'
  },
  subjectHours: {
    fontSize: '10px',
    color: '#f5a623',
    fontFamily: "'JetBrains Mono', monospace",
    width: '32px',
    textAlign: 'right'
  },
  debtList: {
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  debtRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '10px'
  },
  debtDate: {
    color: '#5c5a54',
    width: '80px',
    flexShrink: 0,
    fontFamily: "'JetBrains Mono', monospace"
  },
  debtReason: {
    flex: 1,
    color: '#9d9b94',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  debtHours: {
    color: '#f59e0b',
    fontWeight: 700
  }
}
