// src/main/ipcHandlers.js
// IPC bridge — all renderer ↔ main process communication

import { ipcMain, shell } from 'electron'
import { processMessage, checkOllamaAvailable } from './aiAgent.js'
import {
  logStudySession,
  getTodaySessions,
  getLedgerHistory,
  getWeeklyStats,
  getSubjectBreakdown,
  getStreak,
  clearChatHistory,
  getRecentChatHistory,
  getFutureDebts
} from './database.js'
import {
  getTodayStatus,
  getFutureSchedule,
  resetPenaltyMode,
  getPenaltyStatus,
  runDailyCheck
} from './goalEngine.js'

export function registerIpcHandlers(mainWindow) {

  // ── AI AGENT ─────────────────────────────────────────────────────────────

  ipcMain.handle('ai:send-message', async (_, { message, notesMarkdown }) => {
    try {
      const result = await processMessage(message, notesMarkdown || '')
      // Push updated status to renderer after any message
      const status = getTodayStatus()
      mainWindow.webContents.send('status:updated', status)
      return { success: true, ...result }
    } catch (err) {
      console.error('[IPC] ai:send-message error:', err)
      return { success: false, error: err.message, response: 'Connection error. Is Ollama running?', intent: 'ERROR' }
    }
  })

  ipcMain.handle('ai:check-ollama', async () => {
    return checkOllamaAvailable()
  })

  ipcMain.handle('ai:get-history', async () => {
    return getRecentChatHistory(50)
  })

  ipcMain.handle('ai:clear-history', async () => {
    clearChatHistory()
    return { success: true }
  })

  // ── STUDY SESSIONS ────────────────────────────────────────────────────────

  ipcMain.handle('session:log', async (_, { subject, durationHours, notesMarkdown }) => {
    try {
      const result = logStudySession({ subject, durationHours, notesMarkdown, loggedVia: 'manual' })
      const status = getTodayStatus()
      mainWindow.webContents.send('status:updated', status)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('session:get-today', async () => {
    return getTodaySessions()
  })

  // ── GOAL STATUS ───────────────────────────────────────────────────────────

  ipcMain.handle('goal:get-status', async () => {
    return getTodayStatus()
  })

  ipcMain.handle('goal:get-schedule', async () => {
    return getFutureSchedule()
  })

  ipcMain.handle('goal:get-future-debts', async () => {
    return getFutureDebts()
  })

  ipcMain.handle('goal:run-daily-check', async () => {
    await runDailyCheck()
    return getTodayStatus()
  })

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  ipcMain.handle('analytics:weekly-stats', async () => {
    return getWeeklyStats()
  })

  ipcMain.handle('analytics:subject-breakdown', async (_, { days = 30 }) => {
    return getSubjectBreakdown(days)
  })

  ipcMain.handle('analytics:streak', async () => {
    return { streak: getStreak() }
  })

  ipcMain.handle('analytics:ledger-history', async (_, { days = 30 }) => {
    return getLedgerHistory(days)
  })

  // ── PENALTY ───────────────────────────────────────────────────────────────

  ipcMain.handle('penalty:get-status', async () => {
    return getPenaltyStatus()
  })

  ipcMain.handle('penalty:reset', async () => {
    resetPenaltyMode()
    const status = getTodayStatus()
    mainWindow.webContents.send('status:updated', status)
    return { success: true }
  })

  // ── WINDOW CONTROLS ───────────────────────────────────────────────────────

  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window:toggle-always-on-top', () => {
    const current = mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(!current)
    return { alwaysOnTop: !current }
  })

  ipcMain.handle('window:open-devtools', () => {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  // ── TIMER EVENTS (renderer → main, for OS integration) ────────────────────

  ipcMain.handle('timer:session-started', (_, { subject }) => {
    console.log('[Timer] Session started:', subject)
    // Future: OS focus lock integration
    mainWindow.webContents.send('timer:state-changed', { running: true, subject })
    return { success: true }
  })

  ipcMain.handle('timer:session-ended', (_, { subject, durationHours }) => {
    console.log('[Timer] Session ended:', subject, durationHours, 'h')
    mainWindow.webContents.send('timer:state-changed', { running: false })
    return { success: true }
  })
}
