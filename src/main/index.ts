import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, seedDatabase } from './db/database';
import { setupAllHandlers } from './handlers/ipcHandlers';

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
      enableRemoteModule: false,
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
  closeDatabase();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─────────────────────────────────────────────────────────────
// FILE OPERATIONS (IPC Handlers)
// ─────────────────────────────────────────────────────────────

ipcMain.handle('import-plan-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      fileName: path.basename(filePath),
      content,
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('read-plan-file', async (event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      fileName: path.basename(filePath),
      content,
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

// ─────────────────────────────────────────────────────────────
// AI OPERATIONS (Will be implemented in Day 5)
// ─────────────────────────────────────────────────────────────

/**
 * Handler for agent messages
 * Will integrate with Context Builder + Intent Executor in Day 5
 */
ipcMain.handle('agent:sendMessage', async (event, message: string) => {
  try {
    console.log('Received message:', message);
    // TODO: Day 5 - Integrate Message Receiver → Context Builder → AI → Intent Executor

    return {
      success: true,
      data: {
        action: 'ask_clarification',
        data: {},
        reply: 'Agent pipeline not yet implemented. Coming in Day 5.',
      },
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: 'Failed to process message',
    };
  }
});

ipcMain.handle('agent:getTodayContext', async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { getFullContext } = await import('./db/queries');
    const context = getFullContext(today);
    return { success: true, data: context };
  } catch (error) {
    console.error('Error getting context:', error);
    return { success: false, error: 'Failed to get context' };
  }
});

console.log('Main process initialized');
