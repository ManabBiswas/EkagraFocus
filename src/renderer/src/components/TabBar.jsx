// src/renderer/src/components/TabBar.jsx
import { useStore } from '../store/useStore'

export function TabBar() {
  const { activeTab, setActiveTab, todaySessions } = useStore()

  const tabs = [
    { id: 'chat',  label: 'CHAT',  icon: '◐' },
    { id: 'timer', label: 'TIMER', icon: '◷' },
    { id: 'log',   label: 'LOG',   icon: '◈' },
    { id: 'stats', label: 'STATS', icon: '◉' }
  ]

  return (
    <div style={styles.bar}>
      {tabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(active ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span style={styles.label}>{tab.label}</span>
            {active && <div style={styles.indicator} />}
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '0 4px',
    flexShrink: 0,
    background: '#0c0c0f'
  },
  tab: {
    flex: 1,
    padding: '8px 4px 7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    color: '#5c5a54',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    position: 'relative',
    transition: 'color 0.15s',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: "'Syne', sans-serif"
  },
  tabActive: {
    color: '#f5a623'
  },
  icon: {
    fontSize: '12px'
  },
  label: {},
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '2px',
    background: '#f5a623',
    borderRadius: '2px 2px 0 0'
  }
}
