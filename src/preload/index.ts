import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // User operations
  user: {
    get: () => ipcRenderer.invoke('user:get'),
    update: (userData: any) => ipcRenderer.invoke('user:update', userData)
  },

  // Deck operations
  decks: {
    getAll: () => ipcRenderer.invoke('decks:getAll'),
    create: (deckData: any) => ipcRenderer.invoke('decks:create', deckData),
    update: (id: number, deckData: any) => ipcRenderer.invoke('decks:update', id, deckData),
    delete: (id: number) => ipcRenderer.invoke('decks:delete', id),
    archive: () => ipcRenderer.invoke('decks:archive')
  },

  // Duel operations
  duels: {
    getAll: (filters?: any) => ipcRenderer.invoke('duels:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('duels:getById', id),
    create: (duelData: any) => ipcRenderer.invoke('duels:create', duelData),
    update: (id: number, duelData: any) => ipcRenderer.invoke('duels:update', id, duelData),
    delete: (id: number) => ipcRenderer.invoke('duels:delete', id),
    import: (duelsData: any[]) => ipcRenderer.invoke('duels:import', duelsData),
    export: () => ipcRenderer.invoke('duels:export'),
    exportCSV: (year?: number, month?: number, gameMode?: string, columns?: string[]) =>
      ipcRenderer.invoke('duels:exportCSV', year, month, gameMode, columns),
    importCSV: () => ipcRenderer.invoke('duels:importCSV')
  },

  // Statistics operations
  statistics: {
    getDashboard: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getDashboard', year, month, gameMode),
    getMonthly: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getMonthly', year, month, gameMode),
    getMonthlyDeckDistribution: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getMonthlyDeckDistribution', year, month, gameMode),
    getRecentDeckDistribution: (gameMode: string, limit: number) =>
      ipcRenderer.invoke('statistics:getRecentDeckDistribution', gameMode, limit),
    getDeckWinRates: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getDeckWinRates', year, month, gameMode),
    getTimeSeries: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getTimeSeries', year, month, gameMode),
    getMatchupWinrates: (year: number, month: number, gameMode: string) =>
      ipcRenderer.invoke('statistics:getMatchupWinrates', year, month, gameMode)
  }
})
