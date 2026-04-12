/**
 * Goal & Penalty System
 * 
 * Manages daily study goals with debt carryover and penalty mode.
 * Key features:
 * 1. Base goal: 2 hours/day
 * 2. Debt carry-over: If goal missed, carry forward to next day
 * 3. Penalty mode: If 2 consecutive days missed → activate 7-day penalty (add 1h/day)
 * 4. Streak tracking: Track consecutive days of goal completion
 */

import { getFullContext } from '../db/queries';
import type { IPCDayContext } from '../../shared/ipc';
import { GOAL_CONFIG } from '../../shared/goalConfig';

export interface DailyGoalStatus {
  date: string;
  baseGoal: number; // 2 hours
  debtAssigned: number; // from previous day
  penaltyAssigned: number; // active penalty mode
  totalGoal: number; // baseGoal + debt + penalty
  hoursCompleted: number;
  minutesCompleted: number;
  remaining: number; // hours
  progressPercent: number; // 0-100
  goalMet: boolean;
  streakBreaks: number; // consecutive missed days before penalty
  penaltyModeActive: boolean;
  penaltyExpirationDate: string | null;
}

export interface GoalEvaluation {
  streakUpdated: number;
  penaltyActivated: boolean;
  newPenaltyDate: string | null;
  debtCarriedForward: number;
}

const BASE_GOAL_HOURS = GOAL_CONFIG.BASE_GOAL_HOURS;
const PENALTY_ACTIVATION_STREAK = GOAL_CONFIG.PENALTY_ACTIVATION_STREAK;
const PENALTY_DURATION_DAYS = GOAL_CONFIG.PENALTY_DURATION_DAYS;
const PENALTY_EXTRA_HOURS = GOAL_CONFIG.PENALTY_EXTRA_HOURS;

/**
 * Calculate today's goal including debt and penalties
 * @param context Today's context from database
 * @param debtFromPrevious Debt carried from previous day
 * @param penaltyExpirationDate When penalty mode expires
 * @returns Detailed goal status
 */
export function calculateDailyGoal(
  context: IPCDayContext,
  debtFromPrevious = 0,
  penaltyExpirationDate: string | null = null
): DailyGoalStatus {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if penalty mode is still active
  const penaltyModeActive = penaltyExpirationDate
    ? new Date(penaltyExpirationDate) >= new Date(today)
    : false;

  // Calculate hours
  const hoursCompleted = context.totalMinutes / 60;
  const minutesCompleted = context.totalMinutes;

  // Build up goal
  const debtAssigned = debtFromPrevious;
  const penaltyAssigned = penaltyModeActive ? PENALTY_EXTRA_HOURS : 0;
  const totalGoal = BASE_GOAL_HOURS + debtAssigned + penaltyAssigned;

  // Calculate progress
  const remaining = Math.max(totalGoal - hoursCompleted, 0);
  const progressPercent = totalGoal > 0 ? Math.min((hoursCompleted / totalGoal) * 100, 100) : 0;
  const goalMet = hoursCompleted >= totalGoal;

  return {
    date: today,
    baseGoal: BASE_GOAL_HOURS,
    debtAssigned,
    penaltyAssigned,
    totalGoal,
    hoursCompleted: Math.round(hoursCompleted * 100) / 100,
    minutesCompleted,
    remaining: Math.round(remaining * 100) / 100,
    progressPercent: Math.round(progressPercent),
    goalMet,
    streakBreaks: 0, // Placeholder, will be set during evaluation
    penaltyModeActive,
    penaltyExpirationDate: penaltyModeActive ? penaltyExpirationDate : null,
  };
}

/**
 * Evaluate previous day's goal and determine penalties/streak
 * @param previousDate The date to evaluate
 * @param context Previous day's context
 * @param currentStreak Current streak before this evaluation
 * @param lastPenaltyDate When the last penalty expires
 * @returns Updated streak and penalty info
 */
export function evaluatePreviousDayGoal(
  previousDate: string,
  context: IPCDayContext,
  currentStreak: number,
  lastPenaltyDate: string | null
): GoalEvaluation {
  // Get goal status for the previous day
  const prevGoal = calculateDailyGoal(context, 0, lastPenaltyDate);

  let streakUpdated = currentStreak;
  let penaltyActivated = false;
  let newPenaltyDate = lastPenaltyDate;
  let debtCarriedForward = 0;

  if (prevGoal.goalMet) {
    // Goal was met - increment streak
    streakUpdated = currentStreak + 1;
  } else {
    // Goal was not met - check for penalties
    debtCarriedForward = prevGoal.remaining; // Carry forward unmet hours

    // If this is the second consecutive miss, activate penalty
    if (currentStreak >= PENALTY_ACTIVATION_STREAK - 1) {
      penaltyActivated = true;
      const penaltyEndDate = new Date();
      penaltyEndDate.setDate(penaltyEndDate.getDate() + PENALTY_DURATION_DAYS);
      newPenaltyDate = penaltyEndDate.toISOString().split('T')[0];
      console.log(
        '[GoalSystem] ⚠️ Penalty mode activated! 7 days of +1h/day penalties starting'
      );
    }

    // Reset streak on miss
    streakUpdated = 0;
  }

  return {
    streakUpdated,
    penaltyActivated,
    newPenaltyDate,
    debtCarriedForward,
  };
}

/**
 * Get today's full goal status
 * Convenience function that fetches context and calculates goal
 * @param date Date to get goal for (default: today)
 * @param debtFromPrevious Previous day's debt
 * @param penaltyDate When penalty expires
 * @returns Full goal status
 */
export function getTodayGoalStatus(
  date: string = new Date().toISOString().split('T')[0],
  debtFromPrevious = 0,
  penaltyDate: string | null = null
): DailyGoalStatus {
  const context = getFullContext(date);
  return calculateDailyGoal(context, debtFromPrevious, penaltyDate);
}

/**
 * Generate a human-readable goal summary
 * @param goal Goal status
 * @returns Formatted string
 */
export function formatGoalSummary(goal: DailyGoalStatus): string {
  const parts: string[] = [];

  parts.push(`📊 Goal for ${goal.date}`);
  parts.push(`Target: ${goal.totalGoal}h (Base: ${goal.baseGoal}h)`);

  if (goal.debtAssigned > 0) {
    parts.push(`  + Debt carried: ${goal.debtAssigned}h`);
  }

  if (goal.penaltyAssigned > 0) {
    parts.push(`  + Penalty mode: +${goal.penaltyAssigned}h`);
  }

  parts.push(``);
  parts.push(`Progress: ${goal.hoursCompleted}h / ${goal.totalGoal}h (${goal.progressPercent}%)`);

  if (goal.goalMet) {
    parts.push(`✅ Goal met! Great work!`);
  } else {
    parts.push(`⏳ Remaining: ${goal.remaining}h`);
  }

  if (goal.penaltyModeActive) {
    parts.push(`⚠️ Penalty mode active until ${goal.penaltyExpirationDate}`);
  }

  return parts.join('\n');
}

/**
 * Check if a goal streak is at risk
 * @param streakDays Number of consecutive goal completions
 * @returns Warning about streak at risk
 */
export function checkStreakRisk(streakDays: number): string | null {
  if (streakDays >= PENALTY_ACTIVATION_STREAK - 1) {
    return `⚠️ Warning: Your ${streakDays}-day streak is at risk! One more miss triggers penalty mode.`;
  }
  return null;
}

/**
 * Calculate estimated penalty if goal is missed today
 * @param currentStreak Current streak
 * @returns Description of what happens if goal is missed
 */
export function calculateMissConsequence(currentStreak: number): string {
  if (currentStreak >= PENALTY_ACTIVATION_STREAK - 1) {
    return `Missing today will activate penalty mode: +1h/day for ${PENALTY_DURATION_DAYS} days!`;
  }
  return `Missing today will reset your streak to 0.`;
}

export default {
  calculateDailyGoal,
  evaluatePreviousDayGoal,
  getTodayGoalStatus,
  formatGoalSummary,
  checkStreakRisk,
  calculateMissConsequence,
  BASE_GOAL_HOURS,
  PENALTY_ACTIVATION_STREAK,
  PENALTY_DURATION_DAYS,
  PENALTY_EXTRA_HOURS,
};
