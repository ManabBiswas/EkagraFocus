import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export function TabBar() {
  const { activeTab, setActiveTab } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  const tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'timer', label: 'Timer' },
    { id: 'logger', label: 'Log' },
    { id: 'stats', label: 'Stats' },
    { id: 'plan', label: 'Plan' },
    { id: 'notes', label: 'Notes' },
  ] as const;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeEl = container.querySelector(
      `[data-tab="${activeTab}"]`
    ) as HTMLElement;

    if (activeEl) {
      setSliderStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="relative flex border-b border-slate-700/50 p-3"
    >
      {/* 🔷 Sliding Indicator */}
      <div
        className="absolute top-2 bottom-2 transition-all duration-300"
        style={{
          left: sliderStyle.left,
          width: sliderStyle.width,
        }}
      >
        <div className="w-full h-full tab-slider" />
      </div>

      {/* Tabs */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="tab-btn tab-btn-idle"
        >
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}