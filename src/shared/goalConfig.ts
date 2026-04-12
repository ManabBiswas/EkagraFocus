export const GOAL_CONFIG = {
  BASE_GOAL_HOURS: 2,
  PENALTY_ACTIVATION_STREAK: 2,
  PENALTY_DURATION_DAYS: 7,
  PENALTY_EXTRA_HOURS: 1,
} as const;

export interface DailyGoalState {
  date: string;
  baseGoal: number;
  debtAssigned: number;
  penaltyAssigned: number;
  totalGoal: number;
  hoursCompleted: number;
  remaining: number;
  progressPercent: number;
  goalMet: boolean;
  penaltyModeActive: boolean;
  streakBreaks: number;
}

export interface UserGoalState {
  currentStreakBreaks: number;
  penaltyModeActive: boolean;
  penaltyExpirationDate: string | null;
  totalHoursStudied: number;
  baseGoal: number;
}
