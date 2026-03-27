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
} from '../types';

interface FocusAgentState {
  // ── UI State ──────────────────────────────────────────────
  activeTab: 'chat' | 'timer' | 'logger' | 'stats' | 'plan';
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

  // ── AI Analysis & Gemini ────────────────────────────────────
  scheduleAnalysis: ScheduleAnalysis | null;
  workloadEstimate: WorkloadEstimate | null;
  studyTips: string[];
  geminiApiKey: string | null;
  isAnalyzing: boolean;

  // ── Actions ───────────────────────────────────────────────
  setActiveTab: (tab: 'chat' | 'timer' | 'logger' | 'stats' | 'plan') => void;
  initializeStore: () => void;
  setInitialized: (value: boolean) => void;

  setDailyStatus: (status: DailyStatus) => void;
  setUserState: (state: UserState) => void;
  updateDailyStatus: (partial: Partial<DailyStatus>) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setAgentThinking: (value: boolean) => void;
  clearMessages: () => void;

  startTimer: (subject: string) => void;
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
  setGeminiApiKey: (key: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

export const useStore = create<FocusAgentState>((set) => ({
  // Initial state
  activeTab: 'chat',
  isInitialized: false,

  dailyStatus: null,
  userState: null,

  messages: [],
  isAgentThinking: false,

  timerRunning: false,
  timerSeconds: 0,
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
  geminiApiKey: null,
  isAnalyzing: false,

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
  startTimer: (subject) =>
    set({
      timerRunning: true,
      timerSeconds: 0,
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
  setGeminiApiKey: (key) => {
    // Also persist to localStorage
    if (key) {
      typeof window !== 'undefined' && localStorage.setItem('geminiApiKey', key);
    } else {
      typeof window !== 'undefined' && localStorage.removeItem('geminiApiKey');
    }
    return set({ geminiApiKey: key });
  },
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
}));
