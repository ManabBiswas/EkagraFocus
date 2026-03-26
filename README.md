# Focus Agent — Command Deck

> A dark-themed Electron desktop app for studying smarter: AI-powered chat, a Pomodoro-style timer, manual session logging, debt/penalty goal tracking, and live analytics — all in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 41 + Electron Forge |
| UI framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand 5 |
| Bundler | Webpack (via `@electron-forge/plugin-webpack`) |

---

## Project Structure

```
focus-agent/
├── src/
│   ├── index.ts              # Electron main process
│   ├── preload.ts            # Preload / IPC bridge (to be expanded)
│   ├── main.tsx              # React renderer entry point
│   ├── index.html            # HTML shell
│   ├── index.css             # Global styles + Tailwind + custom utilities
│   ├── App.tsx               # Root layout: DashboardOverview + tab routing
│   ├── types/
│   │   └── index.ts          # All shared TypeScript interfaces
│   ├── store/
│   │   └── useStore.ts       # Zustand global store
│   └── components/
│       ├── TitleBar.tsx          # Custom title bar (MIN / MAX / CLOSE)
│       ├── GoalBanner.tsx        # Today's goal progress bar + breakdown
│       ├── TabBar.tsx            # Chat / Timer / Log / Stats switcher
│       ├── ChatInterface.tsx     # AI chat panel (placeholder logic)
│       ├── TimerPanel.tsx        # Study timer with save-to-session
│       ├── StudyLoggerPanel.tsx  # Manual session logger
│       ├── StatsPanel.tsx        # Weekly stats + subject breakdown
│       └── NotificationToast.tsx # Auto-dismissing toast notifications
├── forge.config.ts
├── webpack.main.config.ts
├── webpack.renderer.config.ts
├── webpack.rules.ts
├── webpack.plugins.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install

```bash
npm install
```

### Run in development

```bash
npm start
```

### Build / Package

```bash
npm run make        # produces an installer for your OS
npm run package     # produces an unpacked build
```

### Lint

```bash
npm run lint
```

---

## Features

### Chat Interface
Send natural-language commands to the AI agent. Quick-command buttons (STATUS, 1H MATH, 2H DSA, SCHEDULE) prefill the input for common operations.

### Study Timer
Start / Pause / Reset a live stopwatch linked to a subject. Hit SAVE to commit the elapsed time as a session.

### Manual Session Logger
Log any past session by subject, hours, and optional notes. Sessions appear in a live list with a running total.

### Goal Banner
Displays today's base goal, any accumulated debt hours, and any active penalty hours. A progress bar and status badge show completion in real time.

### Stats Panel
Weekly bar chart of study hours vs. goal, subject-breakdown bars, streak counter, and total hours studied. Penalty mode expiry is surfaced here.

### Notification Toasts
Slide-in notifications (info / success / warning / error) that auto-dismiss after 3 seconds.

---

## Goal & Penalty System (design intent)

| Concept | Behaviour |
|---|---|
| **Base goal** | Configurable daily study target (hours) |
| **Debt** | Unmet hours from a missed day are spread across future days |
| **Streak break** | Two consecutive misses trigger penalty mode |
| **Penalty mode** | Adds extra hours per day for 7 days |
| **Streak** | Count of consecutive days the goal was fully met |

---

## Author

Manab Biswas — manabbiswas108108+github@gmail.com

---

## License

MIT
