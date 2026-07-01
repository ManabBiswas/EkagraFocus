import { create } from 'zustand';
import type {
  DailyStatus,
  ChatMessage,
  StudySession,
  WeeklyStats,
  SubjectBreakdown,
  NotificationItem,
  UserState,
  SchedulePlan,
  ScheduleAnalysis,
  WorkloadEstimate,
  PlanSummary,
  PlanInsight,
  PlanWeekTask,
  MilestoneStatus,
  WeeklyProgressView,
} from '../types';
const calculateRemainingHours = (
  totalGoal: number,
  hoursCompleted: number
) => {
  return Math.max(totalGoal - hoursCompleted, 0);
};

import { GOAL_CONFIG } from '../shared/goalConfig';

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

const getInitialDailyStatus = (): DailyStatus => ({
  date: getTodayIsoDate(),
  baseGoal: GOAL_CONFIG.BASE_GOAL_HOURS,
  debtAssigned: 0,
  penaltyAssigned: 0,
  totalGoal: GOAL_CONFIG.BASE_GOAL_HOURS,
  hoursCompleted: 0,
  remaining: GOAL_CONFIG.BASE_GOAL_HOURS,
  progressPercent: 0,
  goalMet: false,
  penaltyModeActive: false,
  streakBreaks: 0,
});

const getInitialUserState = (): UserState => ({
  currentStreakBreaks: 0,
  penaltyModeActive: false,
  penaltyExpirationDate: null,
  totalHoursStudied: 0,
  baseGoal: GOAL_CONFIG.BASE_GOAL_HOURS,
});

// ─── Burnout types (mirrored from burnoutQueries.ts for renderer use) ────────

export type BurnoutSeverity = 'info' | 'warning' | 'critical';

export interface BurnoutWarning {
  type:
    | 'long_session'
    | 'high_daily_hours'
    | 'declining_consistency'
    | 'no_break'
    | 'overload_streak';
  severity: BurnoutSeverity;
  message: string;
  detail?: string;
}

export interface BurnoutReport {
  generatedAt: string;
  warnings: BurnoutWarning[];
  recommendations: string[];
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  stats: {
    avgDailyHoursLast7: number;
    maxSingleSessionHours: number;
    longestContinuousBlockHours: number;
    consistencyScore: number;
    studyDaysLast7: number;
  };
}

export interface BurnoutLiveRisk {
  isAtRisk: boolean;
  severity: BurnoutSeverity | null;
  message: string | null;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface FocusAgentState {
  // ── UI State ──────────────────────────────────────────────
  activeTab: 'chat' | 'timer' | 'logger' | 'stats' | 'plan' | 'notes';
  isInitialized: boolean;

  activeTheme: 'default' | 'deepFocus' | 'midnightPurple' | 'cyberNeon' | 'forestHacker';
  setTheme: (theme: 'default' | 'deepFocus' | 'midnightPurple' | 'cyberNeon' | 'forestHacker') => void;

  // ── Goal & Status ─────────────────────────────────────────
  dailyStatus: DailyStatus | null;
  userState: UserState | null;

  // ── Chat & Messages ───────────────────────────────────────
  messages: ChatMessage[];
  isAgentThinking: boolean;

  // ── Timer ─────────────────────────────────────────────────
  timerRunning: boolean;
  timerSeconds: number;
  timerDurationMinutes: number;
  timerStartedAt: number | null;
  currentSessionSubject: string;

  // ── Sessions ──────────────────────────────────────────────
  todaySessions: StudySession[];

  // ── Analytics ─────────────────────────────────────────────
  weeklyStats: WeeklyStats[];
  subjectBreakdown: SubjectBreakdown[];
  currentStreak: number;

  // ── Notifications ─────────────────────────────────────────
  notifications: NotificationItem[];

  // ── Schedule Plan ─────────────────────────────────────────
  schedulePlan: SchedulePlan | null;

  // ── AI Analysis ─────────────────────────────────────────────
  scheduleAnalysis: ScheduleAnalysis | null;
  workloadEstimate: WorkloadEstimate | null;
  studyTips: string[];
  isAnalyzing: boolean;

  // ── Plan Architecture State ─────────────────────────────────
  planSummary: PlanSummary | null;
  planInsight: PlanInsight | null;
  weekTasks: PlanWeekTask[];
  milestones: MilestoneStatus[];
  weeklyProgress: WeeklyProgressView | null;

  // ── Burnout ────────────────────────────────────────────────
  burnoutReport: BurnoutReport | null;
  burnoutLiveRisk: BurnoutLiveRisk | null;
  /** Timestamp (ms) when burnoutReport was last fetched — used to throttle calls */
  burnoutReportFetchedAt: number | null;

  // ── Actions ───────────────────────────────────────────────
  setActiveTab: (tab: 'chat' | 'timer' | 'logger' | 'stats' | 'plan' | 'notes') => void;
  initializeStore: () => void;
  setInitialized: (value: boolean) => void;

  setDailyStatus: (status: DailyStatus) => void;
  setUserState: (state: UserState) => void;
  updateDailyStatus: (partial: Partial<DailyStatus>) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setAgentThinking: (value: boolean) => void;
  clearMessages: () => void;

  startTimer: (subject: string, durationMinutes?: number) => void;
  stopTimer: () => void;
  tickTimer: () => void;
  resetTimer: () => void;
  setTimerSubject: (subject: string) => void;

  setTodaySessions: (sessions: StudySession[]) => void;
  addSession: (session: StudySession) => void;

  setWeeklyStats: (stats: WeeklyStats[]) => void;
  setSubjectBreakdown: (breakdown: SubjectBreakdown[]) => void;
  setCurrentStreak: (streak: number) => void;

  addNotification: (notification: NotificationItem) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setSchedulePlan: (plan: SchedulePlan | null) => void;
  setScheduleAnalysis: (analysis: ScheduleAnalysis | null) => void;
  setWorkloadEstimate: (estimate: WorkloadEstimate | null) => void;
  setStudyTips: (tips: string[]) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setPlanSummary: (summary: PlanSummary | null) => void;
  setPlanInsight: (insight: PlanInsight | null) => void;
  setWeekTasks: (tasks: PlanWeekTask[]) => void;
  setMilestones: (milestones: MilestoneStatus[]) => void;
  setWeeklyProgressView: (progress: WeeklyProgressView | null) => void;

  // Burnout actions
  setBurnoutReport: (report: BurnoutReport | null) => void;
  setBurnoutLiveRisk: (risk: BurnoutLiveRisk | null) => void;
  /**
   * Fetch the full burnout report from the backend and store it.
   * Throttled to once per 5 minutes to avoid hammering SQLite.
   */
  fetchBurnoutReport: () => Promise<void>;
  /**
   * Fetch the lightweight live risk check (today's minutes only).
   * Cheap — can be called after each session log.
   */
  fetchBurnoutLiveRisk: () => Promise<void>;
}

export const useStore = create<FocusAgentState>((set, get) => ({
  
  // Initial state
  activeTab: 'chat',
  isInitialized: false,
  activeTheme: 'default',

  dailyStatus: getInitialDailyStatus(),
  userState: getInitialUserState(),

  messages: [],
  isAgentThinking: false,

  timerRunning: false,
  timerSeconds: 0,
  timerDurationMinutes: 0,
  timerStartedAt: null,
  currentSessionSubject: '',

  todaySessions: [],

  weeklyStats: [],
  subjectBreakdown: [],
  currentStreak: 0,

  notifications: [],

  schedulePlan: null,
  scheduleAnalysis: null,
  workloadEstimate: null,
  studyTips: [],
  isAnalyzing: false,

  planSummary: null,
  planInsight: null,
  weekTasks: [],
  milestones: [],
  weeklyProgress: null,

  // Burnout initial state
  burnoutReport: null,
  burnoutLiveRisk: null,
  burnoutReportFetchedAt: null,

  // Tab actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  initializeStore: () => set({ isInitialized: true }),
  setInitialized: (value) => set({ isInitialized: value }),
  setTheme: (theme) => set({ activeTheme: theme }),

  // Status actions
  setDailyStatus: (status) => set({ dailyStatus: status }),
  setUserState: (state) => set({ userState: state }),
  updateDailyStatus: (partial) =>
    set((state) => ({
      dailyStatus: state.dailyStatus
        ? { ...state.dailyStatus, ...partial }
        : null,
    })),

  // Chat actions
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setMessages: (messages) => set({ messages }),
  setAgentThinking: (value) => set({ isAgentThinking: value }),
  clearMessages: () => set({ messages: [] }),

  // Timer actions
  startTimer: (subject, durationMinutes = 25) =>
    set({
      timerRunning: true,
      timerSeconds: 0,
      timerDurationMinutes: durationMinutes,
      timerStartedAt: Date.now(),
      currentSessionSubject: subject,
    }),
  stopTimer: () => set({ timerRunning: false }),
  tickTimer: () =>
    set((state) => ({
      timerSeconds: state.timerRunning ? state.timerSeconds + 1 : state.timerSeconds,
    })),
  resetTimer: () =>
    set({
      timerSeconds: 0,
      timerDurationMinutes: 0,
      timerStartedAt: null,
      timerRunning: false,
      currentSessionSubject: '',
    }),
  setTimerSubject: (subject) => set({ currentSessionSubject: subject }),

  // Session actions
  setTodaySessions: (sessions) => set({ todaySessions: sessions }),
  addSession: (session) =>
    set((state) => {
      if (!state.dailyStatus) return state;

      const currentStatus = state.dailyStatus;

      const updatedHours =
        currentStatus.hoursCompleted + session.durationHours;
      const baseGoal = currentStatus.totalGoal;

      const overflow = Math.max(updatedHours - baseGoal, 0);
      if (overflow > 0) {
        console.log('OVERFLOW DETECTED:', overflow);
      }
      console.log('SESSION ADDED:', session);
      console.log('UPDATED HOURS:', updatedHours);

      const remaining = calculateRemainingHours(
        currentStatus.totalGoal,
        updatedHours
      );

      return {
        todaySessions: [...state.todaySessions, session],
        dailyStatus: {
          ...currentStatus,
          hoursCompleted: updatedHours,
          remaining: remaining,
          goalMet: remaining === 0,
          progressPercent:
            (updatedHours / currentStatus.totalGoal) * 100,
        },
      };
    }),

  // Analytics actions
  setWeeklyStats: (stats) => set({ weeklyStats: stats }),
  setSubjectBreakdown: (breakdown) => set({ subjectBreakdown: breakdown }),
  setCurrentStreak: (streak) => set({ currentStreak: streak }),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Schedule plan actions
  setSchedulePlan: (plan) => set({ schedulePlan: plan }),

  // AI analysis actions
  setScheduleAnalysis: (analysis) => set({ scheduleAnalysis: analysis }),
  setWorkloadEstimate: (estimate) => set({ workloadEstimate: estimate }),
  setStudyTips: (tips) => set({ studyTips: tips }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  setPlanSummary: (summary) => set({ planSummary: summary }),
  setPlanInsight: (insight) => set({ planInsight: insight }),
  setWeekTasks: (tasks) => set({ weekTasks: tasks }),
  setMilestones: (milestones) => set({ milestones }),
  setWeeklyProgressView: (progress) => set({ weeklyProgress: progress }),

  // Burnout actions
  setBurnoutReport: (report) => set({ burnoutReport: report }),
  setBurnoutLiveRisk: (risk) => set({ burnoutLiveRisk: risk }),

  fetchBurnoutReport: async () => {
    const state = get();
    const now = Date.now();
    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

    // Throttle: skip if fetched recently
    if (
      state.burnoutReportFetchedAt !== null &&
      now - state.burnoutReportFetchedAt < THROTTLE_MS
    ) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api;
      if (!api?.burnout?.getReport) return;

      const res = await api.burnout.getReport();
      if (res?.success && res.data) {
        set({
          burnoutReport: res.data as BurnoutReport,
          burnoutReportFetchedAt: now,
        });
      }
    } catch (err) {
      console.warn('[useStore] fetchBurnoutReport failed:', err);
    }
  },

  fetchBurnoutLiveRisk: async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api;
      if (!api?.burnout?.getLiveRisk) return;

      const res = await api.burnout.getLiveRisk();
      if (res?.success && res.data) {
        set({ burnoutLiveRisk: res.data as BurnoutLiveRisk });
      }
    } catch (err) {
      console.warn('[useStore] fetchBurnoutLiveRisk failed:', err);
    }
  },
}));