# 🎯 EkagraFocus

> A local-first, privacy-first desktop study assistant with AI-powered planning, intelligent scheduling, and comprehensive analytics.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron 41](https://img.shields.io/badge/Electron-41-9feaf0)](https://www.electronjs.org/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.1-blue)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)

## 📖 Overview

**EkagraFocus** is a desktop application designed to help students and learners manage their study schedules effectively. Built with privacy and offline functionality in mind, it provides intelligent scheduling recommendations, real-time session tracking, and AI-powered insights without requiring internet connectivity or cloud storage.

All your data stays on your device. All processing happens locally.

### Problem It Solves

- 📌 **Scattered Study Plans**: No unified place to manage tasks, schedules, and sessions
- 🧠 **Manual Planning**: Time-consuming to create and optimize study schedules
- 📊 **No Progress Insights**: Difficulty tracking patterns and measuring productivity
- 🔒 **Privacy Concerns**: Reluctance to use cloud-based study apps
- ⏱️ **Focus Challenges**: Need for integrated timer with smart session logging

## ✨ Core Features

### 1. **AI Study Assistant**
- Chat interface with local AI for study planning advice
- Context-aware schedule analysis
- Natural language task management
- Intelligent recommendations based on your patterns

### 2. **Smart Scheduling**
- Import markdown-formatted study plans
- Automatic task parsing and categorization
- Workload distribution analysis
- Visual weekly view with goal tracking

### 3. **Time Tracking**
- Pomodoro-style focus timer with custom durations
- Manual session logging for non-timer activities
- Automatic session recording to database
- Subject-wise tracking and categorization

### 4. **Study Notes System**
- Create, edit, and organize study notes
- AI-powered summaries and auto-tagging
- Automatic session linking (notes auto-associate with study sessions)
- Markdown preview with rich formatting
- Attachments support for supplementary materials

### 5. **Progress Analytics**
- Real-time statistics dashboard
- Weekly progress visualization
- Subject-wise performance breakdown
- Goal completion tracking with streak analytics
- Daily goal management with workload penalties

### 6. **Goal Management**
- Daily study goals with debt carryover
- Automatic penalty calculations for missed goals
- Goal history and completion rates
- Performance metrics and insights

## 🛠 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | Electron | 41 |
| **Frontend** | React | 19 |
| **Language** | TypeScript | 5.1 |
| **Styling** | Tailwind CSS | 4 |
| **State Management** | Zustand | 5 |
| **Database** | SQLite (better-sqlite3) | Latest |
| **Local AI** | node-llama-cpp | Latest |
| **Build Tool** | Webpack + Electron Forge | Latest |

## 📦 System Requirements

- **OS**: Windows 10+, macOS 10.13+, or Linux (Ubuntu 18.04+)
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **RAM**: 4GB minimum (8GB recommended for smooth AI processing)


## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ManabBiswas/EkagraFocus.git
cd EkagraFocus
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm start
```

The application will launch automatically with hot-reload enabled for development.

### 4. Build for Production

```bash
# Create platform-specific distributables
npm run make

# Or just create the package
npm run package
```

### 5. Validate Code

```bash
npm run lint
```

## 📂 Project Structure

```
EkagraFocus/
├── src/
│   ├── main/                          # Backend (Electron main process)
│   │   ├── index.ts                   # Application entry point
│   │   ├── db/
│   │   │   ├── database.ts            # SQLite schema initialization
│   │   │   └── queries.ts             # Type-safe database queries
│   │   ├── handlers/
│   │   │   └── ipcHandlers.ts         # IPC request handlers
│   │   └── services/
│   │       ├── agent.ts               # AI agent orchestration
│   │       ├── llmService.ts          # LLM integration and inference
│   │       ├── contextBuilder.ts      # Prompt engineering and context
│   │       ├── intentExecutor.ts      # Action execution layer
│   │       ├── goalSystem.ts          # Goal calculations and tracking
│   │       ├── planParser.ts          # Markdown plan parsing
│   │       ├── messageReceiver.ts     # Message validation
│   │       └── messageReceiver.ts     # Session and note management
│   │
│   ├── components/                    # React UI components
│   │   ├── ChatInterface.tsx          # AI chat panel
│   │   ├── TimerPanel.tsx             # Pomodoro timer
│   │   ├── StudyLoggerPanel.tsx       # Manual session logging
│   │   ├── StatsPanel.tsx             # Analytics dashboard
│   │   ├── PlanViewer.tsx             # Study plan display
│   │   ├── GoalBanner.tsx             # Daily goals view
│   │   ├── MilestoneTracker.tsx       # Progress milestones
│   │   ├── NotesPanel.tsx             # Notes management
│   │   ├── TabBar.tsx                 # Navigation tabs
│   │   ├── TitleBar.tsx               # Custom window title bar
│   │   └── ErrorBoundary.tsx          # Error handling component
│   │
│   ├── renderer/
│   │   └── services/
│   │       ├── apiClient.ts           # IPC client wrapper
│   │       └── ipcUtils.ts            # IPC utilities
│   │
│   ├── shared/
│   │   ├── ipc.ts                     # IPC type contracts and handlers
│   │   └── goalConfig.ts              # Shared configuration constants
│   │
│   ├── store/
│   │   └── useStore.ts                # Zustand global state
│   │
│   ├── types/
│   │   └── index.ts                   # Type definitions
│   │
│   ├── utils/
│   │   └── [utility files]
│   │
│   ├── preload.ts                     # IPC bridge (security layer)
│   ├── App.tsx                        # Root React component
│   ├── main.tsx                       # React entry point
│   ├── renderer.ts                    # Renderer process entry
│   ├── index.html                     # HTML template
│   └── index.css                      # Global styles
│
├── docs/
│   ├── guide/                         # Architecture and implementation guides
│   └── opensource guide/              # Contribution and governance docs
│
├── webpack/                           # Webpack configurations
├── package.json                       # Project dependencies
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
└── forge.config.js                    # Electron Forge configuration
```

## 🏗 Architecture

### High-Level Design

```
┌────────────────────────────────────────────────────────────┐
│                    DESKTOP APPLICATION                     │
├────────────────────────────────────────────────────────────┤
│  Renderer Process (React 19 + Zustand + Tailwind CSS)     │
│  - ChatInterface, TimerPanel, StatsPanel, NotesPanel, etc.│
│  - Responsive UI with hot-reload during development       │
└────────────────────────────────────────────────────────────┘
                            ↕ (IPC)
                    [Security Boundary]
                   (contextBridge preload)
                            ↕
┌────────────────────────────────────────────────────────────┐
│                  Main Process (Node.js)                    │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ │
│  │ IPC Handlers (Type-Safe Request/Response)            │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Services Layer                                       │ │
│  │ - Agent (orchestration) - LLM (inference)           │ │
│  │ - Plan Parser - Goal System - Context Builder       │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Database Layer (SQLite + better-sqlite3)            │ │
│  │ - Schema management - Type-safe queries             │ │
│  │ - Transaction support - Foreign key constraints     │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                │
│             [Local File System - SQLite DB]              │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → React Component triggers action
2. **IPC Call** → Component calls preload bridge method
3. **Handler Processing** → Main process receives, validates, processes
4. **Service Logic** → Business logic (AI, parsing, calculations) executes
5. **Database** → Data persisted to SQLite
6. **Response** → Result sent back to renderer with typed data
7. **State Update** → Zustand updates store, component re-renders

## 💻 Development Guide

### Setup Development Environment

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm start

# Open DevTools
OPEN_DEVTOOLS=1 npm start
```

### Code Quality

```bash
# Run linter (ESLint)
npm run lint

# Type checking with TypeScript
npx tsc --noEmit

# Build for validation
npm run build
```

### Common Development Tasks

| Task | Command | Purpose |
|------|---------|---------|
| Start dev server | `npm start` | Run app with hot reload |
| Type check | `npx tsc --noEmit` | Validate TypeScript |
| Lint code | `npm run lint` | Check code style |
| Build package | `npm run package` | Create app bundle |
| Make distributable | `npm run make` | Build platform-specific installers |

### Adding New Features

1. **Backend (Main Process)**
   - Add query/handler in `src/main/db/queries.ts` or service in `src/main/services/`
   - Create IPC handler in `src/main/handlers/ipcHandlers.ts`
   - Add type contract in `src/shared/ipc.ts`

2. **Frontend Bridge**
   - Expose method in `src/preload.ts`
   - Add type definition in `src/index.d.ts`

3. **React Component**
   - Create component in `src/components/`
   - Use `apiClient` to call backend via IPC
   - Update state in Zustand store if needed
   - Add tab routing in `App.tsx`

## 📚 Documentation

For more detailed information, please refer to:

- **[Quick Start Setup](SETUP.md)** - Installation and basic setup
- **[LLM/AI Setup Guide](docs/LLM_SETUP.md)** - Enable AI chat with local models (optional)
- **[Architecture Guide](docs/Architecture.md)** - System design and component overview
- **[Advanced Setup](docs/SETUP.md)** - Development and troubleshooting
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards

### Understanding "No AI Available" Message

If you see `[Agent] No AI available, using enhanced fallback` in the console, this is **normal**:

- ✅ App is working correctly
- ✅ All features work without AI (timer, notes, analytics, goals)
- ✅ Chat uses intelligent pattern matching as fallback
- 🔧 To enable AI, see [LLM Setup Guide](docs/LLM_SETUP.md) (optional)

**EkagraFocus works perfectly fine without setting up a local LLM model!**

## 🤝 Contributing

We welcome contributions from developers of all skill levels. Whether you're interested in frontend, backend, AI, database optimization, or documentation, there's a place for you!

### Getting Started as a Contributor

1. **Star** the repository
2. **Fork** the repository
3. **Clone** your fork locally
4. **Create** a feature branch: `git checkout -b feature/amazing-feature`
5. **Make** your changes with clear commits
6. **Push** to your branch: `git push origin feature/amazing-feature`
7. **Open** a Pull Request with description of changes

### Contribution Guidelines

- **Code Style**: Follow ESLint rules (`npm run lint`)
- **Commit Messages**: Use conventional commits
  - `feat: add new feature`
  - `fix: resolve bug`
  - `docs: update documentation`
  - `refactor: improve code structure`
  - `test: add test cases`

- **Branch Names**: Use descriptive names
  - `feature/new-capability`
  - `fix/issue-description`
  - `docs/topic`
  - `refactor/area`

- **TypeScript**: All code must be typed (strict mode enabled)
- **Testing**: Validate with `npm run lint` before submitting PR

See [Contributing Guidelines](CONTRIBUTING.md) for complete details.

## 🐛 Reporting Issues

Found a bug? Please create an issue with:

1. **Description**: What's the problem?
2. **Steps to Reproduce**: How to trigger it?
3. **Expected Behavior**: What should happen?
4. **Actual Behavior**: What actually happens?
5. **Environment**: OS, Node version, etc.

## 🔒 Security & Privacy

**EkagraFocus** is designed with security and privacy at its core:

- ✅ **All data stays local** - No cloud sync or external servers
- ✅ **No API keys required** - Works offline completely
- ✅ **Encrypted database** - SQLite stores all data securely
- ✅ **No telemetry** - We don't track user behavior
- ✅ **Open source** - Code is transparent and auditable

## 🔗 External Resources

### Learn More

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Tailwind CSS](https://tailwindcss.com/docs)

### AI & LLM Resources

- [node-llama-cpp Documentation](https://github.com/withcatai/node-llama-cpp)
- [Ollama Project](https://ollama.ai/)
- [GGUF Model Format](https://github.com/ggerganov/ggml)

## 🗺 Roadmap

### Current (v1.0)
- ✅ AI chat assistant
- ✅ Schedule management and planning
- ✅ Session logging and tracking
- ✅ Goal management system
- ✅ Analytics dashboard
- ✅ Notes system with AI features

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

This means you are free to:
- Use the software commercially
- Modify the software
- Distribute the software
- Use the software privately

Under the condition that you include a copy of the license and copyright notice.

## 🙏 Acknowledgments

Built with amazing open-source projects:

- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Database
- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) - Local AI inference
- [Electron Forge](https://www.electronforge.io/) - Build tooling

---
