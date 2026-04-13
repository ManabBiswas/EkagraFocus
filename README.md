# EkagraFocus — Command Deck

> A dark-themed Electron desktop app for studying smarter: AI-powered chat, a Pomodoro-style timer, manual session logging, debt/penalty goal tracking, and live analytics — all in one place.
---

## Quick Start

```bash
# Start the development server
npm start

# Expected: Electron window opens with React UI, database initialized, sample data seeded
```

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

## Documentation

- [Documentation index](docs/guide/README.md)
- [Imported file analysis](docs/guide/IMPORTED_FILE_ANALYSIS.md)
- [Corrected architecture](docs/guide/CORRECTED_ARCHITECTURE.md)

---

## Project Structure

```
EkagraFocus/
├── src/
│   ├── main/                      # Backend (Node.js process)
│   │   ├── index.ts              # Main process entry
│   │   ├── db/
│   │   │   ├── database.ts       # SQLite initialization + schema
│   │   │   └── queries.ts        # Type-safe database queries
│   │   ├── handlers/
│   │   │   └── ipcHandlers.ts    # IPC message handlers
│   │   └── services/             # Coming Days 2-5
│   │
│   ├── renderer/                  # Frontend (React process)
│   │   ├── App.tsx               # Root React component
│   │   ├── main.tsx              # React entry point
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx     # AI chat panel
│   │   │   ├── TimerPanel.tsx       # Study timer
│   │   │   ├── StatsPanel.tsx       # Weekly analytics
│   │   │   ├── TitleBar.tsx         # Custom title bar
│   │   │   ├── GoalBanner.tsx       # Goal progress bar
│   │   │   ├── TabBar.tsx           # Tab switcher
│   │   │   ├── StudyLoggerPanel.tsx # Manual logger
│   │   │   └── NotificationToast.tsx # Toast notifications
│   │   ├── store/
│   │   │   └── useStore.ts       # Zustand global state
│   │   └── services/
│   │       └── apiClient.ts      # IPC API wrapper for React
│   │
│   ├── shared/                    # Shared type definitions
│   │   └── ipc.ts               # All IPC message types
│   ├── preload.ts               # IPC bridge (contextBridge security)
│   ├── index.html               # HTML shell
│   ├── index.css                # Global styles + Tailwind
│   ├── index.d.ts               # TypeScript definitions for window.api
│   └── types/
│       └── index.ts             # Frontend type definitions
│
├── forge.config.js              # Electron Forge config (fixed, single plugin)
├── webpack.main.config.js       # Main process webpack
├── webpack.renderer.config.js   # Renderer webpack (with CSS)
├── webpack.rules.js             # Import rules (exports { rules })
├── webpack.plugins.js           # Webpack plugins (exports { plugins })
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
└── tsconfig.json                # TypeScript config
```
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
