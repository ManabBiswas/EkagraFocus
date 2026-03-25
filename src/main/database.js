// src/main/database.js
// JSON file-based database layer (MVP mode - no better-sqlite3 dependency)

import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db = null
const DB_VERSION = 1

let dbData = {
  user_state: [],
  daily_ledger: [],
  debt_queue: [],
  study_sessions: [],
  chat_messages: [],
  penalty_log: []
}

const dbFilePath = () => path.join(app.getPath('userData'), 'focus-agent.json')

export function initDatabase() {
  const filePath = dbFilePath()

  // Ensure userData directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Load existing data or create new
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      dbData = JSON.parse(raw)
      console.log('[DB] Loaded from:', filePath)
    } catch (e) {
      console.warn('[DB] Error loading DB, creating fresh:', e.message)
      createTables()
      seedDefaultState()
      saveDatabase()
    }
  } else {
    createTables()
    seedDefaultState()
    saveDatabase()
  }

  console.log('[DB] Initialized at:', filePath)
}

function createTables() {
  if (dbData.user_state.length === 0) {
    dbData.user_state = [{
      id: 1,
      current_streak_breaks: 0,
      penalty_mode_active: 0,
      penalty_expiration_date: null,
      total_hours_studied: 0,
      base_daily_goal: 3.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  }
  if (!Array.isArray(dbData.daily_ledger)) dbData.daily_ledger = []
  if (!Array.isArray(dbData.debt_queue)) dbData.debt_queue = []
  if (!Array.isArray(dbData.study_sessions)) dbData.study_sessions = []
  if (!Array.isArray(dbData.chat_messages)) dbData.chat_messages = []
  if (!Array.isArray(dbData.penalty_log)) dbData.penalty_log = []
}

function seedDefaultState() {
  if (dbData.user_state.length === 0) {
    dbData.user_state.push({
      id: 1,
      current_streak_breaks: 0,
      penalty_mode_active: 0,
      penalty_expiration_date: null,
      total_hours_studied: 0,
      base_daily_goal: 3.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
  saveDatabase()
}

function saveDatabase() {
  try {
    const filePath = dbFilePath()
    fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2), 'utf-8')
  } catch (e) {
    console.error('[DB] Error saving:', e.message)
  }
}

// ── USER STATE ────────────────────────────────────────────────────────────────

export function getUserState() {
  return dbData.user_state[0] || null
}

export function updateUserState(fields) {
  if (dbData.user_state.length === 0) return
  Object.assign(dbData.user_state[0], fields, { updated_at: new Date().toISOString() })
  saveDatabase()
}

// ── DAILY LEDGER ───────────────────────────────────────────────────────────────

export function getTodayLedger() {
  const today = new Date().toISOString().split('T')[0]
  return dbData.daily_ledger.find(l => l.date === today)
}

export function getOrCreateTodayLedger() {
  const today = new Date().toISOString().split('T')[0]
  let ledger = dbData.daily_ledger.find(l => l.date === today)

  if (!ledger) {
    ledger = {
      id: Date.now(),
      date: today,
      base_goal: 3.0,
      debt_assigned: 0,
      penalty_assigned: 0,
      hours_completed: 0,
      goal_met: 0,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    dbData.daily_ledger.push(ledger)
    saveDatabase()
  }

  return ledger
}

export function getLedgerByDate(date) {
  return dbData.daily_ledger.find(l => l.date === date)
}

export function getLedgerHistory(days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return dbData.daily_ledger
    .filter(l => new Date(l.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function updateLedger(date, fields) {
  const ledger = dbData.daily_ledger.find(l => l.date === date)
  if (ledger) {
    Object.assign(ledger, fields, { updated_at: new Date().toISOString() })
    saveDatabase()
  }
}

// ── STUDY SESSIONS ──────────────────────────────────────────────────────────

export function logStudySession({ subject, durationHours, notesMarkdown = '', loggedVia = 'chat' }) {
  const today = new Date().toISOString().split('T')[0]

  // Insert session
  const session = {
    id: Date.now(),
    date: today,
    subject,
    duration_hours: durationHours,
    notes_markdown: notesMarkdown,
    logged_via: loggedVia,
    created_at: new Date().toISOString()
  }
  dbData.study_sessions.push(session)

  // Update daily ledger total
  const ledger = getOrCreateTodayLedger()
  const newTotal = ledger.hours_completed + durationHours
  const totalGoal = ledger.base_goal + ledger.debt_assigned + ledger.penalty_assigned
  const goalMet = newTotal >= totalGoal ? 1 : 0

  updateLedger(today, {
    hours_completed: newTotal,
    goal_met: goalMet
  })

  // Update total studied
  const state = getUserState()
  updateUserState({ total_hours_studied: state.total_hours_studied + durationHours })

  saveDatabase()

  return {
    sessionId: session.id,
    hoursCompleted: newTotal,
    totalGoal,
    goalMet: goalMet === 1
  }
}

export function getSessionsForDate(date) {
  return dbData.study_sessions
    .filter(s => s.date === date)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export function getTodaySessions() {
  const today = new Date().toISOString().split('T')[0]
  return getSessionsForDate(today)
}

// ── DEBT QUEUE ──────────────────────────────────────────────────────────────

export function addDebt(targetDate, debtHours, reason, sourceDate) {
  const debt = {
    id: Date.now(),
    target_date: targetDate,
    debt_hours: debtHours,
    reason,
    source_date: sourceDate,
    applied: 0,
    created_at: new Date().toISOString()
  }
  dbData.debt_queue.push(debt)
  saveDatabase()
}

export function getPendingDebtsForDate(date) {
  return dbData.debt_queue.filter(d => d.target_date === date && d.applied === 0)
}

export function markDebtsApplied(date) {
  dbData.debt_queue
    .filter(d => d.target_date === date)
    .forEach(d => { d.applied = 1 })
  saveDatabase()
}

export function getFutureDebts() {
  const today = new Date().toISOString().split('T')[0]
  return dbData.debt_queue
    .filter(d => d.target_date > today && d.applied === 0)
    .sort((a, b) => a.target_date.localeCompare(b.target_date))
}

// ── CHAT HISTORY ────────────────────────────────────────────────────────────

export function saveChatMessage(role, content) {
  const msg = {
    id: Date.now(),
    role,
    content,
    created_at: new Date().toISOString()
  }
  dbData.chat_messages.push(msg)
  saveDatabase()
}

export function getRecentChatHistory(limit = 20) {
  return dbData.chat_messages
    .slice(-limit)
    .reverse()
    .map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at
    }))
}

export function clearChatHistory() {
  dbData.chat_messages = []
  saveDatabase()
}

// ── PENALTY LOG ─────────────────────────────────────────────────────────────

export function logPenaltyEvent(eventType, description) {
  const event = {
    id: Date.now(),
    event_type: eventType,
    description,
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
  dbData.penalty_log.push(event)
  saveDatabase()
}

export function getPenaltyLog() {
  return dbData.penalty_log
    .slice(-50)
    .reverse()
}

// ── ANALYTICS ──────────────────────────────────────────────────────────────

export function getWeeklyStats() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return (dbData.daily_ledger || [])
    .filter(l => new Date(l.date) >= sevenDaysAgo)
    .map(l => ({
      date: l.date,
      hours_completed: l.hours_completed,
      total_goal: l.base_goal + l.debt_assigned + l.penalty_assigned,
      goal_met: l.goal_met,
      subjects: dbData.study_sessions
        .filter(s => s.date === l.date)
        .map(s => s.subject)
        .join(', ')
    }))
    .reverse()
}

export function getSubjectBreakdown(days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const breakdown = {}
  dbData.study_sessions
    .filter(s => new Date(s.date) >= cutoff)
    .forEach(s => {
      if (!breakdown[s.subject]) {
        breakdown[s.subject] = { subject: s.subject, total_hours: 0, session_count: 0 }
      }
      breakdown[s.subject].total_hours += s.duration_hours
      breakdown[s.subject].session_count++
    })

  return Object.values(breakdown).sort((a, b) => b.total_hours - a.total_hours)
}

export function getStreak() {
  let streak = 0
  const sorted = [...(dbData.daily_ledger || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60)

  for (const day of sorted) {
    if (day.goal_met) streak++
    else break
  }
  return streak
}

export function getDatabase() {
  return dbData
}
