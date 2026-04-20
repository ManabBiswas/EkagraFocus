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

interface FocusAgentState {
  // ── UI State ──────────────────────────────────────────────
  activeTab: 'chat' | 'timer' | 'logger' | 'stats' | 'plan' | 'notes';
  isInitialized: boolean;

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
}

export const useStore = create<FocusAgentState>((set) => ({
  // Initial state
  activeTab: 'chat',
  isInitialized: false,

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

  // Tab actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  initializeStore: () => set({ isInitialized: true }),
  setInitialized: (value) => set({ isInitialized: value }),

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
    set((state) => ({
      todaySessions: [...state.todaySessions, session],
    })),

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
}));
