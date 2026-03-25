// src/main/goalEngine.js
// The Goal & Penalty Engine — state machine governing study rules

import { addDays, format, parseISO, differenceInDays } from 'date-fns'
import {
  getUserState,
  updateUserState,
  getTodayLedger,
  getOrCreateTodayLedger,
  getLedgerByDate,
  updateLedger,
  addDebt,
  getPendingDebtsForDate,
  markDebtsApplied,
  getFutureDebts,
  logPenaltyEvent,
  getDatabase
} from './database.js'

const BASE_GOAL_HOURS = 3.0
const DEBT_REDISTRIBUTION_DAYS = 3
const PENALTY_DURATION_DAYS = 7
const PENALTY_EXTRA_HOURS = 1.0

// ── DAILY INITIALIZATION ──────────────────────────────────────────────────────
// Called on app launch — runs the daily check and sets up today's goal

export async function runDailyCheck() {
  const today = new Date().toISOString().split('T')[0]
  const state = getUserState()

  console.log('[GoalEngine] Running daily check for:', today)

  // 1. Check yesterday's ledger (was goal met?)
  await checkYesterdayCompletion()

  // 2. Apply any debt that was queued for today
  await applyQueuedDebts(today)

  // 3. Apply penalty if active
  await applyPenaltyHours(today)

  // 4. Check if penalty has expired
  await checkPenaltyExpiry()

  // 5. Ensure today's ledger exists
  const ledger = getOrCreateTodayLedger()

  console.log('[GoalEngine] Today\'s goal:', getTodayTotalGoal())
  return getTodayStatus()
}

// ── YESTERDAY COMPLETION CHECK ────────────────────────────────────────────────

async function checkYesterdayCompletion() {
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')
  const ledger = getLedgerByDate(yesterday)

  if (!ledger) return // First day ever

  const totalGoal = ledger.base_goal + ledger.debt_assigned + ledger.penalty_assigned
  const deficit = totalGoal - ledger.hours_completed

  if (ledger.goal_met || deficit <= 0) {
    console.log('[GoalEngine] Yesterday goal was met ✓')
    return
  }

  console.log(`[GoalEngine] Yesterday deficit: ${deficit.toFixed(2)}h — redistributing...`)
  await distributeDeficit(yesterday, deficit)
}

// ── DEBT REDISTRIBUTION ────────────────────────────────────────────────────────

async function distributeDeficit(sourceDate, deficit) {
  const state = getUserState()
  const debtPerDay = deficit / DEBT_REDISTRIBUTION_DAYS

  for (let i = 1; i <= DEBT_REDISTRIBUTION_DAYS; i++) {
    const targetDate = format(addDays(new Date(), i), 'yyyy-MM-dd')
    addDebt(targetDate, debtPerDay, `Deficit from ${sourceDate}`, sourceDate)
    console.log(`[GoalEngine] Added ${debtPerDay.toFixed(2)}h debt to ${targetDate}`)
  }

  // Increment streak breaks
  const newBreaks = state.current_streak_breaks + 1
  updateUserState({ current_streak_breaks: newBreaks })

  logPenaltyEvent('GOAL_MISSED', `Missed goal on ${sourceDate}. Deficit: ${deficit.toFixed(2)}h. Debt redistributed over ${DEBT_REDISTRIBUTION_DAYS} days.`)

  // Second consecutive failure → activate penalty mode
  if (newBreaks >= 2 && !state.penalty_mode_active) {
    await activatePenaltyMode()
  }
}

// ── PENALTY MODE ──────────────────────────────────────────────────────────────

async function activatePenaltyMode() {
  const expirationDate = format(addDays(new Date(), PENALTY_DURATION_DAYS), 'yyyy-MM-dd')

  updateUserState({
    penalty_mode_active: 1,
    penalty_expiration_date: expirationDate
  })

  logPenaltyEvent(
    'PENALTY_ACTIVATED',
    `Penalty Mode activated. Expires: ${expirationDate}. Extra ${PENALTY_EXTRA_HOURS}h/day for ${PENALTY_DURATION_DAYS} days.`
  )

  console.log(`[GoalEngine] 🚨 PENALTY MODE ACTIVATED — expires ${expirationDate}`)
}

async function applyPenaltyHours(date) {
  const state = getUserState()
  if (!state.penalty_mode_active) return

  const ledger = getOrCreateTodayLedger()
  if (ledger.penalty_assigned > 0) return // Already applied today

  updateLedger(date, { penalty_assigned: PENALTY_EXTRA_HOURS })
  console.log(`[GoalEngine] Applied ${PENALTY_EXTRA_HOURS}h penalty to ${date}`)
}

async function checkPenaltyExpiry() {
  const state = getUserState()
  if (!state.penalty_mode_active || !state.penalty_expiration_date) return

  const today = new Date().toISOString().split('T')[0]
  if (today >= state.penalty_expiration_date) {
    updateUserState({
      penalty_mode_active: 0,
      penalty_expiration_date: null,
      current_streak_breaks: 0
    })
    logPenaltyEvent('PENALTY_EXPIRED', 'Penalty mode expired. Slate cleared.')
    console.log('[GoalEngine] ✅ Penalty mode expired')
  }
}

// ── DEBT APPLICATION ──────────────────────────────────────────────────────────

async function applyQueuedDebts(date) {
  const pendingDebts = getPendingDebtsForDate(date)
  if (pendingDebts.length === 0) return

  const totalDebt = pendingDebts.reduce((sum, d) => sum + d.debt_hours, 0)
  const ledger = getOrCreateTodayLedger()

  // Only add if not already applied
  if (ledger.debt_assigned === 0) {
    updateLedger(date, { debt_assigned: ledger.debt_assigned + totalDebt })
    markDebtsApplied(date)
    console.log(`[GoalEngine] Applied ${totalDebt.toFixed(2)}h accumulated debt to ${date}`)
  }
}

// ── STATUS & QUERIES ──────────────────────────────────────────────────────────

export function getTodayStatus() {
  const ledger = getOrCreateTodayLedger()
  const state = getUserState()
  const totalGoal = ledger.base_goal + ledger.debt_assigned + ledger.penalty_assigned
  const remaining = Math.max(0, totalGoal - ledger.hours_completed)
  const progressPercent = totalGoal > 0 ? Math.min(100, (ledger.hours_completed / totalGoal) * 100) : 0

  return {
    date: ledger.date,
    hoursCompleted: ledger.hours_completed,
    totalGoal,
    baseGoal: ledger.base_goal,
    debtHours: ledger.debt_assigned,
    penaltyHours: ledger.penalty_assigned,
    remaining,
    progressPercent,
    goalMet: ledger.goal_met === 1,
    penaltyModeActive: state.penalty_mode_active === 1,
    penaltyExpirationDate: state.penalty_expiration_date,
    streakBreaks: state.current_streak_breaks,
    totalHoursStudied: state.total_hours_studied
  }
}

export function getTodayTotalGoal() {
  const ledger = getOrCreateTodayLedger()
  if (!ledger) return BASE_GOAL_HOURS
  return ledger.base_goal + ledger.debt_assigned + ledger.penalty_assigned
}

export function getFutureSchedule() {
  const futureDebts = getFutureDebts()
  const state = getUserState()

  const schedule = []
  for (let i = 1; i <= 7; i++) {
    const date = format(addDays(new Date(), i), 'yyyy-MM-dd')
    const debts = futureDebts.filter(d => d.target_date === date)
    const totalDebt = debts.reduce((sum, d) => sum + d.debt_hours, 0)
    const penaltyHours = state.penalty_mode_active ? PENALTY_EXTRA_HOURS : 0

    schedule.push({
      date,
      baseGoal: BASE_GOAL_HOURS,
      debtHours: totalDebt,
      penaltyHours,
      totalGoal: BASE_GOAL_HOURS + totalDebt + penaltyHours
    })
  }

  return schedule
}

// Called when goal is met to reset streak breaks
export function onGoalMet() {
  const state = getUserState()
  if (state.current_streak_breaks > 0) {
    updateUserState({ current_streak_breaks: 0 })
  }
  logPenaltyEvent('GOAL_MET', 'Daily goal achieved.')
}

// Manual override (for testing/admin)
export function resetPenaltyMode() {
  updateUserState({
    penalty_mode_active: 0,
    penalty_expiration_date: null,
    current_streak_breaks: 0
  })
  logPenaltyEvent('MANUAL_RESET', 'Penalty mode manually reset.')
}

export function getPenaltyStatus() {
  const state = getUserState()
  if (!state.penalty_mode_active) return null

  const today = new Date().toISOString().split('T')[0]
  const daysRemaining = state.penalty_expiration_date
    ? differenceInDays(parseISO(state.penalty_expiration_date), parseISO(today))
    : 0

  return {
    active: true,
    expirationDate: state.penalty_expiration_date,
    daysRemaining,
    extraHoursPerDay: PENALTY_EXTRA_HOURS
  }
}
