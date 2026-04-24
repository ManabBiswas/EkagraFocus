# EkagraFocus Architecture

## System Overview

EkagraFocus is a local-first Electron desktop application that combines AI-powered scheduling with comprehensive study analytics. All processing happens locally, with data stored in an embedded SQLite database.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Renderer Process (React UI)                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  • ChatInterface - AI chat panel                     │   │
│  │  • TimerPanel - Pomodoro timer                       │   │
│  │  • StatsPanel - Analytics dashboard                 │   │
│  │  • GoalBanner - Daily goals display                 │   │
│  │  • MilestoneTracker - Progress tracking             │   │
│  │  • WeeklyProgressDashboard - Weekly analytics       │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ▲                                  │
│                            │ IPC Messages                     │
│                            ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Main Process (Node.js Backend)              │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         IPC Handlers                        │  │   │
│  │  │  • Database operations                      │  │   │
│  │  │  • LLM inference requests                   │  │   │
│  │  │  • File operations                          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                     ▲                              │   │
│  │                     │                              │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         Service Layer                       │  │   │
│  │  ├──────────────────────────────────────────────┤  │   │
│  │  │  • Agent Service - Orchestration            │  │   │
│  │  │  • LLM Service - Model inference            │  │   │
│  │  │  • Context Builder - Prompt engineering     │  │   │
│  │  │  • Goal System - Goal calculations          │  │   │
│  │  │  • Plan Parser - Markdown parsing           │  │   │
│  │  │  • Message Receiver - Input validation      │  │   │
│  │  │  • Intent Executor - Action execution       │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                     ▲                              │   │
│  │                     │                              │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         Data Layer                          │  │   │
│  │  ├──────────────────────────────────────────────┤  │   │
│  │  │  • SQLite Database                          │  │   │
│  │  │    - Sessions table                         │  │   │
│  │  │    - Goals table                            │  │   │
│  │  │    - Tasks table                            │  │   │
│  │  │    - Notes table                            │  │   │
│  │  │    - Statistics table                       │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
        ▲                              ▲
        │                              │
        │ Local Models                 │ User Data
        │ (GGUF)                       │ (Local Storage)
        │                              │
    ┌───┴────────┐             ┌──────┴──────┐
    │  Ollama    │             │   SQLite    │
    │ (Optional) │             │  Database   │
    └────────────┘             └─────────────┘
```

## Core Components

### 1. **Frontend (React)**

**Components:**
- `ChatInterface` - Real-time AI chat for study planning
- `TimerPanel` - Pomodoro timer with session tracking
- `StatsPanel` - Real-time analytics and progress visualization
- `GoalBanner` - Daily goals with completion status
- `MilestoneTracker` - Achievement and milestone tracking
- `WeeklyProgressDashboard` - Weekly analytics with charts
- `TabBar` - Navigation between features
- `NotificationToast` - User notifications

**State Management:**
- Zustand store for global state
- Component-level state for UI interactions

### 2. **Backend Services**

#### Agent Service (`agent.ts`)
**Orchestrates the AI pipeline:**
- Receives user messages via IPC
- Passes to context builder for context enrichment
- Sends to LLM service for inference
- Routes result to intent executor
- Returns response to renderer

**Flow:**
```
Message → Context → LLM → Intent Executor → Result
```

#### LLM Service (`llmService.ts`)
**Manages model inference with fallback strategy:**
1. **Embedded LLM** (node-llama-cpp) - Primary
2. **Ollama** - Secondary if local model unavailable
3. **Pattern Matching** - Tertiary fallback

**Methods:**
- `initialize()` - Load model on startup
- `query()` - Run inference
- `isInitialized()` - Check model status
- `shutdown()` - Cleanup on exit

#### Context Builder (`contextBuilder.ts`)
**Constructs intelligent prompts:**
- Retrieves user's recent sessions
- Fetches current goals and tasks
- Gathers statistics for personalization
- Formats comprehensive prompt context

#### Goal System (`goalSystem.ts`)
**Manages daily study goals:**
- Tracks goal completion
- Calculates daily debt carryover
- Applies penalties for missed goals
- Computes goal completion streaks

#### Plan Parser (`planParser.ts`)
**Parses markdown study plans:**
- Converts markdown to structured tasks
- Validates task format
- Categorizes by subject/difficulty
- Enables plan import feature

### 3. **Data Layer**

**SQLite Database Schema:**

```sql
-- Sessions: Individual study sessions
Sessions (
  id, subject, duration, notes, timestamp, quality_score
)

-- Goals: Daily study goals
Goals (
  id, date, target_minutes, completed_minutes, status
)

-- Tasks: Study tasks/assignments
Tasks (
  id, title, description, subject, deadline, status
)

-- Notes: Study notes
Notes (
  id, title, content, subject, timestamp, tags
)

-- Statistics: Aggregated performance data
Statistics (
  id, date, total_sessions, total_minutes, avg_quality
)
```

### 4. **IPC Communication**

**Main → Renderer:**
- `chat-response` - AI response data
- `session-logged` - Session recorded confirmation
- `stats-updated` - Updated analytics
- `goal-updated` - Goal status change

**Renderer → Main:**
- `chat-message` - Send message to AI
- `log-session` - Record study session
- `get-stats` - Fetch analytics
- `update-goal` - Modify goal

## Data Flow Examples

### Example 1: Chat with AI

```
1. User types message in ChatInterface
2. React component sends via IPC: ipcRenderer.invoke('chat-message', msg)
3. Main process receives in ipcHandlers
4. Passes to Agent.execute()
5. Agent.execute():
   - Calls contextBuilder.build() for context
   - Calls llmService.query(prompt)
   - LLM processes and returns response
   - Calls intentExecutor.execute() if action needed
   - Returns full response
6. Main sends back via 'chat-response'
7. React receives and updates UI
```

### Example 2: Session Logging

```
1. Timer completes or user logs session manually
2. StudyLoggerPanel sends session data via IPC
3. Main process receives 'log-session'
4. Database queries.ts records to Sessions table
5. Goal system updates daily goal progress
6. Stats recalculated and aggregated
7. Main sends 'session-logged' confirmation
8. React updates StatsPanel in real-time
```

### Example 3: Plan Import

```
1. User uploads markdown file
2. React reads file and sends via IPC
3. Plan parser processes markdown
4. Extracts tasks and metadata
5. Database stores tasks
6. Returns parsed structure
7. React displays for review/confirmation
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI components and state |
| **Styling** | Tailwind CSS 4 | Responsive styling |
| **State** | Zustand 5 | Global state management |
| **Desktop** | Electron 41 | Cross-platform desktop app |
| **Backend** | Node.js | Main process logic |
| **Language** | TypeScript 5.1 | Type safety |
| **Bundler** | Webpack + Forge | Code bundling |
| **Database** | SQLite 3 | Local data storage |
| **LLM** | node-llama-cpp | Embedded inference |
| **AI Fallback** | Ollama | Optional local LLM |
| **Styling** | Tailwind CSS | Responsive UI |

## Key Design Principles

### 1. **Privacy First**
- All data stays on user's device
- No cloud storage or sync
- No external API calls required
- SQLite for local persistence

### 2. **Offline Capability**
- Works without internet
- Local LLM for AI features
- Optional Ollama for advanced models
- Fallback to pattern matching if no LLM

### 3. **Modular Architecture**
- Service layer separates concerns
- Easy to test individual services
- Clear data flow
- Extensible design

### 4. **Performance**
- Embedded SQLite for fast queries
- Local LLM runs efficiently
- Responsive UI with Zustand
- Lazy loading of components

## Extension Points

### Adding New Features

1. **New Service**: Create in `src/main/services/`
2. **New IPC Handler**: Add to `ipcHandlers.ts`
3. **New Component**: Create in `src/components/`
4. **New Database Table**: Update `database.ts` and `queries.ts`

### Custom LLM Models

1. Place GGUF model file
2. Set `LLM_MODEL_PATH` in `.env`
3. Restart app - will use custom model

### Ollama Integration

1. Run Ollama server locally
2. Set `OLLAMA_HOST` in `.env`
3. App auto-detects and uses Ollama

## Performance Considerations

- SQLite queries indexed on frequent lookups
- LLM requests cached when possible
- React components memoized to prevent re-renders
- IPC messages batched for efficiency
- Database connections pooled

## Security Considerations

- No eval() or dynamic code execution
- SQL injection prevented via parameterized queries
- File operations restricted to app directory
- API inputs validated before processing
- Secrets never logged or exposed

