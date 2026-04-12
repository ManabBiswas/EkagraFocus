import { app, BrowserWindow } from 'electron';
import * as dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, seedDatabase } from './db/database';
import { setupAllHandlers } from './handlers/ipcHandlers';
import { llmService } from './services/llmService';

// Load environment variables
dotenv.config();

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle squirrel installer events only for packaged Windows builds.
// In development, this guard can cause the app to quit before `ready`.
if (app.isPackaged && require('electron-squirrel-startup')) {
  console.log('[Main] Squirrel startup event detected, quitting packaged app process');
  app.quit();
}

// Global window reference
let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    title: 'EkagraFocus',
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    console.log('[Main] Window ready and shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('[Main] Window closed');
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('[Main] Renderer failed to load:', code, description);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Renderer process gone:', details.reason);
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

const bootstrap = (): void => {
  console.log('[Main] Bootstrap started');

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

  console.log('[Main] App initialized');
};

// ─────────────────────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  console.log('[Main] app.whenReady resolved');
  bootstrap();
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

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});
