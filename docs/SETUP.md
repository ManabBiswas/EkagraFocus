# Setup Instructions

## Prerequisites

- Node.js 18+
- npm 9+
- Git

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ManabBiswas/EkagraFocus.git
cd EkagraFocus
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables (Optional)

```bash
cp .env.example .env
```

Edit `.env` to configure optional settings:
- **LLM_MODEL_PATH**: Path to a local GGUF model file (for advanced users)
- **OLLAMA_HOST**: Ollama server endpoint if using Ollama instead of embedded LLM

**Note:** EkagraFocus works **offline by default** without configuration. Set these only if you want to use a specific local model.

### 4. Run Development Server

```bash
npm start
```

The application will launch automatically with hot-reload enabled.

### 5. Build for Production

```bash
# Create platform-specific distributables
npm run make

# Or just create the package
npm run package
```

### 6. Validate Code

```bash
npm run lint
```

## Development Workflow

### Running in Development

```bash
npm start
```

- **Hot Reload**: Changes auto-refresh without restarting
- **DevTools**: Press `Ctrl+Shift+I` to open developer console
- **Logs**: Check both renderer and main process logs

### Code Quality

```bash
# Check for linting issues
npm run lint

# TypeScript compilation check
npx tsc --noEmit
```

### Building for Specific Platform

```bash
# Windows executable
npm run make

# macOS DMG
npm run make -- --platform=darwin

# Linux packages
npm run make -- --platform=linux
```

## Project Structure

```
src/
├── main/                          # Backend (Electron main process)
│   ├── index.ts                   # Application entry point
│   ├── db/
│   │   ├── database.ts            # SQLite schema initialization
│   │   └── queries.ts             # Type-safe database queries
│   ├── handlers/
│   │   └── ipcHandlers.ts         # IPC request handlers
│   └── services/
│       ├── agent.ts               # AI agent orchestration
│       ├── llmService.ts          # LLM integration and inference
│       ├── contextBuilder.ts      # Prompt engineering and context
│       ├── intentExecutor.ts      # Action execution layer
│       ├── goalSystem.ts          # Goal calculations and tracking
│       ├── planParser.ts          # Markdown plan parsing
│       └── messageReceiver.ts     # Message validation
│
├── components/                    # React UI components
│   ├── ChatInterface.tsx          # AI chat panel
│   ├── TimerPanel.tsx             # Pomodoro timer
│   ├── StudyLoggerPanel.tsx       # Manual session logging
│   ├── StatsPanel.tsx             # Analytics dashboard
│   ├── GoalBanner.tsx             # Daily goals
│   ├── MilestoneTracker.tsx       # Achievements
│   ├── WeeklyProgressDashboard    # Weekly analytics
│   └── NotificationToast.tsx      # Notifications
│
├── services/
│   └── renderer/
│       ├── apiClient.ts           # IPC communication
│       └── ipcUtils.ts            # IPC helpers
│
├── types/
│   └── index.ts                   # TypeScript definitions
│
├── utils/                         # Utility functions
│
├── store/
│   └── useStore.ts                # Zustand store
│
├── App.tsx                        # Main React component
├── main.tsx                       # React entry point
├── index.html                     # HTML template
├── preload.ts                     # Preload script
└── index.css                      # Global styles
```

## Troubleshooting

### Port Already in Use

If the dev server fails to start:

```bash
# Find process using the port (usually 3000 for webpack)
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use a different port
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Build Fails

1. Ensure you're using Node 18+:
   ```bash
   node --version
   ```

2. Check TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```

3. Run linter:
   ```bash
   npm run lint
   ```

4. Clear webpack cache:
   ```bash
   rm -rf .webpack
   ```

### LLM/AI Features Not Working

1. Check if embedded model is available
2. If using Ollama, ensure it's running:
   ```bash
   ollama serve
   ```
3. Check logs in developer console (`Ctrl+Shift+I`)

## Available NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start development server |
| `npm run lint` | Run ESLint checks |
| `npm run package` | Create application package |
| `npm run make` | Build production distributables |
| `npm run publish` | Publish builds |

## Environment Variables

Create `.env` file in root (optional):

```bash
# Local LLM model path (optional)
LLM_MODEL_PATH=/path/to/model.gguf

# Ollama server (optional)
OLLAMA_HOST=http://localhost:11434
```

## Database

SQLite database is created automatically on first run at:
- **Windows**: `%APPDATA%/EkagraFocus/database.db`
- **macOS**: `~/Library/Application Support/EkagraFocus/database.db`
- **Linux**: `~/.config/EkagraFocus/database.db`

To reset database, delete this file and restart the app.

## Performance Tips

1. **Use embedded LLM**: Faster than Ollama for small models
2. **Close unnecessary tabs**: Free up memory for LLM
3. **Regular database cleanup**: Remove old sessions periodically
4. **Update dependencies**: Keep npm packages current

## Security

- **Never commit `.env`** - It contains sensitive data (covered by .gitignore)
- **Keep dependencies updated**: Run `npm audit` regularly
- **Use strong passwords**: If syncing data externally
- **Review LLM prompts**: Ensure no sensitive data in context

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style requirements

## Further Documentation

- **Architecture**: See [Architecture.md](./Architecture.md)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Code of Conduct**: See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
