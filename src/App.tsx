import React, { useEffect } from 'react';
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
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
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
  const { activeTab, isInitialized, initializeStore } = useStore();

  useEffect(() => {
    // Initialize store on mount
    if (!isInitialized) {
      initializeStore();
    }
  }, [isInitialized, initializeStore]);

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

        <div className="flex-1 min-h-0 overflow-hidden p-4 lg:p-5">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <DashboardOverview />

            <main className="flex min-h-0 flex-col gap-4">
              <section className="panel-shell flex min-h-0 flex-1 flex-col overflow-hidden">
                <TabBar />
                <div className="min-h-0 flex-1 overflow-hidden">
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