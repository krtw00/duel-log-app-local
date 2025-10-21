import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { Database } from './database'

let mainWindow: BrowserWindow | null = null
let database: Database

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    },
    autoHideMenuBar: true,
    title: 'Duel Log App'
  })

  // In development, Vite dev server URL is set by vite-plugin-electron
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialize database
function initDatabase() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'duel-log.db')
  database = new Database(dbPath)
  console.log('Database initialized at:', dbPath)
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
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

// Statistics operations
ipcMain.handle('statistics:getDashboard', async (_, year, month, gameMode) => {
  return database.getDashboardStatistics(year, month, gameMode)
})

ipcMain.handle('statistics:getMonthly', async (_, year, month, gameMode) => {
  return database.getMonthlyStatistics(year, month, gameMode)
})

ipcMain.handle('statistics:getMonthlyDeckDistribution', async (_, year, month, gameMode) => {
  return database.getMonthlyDeckDistribution(year, month, gameMode)
})

ipcMain.handle('statistics:getRecentDeckDistribution', async (_, gameMode, limit) => {
  return database.getRecentDeckDistribution(gameMode, limit)
})

ipcMain.handle('statistics:getDeckWinRates', async (_, year, month, gameMode) => {
  return database.getDeckWinRates(year, month, gameMode)
})

ipcMain.handle('statistics:getTimeSeries', async (_, year, month, gameMode) => {
  return database.getTimeSeriesStatistics(year, month, gameMode)
})

ipcMain.handle('statistics:getMatchupWinrates', async (_, year, month, gameMode) => {
  return database.getMatchupWinrates(year, month, gameMode)
})
