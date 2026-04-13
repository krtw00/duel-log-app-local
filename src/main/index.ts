import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { Database } from './database'

// Disable GPU hardware acceleration to reduce GPU usage
// This must be called before app is ready
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let database: Database
let logFilePath: string | null = null

function formatError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`.trim()
  }
  return String(error)
}

function writeLog(level: 'INFO' | 'ERROR' | 'WARN', message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  const detail = error ? `\n${formatError(error)}` : ''
  const line = `[${timestamp}] [${level}] ${message}${detail}\n`

  if (level === 'ERROR') {
    console.error(message, error)
  } else if (level === 'WARN') {
    console.warn(message, error)
  } else {
    console.log(message, error ?? '')
  }

  if (!logFilePath) return

  try {
    fs.appendFileSync(logFilePath, line, 'utf-8')
  } catch (writeError) {
    console.error('Failed to write startup log', writeError)
  }
}

function initLogging() {
  const logsPath = app.getPath('logs')
  fs.mkdirSync(logsPath, { recursive: true })
  logFilePath = path.join(logsPath, 'main.log')
  writeLog('INFO', `Startup log initialized at ${logFilePath}`)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    },
    autoHideMenuBar: true,
    title: 'Duel Log App'
  })

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
    writeLog('INFO', 'Main window shown')
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    writeLog('ERROR', `Renderer failed to load (${errorCode}) ${validatedURL}: ${errorDescription}`)
  })

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    writeLog('ERROR', `Renderer process gone: ${details.reason}`)
  })

  // In development, Vite dev server URL is set by vite-plugin-electron
  if (process.env.VITE_DEV_SERVER_URL) {
    writeLog('INFO', `Loading renderer from dev server: ${process.env.VITE_DEV_SERVER_URL}`)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode - load from built files
    const indexPath = path.join(__dirname, '../../dist/index.html')
    writeLog('INFO', `Loading renderer from file: ${indexPath}`)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on('closed', () => {
    writeLog('INFO', 'Main window closed')
    mainWindow = null
  })
}

// Initialize database
function initDatabase() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'duel-log.db')
  writeLog('INFO', `Initializing database at ${dbPath}`)
  database = new Database(dbPath)
  writeLog('INFO', `Database initialized at ${dbPath}`)
}

// App lifecycle
process.on('uncaughtException', (error) => {
  writeLog('ERROR', 'Uncaught exception in main process', error)
  if (app.isReady()) {
    dialog.showErrorBox('Duel Log App startup error', formatError(error))
  }
})

process.on('unhandledRejection', (reason) => {
  writeLog('ERROR', 'Unhandled rejection in main process', reason)
})

app.whenReady().then(() => {
  initLogging()
  writeLog('INFO', 'Application is ready')
  initDatabase()
  createWindow()

  app.on('activate', () => {
    writeLog('INFO', 'App activated')
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((error) => {
  writeLog('ERROR', 'Startup failed before window creation', error)
  dialog.showErrorBox('Duel Log App startup error', formatError(error))
  app.exit(1)
})

app.on('window-all-closed', () => {
  writeLog('INFO', 'All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  writeLog('INFO', 'Application is quitting')
  if (database) {
    database.close()
  }
})

// IPC Handlers

// User operations
ipcMain.handle('user:get', async () => {
  return database.getUser()
})

ipcMain.handle('user:update', async (_, userData) => {
  return database.updateUser(userData)
})

// Deck operations
ipcMain.handle('decks:getAll', async () => {
  return database.getAllDecks()
})

ipcMain.handle('decks:create', async (_, deckData) => {
  return database.createDeck(deckData)
})

ipcMain.handle('decks:update', async (_, id, deckData) => {
  return database.updateDeck(id, deckData)
})

ipcMain.handle('decks:delete', async (_, id) => {
  return database.deleteDeck(id)
})

ipcMain.handle('decks:archive', async () => {
  return database.archiveAllDecks()
})

// Duel operations
ipcMain.handle('duels:getAll', async (_, filters) => {
  return database.getAllDuels(filters)
})

ipcMain.handle('duels:getById', async (_, id) => {
  return database.getDuelById(id)
})

ipcMain.handle('duels:create', async (_, duelData) => {
  return database.createDuel(duelData)
})

ipcMain.handle('duels:update', async (_, id, duelData) => {
  return database.updateDuel(id, duelData)
})

ipcMain.handle('duels:delete', async (_, id) => {
  return database.deleteDuel(id)
})

ipcMain.handle('duels:import', async (_, duelsData) => {
  return database.importDuels(duelsData)
})

ipcMain.handle('duels:export', async () => {
  return database.exportDuels()
})

// CSV Export
ipcMain.handle('duels:exportCSV', async (_, year?: number, month?: number, gameMode?: string, columns?: string[]) => {
  if (!mainWindow) return { success: false, error: 'ウィンドウが見つかりません' }

  try {
    // デフォルトファイル名を年月で生成
    const yearStr = year || new Date().getFullYear()
    const monthStr = month ? String(month).padStart(2, '0') : new Date().toISOString().split('T')[0].slice(5, 7)
    const defaultFileName = `duels_${yearStr}${monthStr}.csv`

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'CSVファイルをエクスポート',
      defaultPath: defaultFileName,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (!filePath) {
      return { success: false, cancelled: true }
    }

    const csvContent = database.exportDuelsToCSV(year, month, gameMode, columns)
    fs.writeFileSync(filePath, csvContent, 'utf-8')

    return { success: true, filePath }
  } catch (error: any) {
    console.error('CSV export error:', error)
    return { success: false, error: error.message }
  }
})

// CSV Import
ipcMain.handle('duels:importCSV', async () => {
  if (!mainWindow) return { success: false, error: 'ウィンドウが見つかりません' }

  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'CSVファイルをインポート',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    })

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const csvContent = fs.readFileSync(filePaths[0], 'utf-8')
    const result = database.importDuelsFromCSV(csvContent)

    return { ...result, success: true }
  } catch (error: any) {
    console.error('CSV import error:', error)
    return { success: false, error: error.message }
  }
})

// Statistics operations
ipcMain.handle('statistics:getDashboard', async (_, year, month, gameMode) => {
  return database.getDashboardStatistics(year, month, gameMode)
})

ipcMain.handle('statistics:getMonthly', async (_, year, month, gameMode, options) => {
  return database.getMonthlyStatistics(year, month, gameMode, options)
})

ipcMain.handle(
  'statistics:getMonthlyDeckDistribution',
  async (_, year, month, gameMode, options) => {
    return database.getMonthlyDeckDistribution(year, month, gameMode, options)
  }
)

ipcMain.handle('statistics:getRecentDeckDistribution', async (_, gameMode, limit, options) => {
  return database.getRecentDeckDistribution(gameMode, limit, options)
})

ipcMain.handle('statistics:getDeckWinRates', async (_, year, month, gameMode, options) => {
  return database.getDeckWinRates(year, month, gameMode, options)
})

ipcMain.handle('statistics:getTimeSeries', async (_, year, month, gameMode, options) => {
  return database.getMonthlyTimeSeriesStatistics(year, month, gameMode, options)
})

ipcMain.handle('statistics:getMatchupWinrates', async (_, year, month, gameMode, options) => {
  return database.getMatchupWinrates(year, month, gameMode, options)
})

ipcMain.handle('statistics:getAvailableDecks', async (_, year, month, gameMode, options) => {
  return database.getAvailableDecks(year, month, gameMode, options)
})
