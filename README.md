# ◈ Focus Agent

> AI-Powered Focus & Study Desktop Widget — built on Electron + React + LangChain + Ollama

A persistent, always-on-top desktop agent that enforces your 3h/day study goal through automatic debt redistribution, penalty mechanics, and a local AI assistant you talk to in natural language.

---

## Screenshots

```
┌─────────────────────────┐
│ ◈ FOCUS AGENT   ▲  ─   │  ← Frameless, always-on-top
├─────────────────────────┤
│ 67%  2.00h / 3.00h      │  ← Live progress bar
│ ████████████░░░░  1h left│
├──────┬───────┬────┬─────┤
│ CHAT │ TIMER │LOG │STATS│  ← 4 tabs
├─────────────────────────┤
│ ◈ Welcome to Focus Agent│
│                         │
│ You: I just did 2h DSA  │
│                         │
│ ◈ ✅ Logged 2h of DSA   │
│    Progress: 2h / 3h    │
│    ⏳ 1h remaining      │
├─────────────────────────┤
│ [Status][Schedule][1hDS]│  ← Quick commands
├─────────────────────────┤
│ > I just did 2h of OS.. │↑ │
└─────────────────────────┘
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Goal Engine** | 3h/day base goal with automatic debt redistribution over 3 days |
| **Penalty Mode** | 2nd consecutive miss → +1h/day penalty for 7 days |
| **AI Chat** | Natural language logging — *"I just did 2 hours of compiler design"* |
| **Markdown Logger** | Write rich study notes in MD, attach them to session logs |
| **Pomodoro Timer** | Stopwatch + countdown presets, auto-logs on stop |
| **Stats Dashboard** | 7-day bar chart, subject breakdown, streak tracker |
| **Debt Schedule** | See exactly what's owed on each future date |
| **Local AI** | Ollama (Llama/Phi3) — your data never leaves your machine |
| **Persistent** | SQLite local DB, always-on-top widget, midnight cron check |

---

## Architecture

```
┌─────────────────── Electron ───────────────────────────────┐
│                                                             │
│  Renderer Process (React + Zustand)                        │
│  ├── ChatInterface   ← AI chat, MD notes attachment        │
│  ├── TimerPanel      ← Stopwatch / countdown               │
│  ├── MarkdownLogger  ← Rich session notes in MD            │
│  └── StatsPanel      ← Charts, streak, debt view          │
│              │  contextBridge (IPC)                        │
│  Main Process (Node.js)                                     │
│  ├── database.js     ← better-sqlite3, all queries         │
│  ├── goalEngine.js   ← State machine, debt/penalty logic   │
│  ├── aiAgent.js      ← LangChain + Ollama, intent router   │
│  ├── ipcHandlers.js  ← All renderer ↔ main bridges        │
│  └── index.js        ← Window, tray, midnight cron         │
│                                                             │
│  Data Layer: SQLite (userData/focus-agent.db)              │
│  AI Layer:   Ollama HTTP (localhost:11434)                  │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `user_state` | Global state (streak breaks, penalty mode, total hours) |
| `daily_ledger` | One row per day — base goal, debt, penalty, completed |
| `debt_queue` | Forward-looking debt assignments to future dates |
| `study_sessions` | Every individual log entry with optional MD notes |
| `chat_messages` | Full AI conversation history (persistent) |
| `penalty_log` | Audit trail of all goal/penalty events |

---

## Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9
- **Ollama** — for AI chat (optional, tool commands work without it)

---

## Setup

### 1. Install Ollama (for AI features)

**macOS:**
```bash
brew install ollama
ollama serve  # keep running in background
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
```

**Windows:** Download from https://ollama.ai/download

### 2. Pull the AI model

```bash
# Recommended — small, fast, good instruction following
ollama pull llama3.2:3b

# Alternative — even smaller for low-RAM machines
ollama pull phi3:mini
```

> **No Ollama?** The app still works fully. All tool commands (log time, check status, view schedule) use rule-based parsing — no LLM needed. Only free-form conversation requires Ollama.

### 3. Install & Run

```bash
# Clone
git clone https://github.com/yourname/focus-agent.git
cd focus-agent

# Install dependencies
npm install

# Rebuild native modules for Electron (REQUIRED for better-sqlite3)
npm run rebuild

# Run in development
npm run dev
```

### 4. Build for Production

```bash
npm run package
# Output in: dist/
# macOS: dist/Focus Agent-1.0.0.dmg
# Windows: dist/Focus Agent Setup 1.0.0.exe
# Linux: dist/Focus Agent-1.0.0.AppImage
```

---

## Usage Guide

### Logging Study Time

Talk to the agent naturally in the **CHAT** tab:

```
"I just did 2 hours of compiler design"
"Completed 90 minutes of DSA"
"Log 1.5h operating systems"
"add 45min for networks"
```

Or use the **LOG** tab to write detailed Markdown notes:
1. Enter subject and duration
2. Write notes using MD (headings, code blocks, tables, checkboxes)
3. Click **Log Session** — notes are stored with the session

### Timer

**TIMER** tab:
- Choose **Stopwatch** (no limit) or **Countdown** (25/45/60/90min)
- Enter subject
- Click **Start** — window stays on top
- Click **Stop & Log** — auto-logs the elapsed time

### Checking Status

```
"show my status"
"how am I doing today"
"how much is left"
"progress"
```

### Viewing Schedule

```
"upcoming schedule"
"show next 7 days"
"what's my plan for the week"
```

---

## Goal Engine Rules

### Base Goal
- **3 hours per day** (configurable in `src/main/goalEngine.js` → `BASE_GOAL_HOURS`)

### Debt Redistribution
When you miss your daily goal:
- Deficit ÷ 3 = added to each of the next 3 days
- Example: Miss by 1.5h → +0.5h/day for next 3 days

### Penalty Mode
Triggered by **2 consecutive misses**:
- +1 extra hour per day for **7 days**
- Shown in red in the progress bar
- Auto-expires, slate cleared after 7 days

### Streak Breaks
Resets to 0 on every missed day. Penalty mode activates at streak breaks ≥ 2.

---

## Customization

Edit `src/main/goalEngine.js` to change core constants:

```javascript
const BASE_GOAL_HOURS = 3.0          // Your daily target (hours)
const DEBT_REDISTRIBUTION_DAYS = 3   // Spread deficit over N days
const PENALTY_DURATION_DAYS = 7      // How long penalty lasts
const PENALTY_EXTRA_HOURS = 1.0      // Extra hours during penalty
```

Change AI model in `src/main/aiAgent.js`:
```javascript
const MAIN_MODEL = 'llama3.2:3b'   // Or 'mistral', 'phi3:mini', etc.
```

---

## AI Commands Reference

| Intent | Example |
|--------|---------|
| Log time | `"I just did 2h of DSA"` |
| Log time (minutes) | `"45 minutes of OS"` |
| Check status | `"show my status"`, `"how am I doing"` |
| View schedule | `"upcoming schedule"`, `"next 7 days"` |
| Free conversation | Anything else (requires Ollama) |

---

## Troubleshooting

**`better-sqlite3` fails to load:**
```bash
npm run rebuild
# This recompiles the native module for your Electron version
```

**"Ollama not detected" warning:**
```bash
# Make sure Ollama is running:
ollama serve
# Then restart the app
```

**App won't start (blank screen):**
```bash
npm run dev
# Check console output for errors
```

**SQLite database location:**
- **macOS:** `~/Library/Application Support/focus-agent/focus-agent.db`
- **Windows:** `%APPDATA%\focus-agent\focus-agent.db`
- **Linux:** `~/.config/focus-agent/focus-agent.db`

---

## Project Structure

```
focus-agent/
├── src/
│   ├── main/
│   │   ├── index.js          # Electron main process
│   │   ├── database.js       # SQLite queries (better-sqlite3)
│   │   ├── goalEngine.js     # Goal/penalty state machine
│   │   ├── aiAgent.js        # LangChain + Ollama AI agent
│   │   └── ipcHandlers.js    # All IPC channel handlers
│   ├── preload/
│   │   └── index.js          # Context bridge (secure API)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.jsx       # React entry
│           ├── App.jsx        # Root component
│           ├── store/
│           │   └── useStore.js  # Zustand state
│           ├── components/
│           │   ├── TitleBar.jsx
│           │   ├── TabBar.jsx
│           │   ├── GoalBanner.jsx
│           │   ├── NotificationToast.jsx
│           │   ├── ChatInterface.jsx   # AI chat + MD notes
│           │   ├── TimerPanel.jsx      # Stopwatch / countdown
│           │   ├── MarkdownLogger.jsx  # Direct MD session log
│           │   └── StatsPanel.jsx      # Analytics dashboard
│           └── styles/
│               └── globals.css
├── electron.vite.config.mjs
├── package.json
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 31 |
| Frontend | React 18 + Zustand |
| Build | electron-vite + Vite |
| Backend logic | Node.js (Main Process) |
| Database | better-sqlite3 (SQLite) |
| AI Framework | LangChain.js |
| AI Model | Ollama (Llama 3.2 / Phi-3) |
| Markdown | react-markdown + remark-gfm |
| Scheduling | node-cron |
| Date utils | date-fns |

---

*Built following the System Design Document: AI-Powered Focus & Study Agent v1.0*
