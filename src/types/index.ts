// Type definitions for EkagraFocus

export interface Goal {
  date: string;
  baseGoal: number;
  debtAssigned: number;
  penaltyAssigned: number;
  hoursCompleted: number;
  goalMet: boolean;
}

export interface StudySession {
  id: string;
  date: string;
  subject: string;
  durationHours: number;
  notes: string;
  loggedVia: 'chat' | 'timer' | 'manual';
  timestamp: string;
}

export interface UserState {
  currentStreakBreaks: number;
  penaltyModeActive: boolean;
  penaltyExpirationDate: string | null;
  totalHoursStudied: number;
  baseGoal: number;
}

export interface DebtItem {
  targetDate: string;
  debtHours: number;
  reason: 'missed_goal' | 'penalty_redistribution';
  sourceDate: string;
  applied: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
}

export interface DailyStatus {
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

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface WeeklyStats {
  date: string;
  hoursStudied: number;
  goalMet: boolean;
}

export interface SubjectBreakdown {
  subject: string;
  hours: number;
  sessions: number;
  percentage: number;
}

export interface SchedulePlan {
  fileName: string;
  filePath: string;
  content: string;
  importedAt: string;
}

export interface ScheduleAnalysis {
  summary: string;
  recommendations: string[];
  studyPlan: string | {
    phases: Array<{
      name: string;
      focus: string;
      activities: string;
      checkpoint: string;
    }>;
    key_elements: string[];
  };
  timeManagement: string | {
    daily_schedule_template: string;
    tips: string[];
  };
  risks: string[];
}

export interface WorkloadEstimate {
  totalHours: number;
  difficulty: 'light' | 'moderate' | 'heavy';
  recommendation: string;
}
