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

console.log('Main process initialized');
