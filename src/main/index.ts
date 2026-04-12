import { app, BrowserWindow } from 'electron';
import * as dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, seedDatabase } from './db/database';
import { setupAllHandlers } from './handlers/ipcHandlers';
import { llmService } from './services/llmService';

// Load environment variables
dotenv.config();

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle squirrel installer on Windows
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global window reference
let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

// ─────────────────────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────────────────────

app.on('ready', () => {
  // Initialize database
  initializeDatabase();
  seedDatabase();

  // Setup IPC handlers (database + task operations)
  setupAllHandlers();

  // Initialize embedded LLM if model path is configured.
  llmService
    .initialize({
      modelPath: process.env.LLM_MODEL_PATH,
      nThreads: 4,
    })
    .then((loaded) => {
      if (!loaded) {
        console.log('[Main] Embedded LLM unavailable, using fallback modes');
      }
    })
    .catch((error) => {
      console.log('[Main] LLM init failed, fallback will be used:', error);
    });

  // Create main window
  createWindow();

  console.log('App initialized');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});

app.on('before-quit', () => {
  llmService.shutdown().catch(() => {
    // ignore shutdown errors during quit
  });
  closeDatabase();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log('Main process initialized');
