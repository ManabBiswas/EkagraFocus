import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { TitleBar } from './components/TitleBar';
import { GoalBanner } from './components/GoalBanner';
import { TabBar } from './components/TabBar';
import { ChatInterface } from './components/ChatInterface';
import { TimerPanel } from './components/TimerPanel';
import { StudyLoggerPanel } from './components/StudyLoggerPanel';
import { StatsPanel } from './components/StatsPanel';
import { NotificationToast } from './components/NotificationToast';

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
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-900">
      {/* Title Bar */}
      <TitleBar />

      {/* Goal Banner */}
      <GoalBanner />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <TabBar />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {renderActiveTab()}
        </div>
      </div>

      {/* Notifications */}
      <NotificationToast />
    </div>
  );
}

export default App;