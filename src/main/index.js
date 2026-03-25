// src/main/index.js
// Electron Main Process — entry point

import { app, BrowserWindow, Tray, Menu, nativeImage, shell, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './database.js'
import { runDailyCheck } from './goalEngine.js'
import { registerIpcHandlers } from './ipcHandlers.js'
import cron from 'node-cron'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL

let mainWindow = null
let tray = null

// ── SINGLE INSTANCE LOCK ──────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ── WINDOW ────────────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 360,
    minHeight: 480,
    maxWidth: 560,
    frame: false,
    backgroundColor: '#0c0c0f',
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    roundedCorners: true
  })

  mainWindow.once('ready-to-show', () => {
    // Position bottom-right of primary display
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
    const [ww, wh] = mainWindow.getSize()
    mainWindow.setPosition(sw - ww - 20, sh - wh - 20)
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
  return mainWindow
}

// ── SYSTEM TRAY ───────────────────────────────────────────────────────────────

function createTray() {
  try {
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)
    const menu = Menu.buildFromTemplate([
      { label: 'Show Focus Agent', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { label: 'Hide', click: () => mainWindow?.hide() },
      { type: 'separator' },
      { label: 'Always on Top', type: 'checkbox', checked: true,
        click: (item) => mainWindow?.setAlwaysOnTop(item.checked) },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
    tray.setToolTip('Focus Agent')
    tray.setContextMenu(menu)
    tray.on('double-click', () =>
      mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show()
    )
  } catch (e) {
    console.warn('[Tray] Could not create tray icon:', e.message)
  }
}

// ── MIDNIGHT CRON ─────────────────────────────────────────────────────────────

function setupDailyCron() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Midnight — running daily check')
    try {
      const status = await runDailyCheck()
      if (mainWindow) {
        mainWindow.webContents.send('status:updated', status)
        mainWindow.webContents.send('notification', {
          type: 'info',
          message: `New day! Today's goal: ${status.totalGoal.toFixed(1)}h`
        })
      }
    } catch (err) {
      console.error('[Cron] Error:', err)
    }
  })
}

// ── APP LIFECYCLE ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Init database
  try { initDatabase() } catch (e) { console.error('[Main] DB error:', e) }

  // Run startup daily check
  try { await runDailyCheck() } catch (e) { console.error('[Main] Check error:', e) }

  // Create window & register handlers
  const win = createMainWindow()
  registerIpcHandlers(win)

  // Tray (production only)
  if (!isDev) createTray()

  // Midnight cron
  setupDailyCron()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createMainWindow()
      registerIpcHandlers(w)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
