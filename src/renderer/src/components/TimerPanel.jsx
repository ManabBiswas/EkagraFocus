// src/renderer/src/components/TimerPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

const api = window.focusAgent

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: '2 hours', seconds: 2 * 60 * 60 }
]

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerPanel() {
  const {
    timer, startTimer, stopTimer, resetTimer, tickTimer, setTimerSubject,
    addNotification, status, setStatus
  } = useStore()

  const [subject, setSubject] = useState(timer.subject || '')
  const [preset, setPreset] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [mode, setMode] = useState('stopwatch') // 'stopwatch' | 'countdown'
  const [countdown, setCountdown] = useState(25 * 60)
  const [countdownStart, setCountdownStart] = useState(25 * 60)
  const intervalRef = useRef(null)
  const [isDone, setIsDone] = useState(false)

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), [])

  const isRunning = timer.running

  const handleStart = async () => {
    if (!subject.trim()) {
      addNotification('warning', 'Enter a subject before starting the timer')
      return
    }

    clearInterval(intervalRef.current)
    setElapsed(0)
    setIsDone(false)

    if (mode === 'countdown' && preset) {
      setCountdown(preset.seconds)
      setCountdownStart(preset.seconds)
    }

    startTimer(subject.trim())
    await api.timer.sessionStarted(subject.trim())

    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        if (mode === 'countdown' && preset) {
          const newCountdown = preset.seconds - e - 1
          setCountdown(newCountdown)
          if (newCountdown <= 0) {
            clearInterval(intervalRef.current)
            handleSessionComplete(subject.trim(), (e + 1) / 3600)
            return e + 1
          }
        }
        return e + 1
      })
    }, 1000)
  }

  const handleStop = async () => {
    clearInterval(intervalRef.current)
    const durationHours = elapsed / 3600

    if (elapsed < 60) {
      addNotification('warning', 'Session too short (< 1 min) to log')
      resetTimer()
      setElapsed(0)
      return
    }

    await handleSessionComplete(subject, durationHours)
  }

  const handleSessionComplete = async (subj, durationHours) => {
    clearInterval(intervalRef.current)
    stopTimer()
    setIsDone(true)

    try {
      const result = await api.session.log(subj, durationHours, '')
      const newStatus = await api.goal.getStatus()
      setStatus(newStatus)

      if (result.goalMet) {
        addNotification('success', `🎉 Goal complete! ${newStatus.totalGoal}h achieved!`)
      } else {
        addNotification('success',
          `✓ Logged ${durationHours >= 1 ? durationHours.toFixed(2) + 'h' : Math.round(durationHours * 60) + 'min'} of ${subj}`
        )
      }
    } catch (err) {
      addNotification('danger', 'Failed to log session: ' + err.message)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    resetTimer()
    setElapsed(0)
    setCountdown(countdownStart)
    setIsDone(false)
  }

  const displayTime = mode === 'countdown' && preset
    ? formatTime(Math.max(0, countdown))
    : formatTime(elapsed)

  const progressPct = mode === 'countdown' && preset
    ? ((countdownStart - countdown) / countdownStart) * 100
    : null

  const circumference = 2 * Math.PI * 64

  return (
    <div style={styles.wrap}>
      {/* Mode toggle */}
      <div style={styles.modeRow}>
        {['stopwatch', 'countdown'].map(m => (
          <button
            key={m}
            style={{
              ...styles.modeBtn,
              ...(mode === m ? styles.modeBtnActive : {})
            }}
            onClick={() => !isRunning && setMode(m)}
            disabled={isRunning}
          >
            {m === 'stopwatch' ? '◷ Stopwatch' : '⏳ Countdown'}
          </button>
        ))}
      </div>

      {/* Preset buttons (countdown only) */}
      {mode === 'countdown' && (
        <div style={styles.presets}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              style={{
                ...styles.presetBtn,
                ...(preset?.label === p.label ? styles.presetBtnActive : {})
              }}
              onClick={() => {
                if (!isRunning) {
                  setPreset(p)
                  setCountdown(p.seconds)
                  setCountdownStart(p.seconds)
                }
              }}
              disabled={isRunning}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Timer circle */}
      <div style={styles.timerWrap}>
        <svg width="160" height="160" style={styles.svg}>
          {/* Background ring */}
          <circle cx="80" cy="80" r="64" fill="none"
            stroke="#202028" strokeWidth="4" />
          {/* Progress ring */}
          {progressPct !== null ? (
            <circle cx="80" cy="80" r="64" fill="none"
              stroke={isDone ? '#22c55e' : '#f5a623'}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progressPct / 100) * circumference}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          ) : (
            isRunning && (
              <circle cx="80" cy="80" r="64" fill="none"
                stroke="#f5a623"
                strokeWidth="4"
                strokeDasharray="6 10"
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ animation: isRunning ? 'spin 4s linear infinite' : 'none' }}
              />
            )
          )}
        </svg>

        {/* Time display */}
        <div style={styles.timeInner}>
          <div style={{
            ...styles.timeDisplay,
            color: isDone ? '#22c55e'
              : isRunning ? '#f0eee8' : '#9d9b94'
          }}>
            {displayTime}
          </div>
          {isRunning && (
            <div style={styles.timeSub}>
              {(elapsed / 3600).toFixed(2)}h
            </div>
          )}
          {isDone && (
            <div style={{ ...styles.timeSub, color: '#22c55e' }}>
              session complete
            </div>
          )}
        </div>
      </div>

      {/* Subject input */}
      <div style={styles.subjectRow}>
        <input
          style={styles.subjectInput}
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject (e.g., Algorithms, OS, DBMS)"
          disabled={isRunning}
        />
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {!isRunning ? (
          <button style={styles.startBtn} onClick={handleStart}>
            ▶ Start
          </button>
        ) : (
          <>
            <button style={styles.stopBtn} onClick={handleStop}>
              ■ Stop & Log
            </button>
            <button style={styles.resetBtn} onClick={handleReset}>
              ↺
            </button>
          </>
        )}
        {!isRunning && elapsed > 0 && (
          <button style={styles.resetBtn} onClick={handleReset}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* Today's sessions summary */}
      <TodaySummary />
    </div>
  )
}

function TodaySummary() {
  const { status, todaySessions } = useStore()

  return (
    <div style={summaryStyles.wrap}>
      <div style={summaryStyles.header}>Today's sessions</div>
      {todaySessions.length === 0 ? (
        <div style={summaryStyles.empty}>No sessions yet</div>
      ) : (
        todaySessions.map(s => (
          <div key={s.id} style={summaryStyles.row}>
            <div style={summaryStyles.subject}>{s.subject}</div>
            <div style={summaryStyles.duration}>{s.duration_hours}h</div>
          </div>
        ))
      )}
      <div style={summaryStyles.total}>
        <span>Total</span>
        <span style={{ color: '#f5a623' }}>
          {status.hoursCompleted.toFixed(2)}h / {status.totalGoal.toFixed(2)}h
        </span>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px 12px',
    gap: '12px',
    overflow: 'auto',
    height: '100%'
  },
  modeRow: {
    display: 'flex',
    gap: '4px',
    width: '100%'
  },
  modeBtn: {
    flex: 1,
    padding: '6px',
    fontSize: '10px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#5c5a54',
    background: '#141418',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    fontFamily: "'JetBrains Mono', monospace"
  },
  modeBtnActive: {
    border: '1px solid rgba(245, 166, 35, 0.25)',
    color: '#f5a623',
    background: 'rgba(245, 166, 35, 0.12)'
  },
  presets: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%'
  },
  presetBtn: {
    padding: '4px 8px',
    fontSize: '10px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#5c5a54',
    background: '#141418',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace"
  },
  presetBtnActive: {
    border: '1px solid rgba(245, 166, 35, 0.25)',
    color: '#f5a623',
    background: 'rgba(245, 166, 35, 0.12)'
  },
  timerWrap: {
    position: 'relative',
    width: '160px',
    height: '160px'
  },
  svg: {
    position: 'absolute',
    top: 0, left: 0
  },
  timeInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeDisplay: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1
  },
  timeSub: {
    fontSize: '10px',
    color: '#5c5a54',
    marginTop: '4px',
    fontFamily: "'JetBrains Mono', monospace"
  },
  subjectRow: {
    width: '100%'
  },
  subjectInput: {
    width: '100%',
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#f0eee8',
    fontSize: '12px',
    outline: 'none',
    textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace"
  },
  controls: {
    display: 'flex',
    gap: '8px',
    width: '100%'
  },
  startBtn: {
    flex: 1,
    padding: '10px',
    background: '#f5a623',
    color: '#000',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '0.05em'
  },
  stopBtn: {
    flex: 1,
    padding: '10px',
    background: '#202028',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif"
  },
  resetBtn: {
    width: '40px',
    padding: '10px',
    background: '#202028',
    color: '#5c5a54',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  }
}

const summaryStyles = {
  wrap: {
    width: '100%',
    background: '#141418',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    overflow: 'hidden'
  },
  header: {
    padding: '6px 10px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#5c5a54',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    textTransform: 'uppercase'
  },
  empty: {
    padding: '10px',
    color: '#5c5a54',
    fontSize: '11px',
    textAlign: 'center'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 10px',
    fontSize: '11px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  subject: { color: '#9d9b94' },
  duration: { color: '#f5a623', fontWeight: 700 },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#5c5a54'
  }
}
