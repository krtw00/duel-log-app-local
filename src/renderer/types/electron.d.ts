// TypeScript definitions for Electron API exposed via preload script

export interface ElectronAPI {
  user: {
    get: () => Promise<any>
    update: (userData: any) => Promise<any>
  }
  decks: {
    getAll: () => Promise<any[]>
    create: (deckData: any) => Promise<any>
    update: (id: number, deckData: any) => Promise<any>
    delete: (id: number) => Promise<any>
    archive: () => Promise<any>
  }
  duels: {
    getAll: (filters?: any) => Promise<any[]>
    getById: (id: number) => Promise<any>
    create: (duelData: any) => Promise<any>
    update: (id: number, duelData: any) => Promise<any>
    delete: (id: number) => Promise<any>
    import: (duelsData: any[]) => Promise<any>
    export: () => Promise<any[]>
  }
  statistics: {
    getDashboard: (year: number, month: number, gameMode: string) => Promise<any>
    getMonthly: (year: number, month: number, gameMode: string) => Promise<any>
    getMonthlyDeckDistribution: (year: number, month: number, gameMode: string) => Promise<any>
    getRecentDeckDistribution: (gameMode: string, limit: number) => Promise<any>
    getDeckWinRates: (year: number, month: number, gameMode: string) => Promise<any>
    getTimeSeries: (year: number, month: number, gameMode: string) => Promise<any>
    getMatchupWinrates: (year: number, month: number, gameMode: string) => Promise<any>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
