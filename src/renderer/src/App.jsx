// src/renderer/src/App.jsx
import { useEffect, useCallback } from 'react'
import { useStore } from './store/useStore'
import { TitleBar } from './components/TitleBar'
import { TabBar } from './components/TabBar'
import { ChatInterface } from './components/ChatInterface'
import { TimerPanel } from './components/TimerPanel'
import { MarkdownLogger } from './components/MarkdownLogger'
import { StatsPanel } from './components/StatsPanel'
import { GoalBanner } from './components/GoalBanner'
import { NotificationToast } from './components/NotificationToast'
import './styles/globals.css'

const api = window.focusAgent

export default function App() {
  const {
    activeTab,
    isInitialized,
    setInitialized,
    setStatus,
    setOllamaAvailable,
    setMessages,
    setTodaySessions,
    setWeeklyStats,
    setSubjectBreakdown,
    setStreak,
    setFutureDebts,
    addNotification
  } = useStore()

  // ── INITIALIZATION ────────────────────────────────────────────────────────

  const initialize = useCallback(async () => {
    try {
      // Load goal status
      const status = await api.goal.getStatus()
      setStatus(status)

      // Check Ollama availability
      const { available } = await api.ai.checkOllama()
      setOllamaAvailable(available)

      // Load chat history
      const history = await api.ai.getHistory()
      const messages = history.map(h => ({
        id: h.id,
        role: h.role,
        content: h.content,
        timestamp: h.created_at
      }))
      setMessages(messages)

      // Load today's sessions
      const sessions = await api.session.getToday()
      setTodaySessions(sessions)

      // Load analytics
      const [weekly, subjects, { streak }, debts] = await Promise.all([
        api.analytics.weeklyStats(),
        api.analytics.subjectBreakdown(30),
        api.analytics.streak(),
        api.goal.getFutureDebts()
      ])
      setWeeklyStats(weekly)
      setSubjectBreakdown(subjects)
      setStreak(streak)
      setFutureDebts(debts)

      setInitialized(true)

      if (!available) {
        addNotification('warning', 'Ollama not detected. AI chat unavailable. Start Ollama to enable.')
      }

      if (status.penaltyModeActive) {
        addNotification('danger', `🚨 Penalty Mode Active — +${status.penaltyHours}h/day`)
      }

    } catch (err) {
      console.error('[App] Init error:', err)
      setInitialized(true)
    }
  }, [])

  // ── REALTIME LISTENERS ─────────────────────────────────────────────────────

  useEffect(() => {
    // Main process pushes status updates
    api.on('status:updated', (status) => {
      setStatus(status)
    })

    // Main process notifications
    api.on('notification', ({ type, message }) => {
      addNotification(type, message)
    })

    initialize()

    return () => {
      api.off('status:updated')
      api.off('notification')
    }
  }, [initialize])

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      {/* Drag region + title */}
      <TitleBar />

      {/* Goal progress banner */}
      <GoalBanner />

      {/* Navigation tabs */}
      <TabBar />

      {/* Tab content */}
      <div style={styles.content}>
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'timer' && <TimerPanel />}
        {activeTab === 'log' && <MarkdownLogger />}
        {activeTab === 'stats' && <StatsPanel />}
      </div>

      {/* Notification toasts */}
      <NotificationToast />
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    background: '#0c0c0f',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
    position: 'relative',
    color: '#f0eee8'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column'
  }
}
