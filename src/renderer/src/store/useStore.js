// src/renderer/src/store/useStore.js
// Zustand global state store

import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── UI STATE ──────────────────────────────────────────────────────────────
  activeTab: 'chat',          // 'chat' | 'timer' | 'log' | 'stats'
  isInitialized: false,
  ollamaAvailable: false,

  // ── GOAL STATUS ───────────────────────────────────────────────────────────
  status: {
    date: '',
    hoursCompleted: 0,
    totalGoal: 3,
    baseGoal: 3,
    debtHours: 0,
    penaltyHours: 0,
    remaining: 3,
    progressPercent: 0,
    goalMet: false,
    penaltyModeActive: false,
    streakBreaks: 0,
    totalHoursStudied: 0
  },

  // ── CHAT ──────────────────────────────────────────────────────────────────
  messages: [],
  isAgentThinking: false,

  // ── TIMER ─────────────────────────────────────────────────────────────────
  timer: {
    running: false,
    seconds: 0,
    subject: '',
    startTime: null
  },

  // ── SESSIONS ─────────────────────────────────────────────────────────────
  todaySessions: [],

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  weeklyStats: [],
  subjectBreakdown: [],
  streak: 0,
  futureDebts: [],

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  notifications: [],

  // ── ACTIONS ──────────────────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInitialized: (val) => set({ isInitialized: val }),

  setOllamaAvailable: (val) => set({ ollamaAvailable: val }),

  setStatus: (status) => set({ status }),

  updateStatus: (partial) => set(state => ({
    status: { ...state.status, ...partial }
  })),

  // Chat actions
  addMessage: (role, content, intent = null) => set(state => ({
    messages: [...state.messages, {
      id: Date.now() + Math.random(),
      role,
      content,
      intent,
      timestamp: new Date().toISOString()
    }]
  })),

  setMessages: (messages) => set({ messages }),

  setAgentThinking: (val) => set({ isAgentThinking: val }),

  clearMessages: () => set({ messages: [] }),

  // Timer actions
  startTimer: (subject) => set({
    timer: {
      running: true,
      seconds: 0,
      subject,
      startTime: Date.now()
    }
  }),

  tickTimer: () => set(state => ({
    timer: { ...state.timer, seconds: state.timer.seconds + 1 }
  })),

  stopTimer: () => set(state => ({
    timer: {
      ...state.timer,
      running: false,
      // Keep seconds for final log
    }
  })),

  resetTimer: () => set({
    timer: { running: false, seconds: 0, subject: '', startTime: null }
  }),

  setTimerSubject: (subject) => set(state => ({
    timer: { ...state.timer, subject }
  })),

  // Sessions
  setTodaySessions: (sessions) => set({ todaySessions: sessions }),

  addSession: (session) => set(state => ({
    todaySessions: [session, ...state.todaySessions]
  })),

  // Analytics
  setWeeklyStats: (stats) => set({ weeklyStats: stats }),
  setSubjectBreakdown: (data) => set({ subjectBreakdown: data }),
  setStreak: (streak) => set({ streak }),
  setFutureDebts: (debts) => set({ futureDebts: debts }),

  // Notifications
  addNotification: (type, message) => {
    const id = Date.now()
    set(state => ({
      notifications: [...state.notifications, { id, type, message }]
    }))
    // Auto-remove after 4s
    setTimeout(() => {
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    }, 4000)
  },

  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}))
