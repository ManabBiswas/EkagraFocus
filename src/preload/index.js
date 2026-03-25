// src/preload/index.js
// Secure context bridge — exposes only specific APIs to renderer

import { contextBridge, ipcRenderer } from 'electron'

// Expose typed, safe API to renderer
contextBridge.exposeInMainWorld('focusAgent', {
  // AI Agent
  ai: {
    sendMessage: (message, notesMarkdown = '') =>
      ipcRenderer.invoke('ai:send-message', { message, notesMarkdown }),
    checkOllama: () => ipcRenderer.invoke('ai:check-ollama'),
    getHistory: () => ipcRenderer.invoke('ai:get-history'),
    clearHistory: () => ipcRenderer.invoke('ai:clear-history')
  },

  // Study Sessions
  session: {
    log: (subject, durationHours, notesMarkdown = '') =>
      ipcRenderer.invoke('session:log', { subject, durationHours, notesMarkdown }),
    getToday: () => ipcRenderer.invoke('session:get-today')
  },

  // Goal Engine
  goal: {
    getStatus: () => ipcRenderer.invoke('goal:get-status'),
    getSchedule: () => ipcRenderer.invoke('goal:get-schedule'),
    getFutureDebts: () => ipcRenderer.invoke('goal:get-future-debts'),
    runDailyCheck: () => ipcRenderer.invoke('goal:run-daily-check')
  },

  // Analytics
  analytics: {
    weeklyStats: () => ipcRenderer.invoke('analytics:weekly-stats'),
    subjectBreakdown: (days = 30) => ipcRenderer.invoke('analytics:subject-breakdown', { days }),
    streak: () => ipcRenderer.invoke('analytics:streak'),
    ledgerHistory: (days = 30) => ipcRenderer.invoke('analytics:ledger-history', { days })
  },

  // Penalty
  penalty: {
    getStatus: () => ipcRenderer.invoke('penalty:get-status'),
    reset: () => ipcRenderer.invoke('penalty:reset')
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
    openDevTools: () => ipcRenderer.invoke('window:open-devtools')
  },

  // Timer
  timer: {
    sessionStarted: (subject) => ipcRenderer.invoke('timer:session-started', { subject }),
    sessionEnded: (subject, durationHours) =>
      ipcRenderer.invoke('timer:session-ended', { subject, durationHours })
  },

  // Event Listeners (main → renderer push)
  on: (channel, callback) => {
    const validChannels = ['status:updated', 'timer:state-changed', 'notification']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data))
    }
  },
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
