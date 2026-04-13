import React, { useEffect, useRef } from 'react';
import { useStore } from './store/useStore';
import { TitleBar } from './components/TitleBar';
import { GoalBanner } from './components/GoalBanner';
import { TabBar } from './components/TabBar';
import { ChatInterface } from './components/ChatInterface';
import { TimerPanel } from './components/TimerPanel';
import { StudyLoggerPanel } from './components/StudyLoggerPanel';
import { StatsPanel } from './components/StatsPanel';
import { PlanViewer } from './components/PlanViewer';
import { NotificationToast } from './components/NotificationToast';
import { GOAL_CONFIG } from './shared/goalConfig';

function DashboardOverview() {
  const {
    activeTab,
    dailyStatus,
    weeklyStats,
    todaySessions,
    currentStreak,
    userState,
    timerRunning,
    timerSeconds,
    isAgentThinking,
  } = useStore();

  const weeklyHours = weeklyStats.reduce((sum, entry) => sum + entry.hoursStudied, 0);
  const todayHours = todaySessions.reduce((sum, session) => sum + session.durationHours, 0);
  const timerHours = Math.floor(timerSeconds / 3600);
  const timerMinutes = Math.floor((timerSeconds % 3600) / 60);
  const timerSecondsRemainder = timerSeconds % 60;
  const timerLabel = `${timerHours.toString().padStart(2, '0')}:${timerMinutes
    .toString()
    .padStart(2, '0')}:${timerSecondsRemainder.toString().padStart(2, '0')}`;
  const goalLabel = dailyStatus
    ? `${dailyStatus.hoursCompleted.toFixed(1)}h / ${dailyStatus.totalGoal.toFixed(1)}h`
    : 'No goal loaded';

  const stats = [
    {
      label: 'Today',
      value: `${todayHours.toFixed(1)}h`,
      detail: `${todaySessions.length} sessions`,
      accent: 'border-cyan-400/30 text-cyan-100',
    },
    {
      label: 'Week',
      value: `${weeklyHours.toFixed(1)}h`,
      detail: 'Aggregated study time',
      accent: 'border-slate-200/20 text-slate-100',
    },
    {
      label: 'Streak',
      value: `${currentStreak}`,
      detail: 'Active run',
      accent: 'border-amber-400/30 text-amber-100',
    },
    {
      label: 'Timer',
      value: timerLabel,
      detail: timerRunning ? 'Running now' : 'Idle',
      accent: 'border-emerald-400/30 text-emerald-100',
    },
  ];

  return (
    <aside className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto xl:pr-2">
      <section className="panel-shell p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
          <div>
            <p className="section-label text-cyan-400">Mission control</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Operational dashboard</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-300">
              Dark metallic surfaces, strong borders, and live focus telemetry in one place.
            </p>
          </div>
          <div className="rounded-full border border-cyan-400/50 bg-cyan-400/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-100 font-semibold shadow-[0_0_12px_rgba(34,211,238,0.2)]">
            Live
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label text-cyan-300">Current focus</p>
                <p className="mt-2 text-lg font-bold text-white">
                  {activeTab.toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {timerRunning ? 'Timer active and logging progress.' : 'Ready for a new session.'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Agent</p>
                <p className={`mt-2 text-sm font-medium ${isAgentThinking ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {isAgentThinking ? 'Thinking' : 'Standing by'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300 font-semibold">
                <span>Goal state</span>
                <span>{dailyStatus?.goalMet ? 'Complete' : 'In progress'}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-lg font-bold text-white">{goalLabel}</p>
                <p className={`text-sm font-semibold ${dailyStatus?.goalMet ? 'text-emerald-300' : 'text-cyan-300'}`}>
                  {dailyStatus ? `${Math.min(dailyStatus.progressPercent, 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-900">
                <div
                  className={`h-full rounded-full transition-all duration-300 shadow-[0_0_8px] ${
                    dailyStatus?.goalMet ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-cyan-400 shadow-cyan-400/50'
                  }`}
                  style={{ width: `${dailyStatus ? Math.min(dailyStatus.progressPercent, 100) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {userState?.penaltyModeActive ? 'Penalty mode is active.' : 'Normal operating mode.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border bg-black/35 p-4 ${stat.accent}`}>
                <p className="section-label text-cyan-300 font-semibold">{stat.label}</p>
                <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-300">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoalBanner />
    </aside>
  );
}

export function App() {
  const {
    activeTab,
    isInitialized,
    initializeStore,
    timerRunning,
    tickTimer,
    setDailyStatus,
    setTodaySessions,
    setUserState,
    setWeeklyStats,
    setSubjectBreakdown,
    setPlanSummary,
    setWeeklyProgressView,
  } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Initialize store on mount
    if (!isInitialized) {
      initializeStore();
    }
  }, [isInitialized, initializeStore]);

  // Global timer effect - keeps running even when switching tabs
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set up interval if timer is running
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    }

    // Cleanup on unmount or when timerRunning changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerRunning, tickTimer]);

  useEffect(() => {
    const refreshContext = async () => {
      try {
        if (!window.api?.db?.getDayContext) {
          return;
        }

        const date = getTodayDate();
        const [
          context,
          weeklyStatsRows,
          subjectRows,
          planUserState,
          activePlan,
          weeklyProgress,
        ] = await Promise.all([
          window.api.db.getDayContext(date),
          window.api.db.getWeeklyStats(date),
          window.api.db.getSubjectBreakdown(date),
          window.api.plan.getUserState(),
          window.api.plan.getActiveMetadata(),
          window.api.plan.getWeeklyProgress(),
        ]);
        const hoursCompleted = context.totalMinutes / 60;

        // Compute daily goal: base + debt + penalty
        // TODO: Get persisted debt and penalty from DB when goal persistence is implemented
        const baseGoal = planUserState?.base_goal_hours ?? GOAL_CONFIG.BASE_GOAL_HOURS;
        const debtAssigned = 0; // Future: Get from DB
        const penaltyModeActive = (planUserState?.penalty_mode_active ?? 0) === 1;
        const penaltyAssigned = penaltyModeActive ? GOAL_CONFIG.PENALTY_EXTRA_HOURS : 0;
        const totalGoal = baseGoal + debtAssigned + penaltyAssigned;
        
        const remaining = Math.max(totalGoal - hoursCompleted, 0);
        const progressPercent = totalGoal > 0 ? Math.min((hoursCompleted / totalGoal) * 100, 100) : 0;
        const goalMet = hoursCompleted >= totalGoal;

        setDailyStatus({
          date,
          baseGoal,
          debtAssigned,
          penaltyAssigned,
          totalGoal,
          hoursCompleted: Math.round(hoursCompleted * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          progressPercent: Math.round(progressPercent),
          goalMet,
          penaltyModeActive,
          streakBreaks: 0,
        });

        setTodaySessions(
          context.sessions.map((session) => ({
            id: session.id,
            date: session.date,
            subject: session.notes || 'Study Session',
            durationHours: Math.round((session.duration_minutes / 60) * 100) / 100,
            notes: session.notes || '',
            loggedVia: 'manual' as const,
            timestamp: session.created_at,
          }))
        );

        setWeeklyStats(
          weeklyStatsRows.map((row) => ({
            date: row.date,
            hoursStudied: Math.round((row.total_minutes / 60) * 100) / 100,
            goalMet: (row.total_minutes / 60) >= baseGoal,
          }))
        );

        const totalSubjectMinutes = subjectRows.reduce((sum, row) => sum + row.total_minutes, 0);
        setSubjectBreakdown(
          subjectRows.map((row) => ({
            subject: row.subject,
            hours: Math.round((row.total_minutes / 60) * 100) / 100,
            sessions: row.sessions,
            percentage:
              totalSubjectMinutes > 0 ? Math.round((row.total_minutes / totalSubjectMinutes) * 100) : 0,
          }))
        );

        if (activePlan) {
          setPlanSummary({
            planId: activePlan.plan_id,
            title: activePlan.title,
            startDate: activePlan.start_date,
            endDate: activePlan.end_date,
            durationDays: activePlan.duration_days,
            totalHoursEstimated: activePlan.total_hours_estimated,
            weeklyHoursAvg: activePlan.weekly_hours_avg,
          });
        }

        if (weeklyProgress) {
          const subjects = weeklyProgress.subjects_json
            ? (JSON.parse(weeklyProgress.subjects_json) as Record<string, number>)
            : {};
          const variance = weeklyProgress.variance_json
            ? (JSON.parse(weeklyProgress.variance_json) as Record<string, number>)
            : {};
          setWeeklyProgressView({
            weekNumber: weeklyProgress.week_number,
            weekStartDate: weeklyProgress.week_start_date,
            weekEndDate: weeklyProgress.week_end_date,
            hoursCompleted: weeklyProgress.hours_completed,
            hoursTarget: weeklyProgress.hours_target,
            completionPercentage: weeklyProgress.completion_percentage,
            onTrack: weeklyProgress.on_track === 1,
            subjects,
            variance,
          });
        }

        setUserState({
          currentStreakBreaks: 0,
          penaltyModeActive,
          penaltyExpirationDate: planUserState?.penalty_expiration_date || null,
          totalHoursStudied: planUserState?.total_hours_studied || hoursCompleted,
          baseGoal,
        });
      } catch (error) {
        console.error('[App] Failed to refresh day context:', error);
      }
    };

    refreshContext();

    const unsubscribe = window.api?.events?.onDbStateChanged((payload) => {
      console.log('[App] DB state changed:', payload.event);
      refreshContext();
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    setDailyStatus,
    setTodaySessions,
    setUserState,
    setWeeklyStats,
    setSubjectBreakdown,
    setPlanSummary,
    setWeeklyProgressView,
  ]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'timer':
        return <TimerPanel />;
      case 'logger':
        return <StudyLoggerPanel />;
      case 'stats':
        return <StatsPanel />;
      case 'plan':
        return <PlanViewer />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 app-grid opacity-30" />
      <div className="pointer-events-none absolute inset-0 dashboard-halo" />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <TitleBar />

        <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4 xl:p-5">
          <div className="grid h-full min-h-0 gap-4 overflow-y-auto pr-1 xl:grid-cols-[420px_minmax(0,1fr)] xl:overflow-hidden xl:pr-0">
            <DashboardOverview />

            <main className="flex min-h-0 flex-col gap-4">
              <section className="panel-shell flex min-h-140 flex-col overflow-hidden xl:min-h-0 xl:flex-1">
                <TabBar />
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                  {renderActiveTab()}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      <NotificationToast />
    </div>
  );
}

export default App;