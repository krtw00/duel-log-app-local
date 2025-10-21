// API service layer that wraps Electron IPC calls
import { useNotificationStore } from '@/stores/notification'
import { useLoadingStore } from '@/stores/loading'

// Generic API wrapper that handles loading and error notifications
async function apiCall<T>(
  operation: () => Promise<T>,
  options?: {
    showLoading?: boolean
    showErrorNotification?: boolean
    loadingTaskId?: string
  }
): Promise<T> {
  const {
    showLoading = false,
    showErrorNotification = true,
    loadingTaskId = 'global'
  } = options || {}

  const loadingStore = useLoadingStore()
  const notificationStore = useNotificationStore()

  try {
    if (showLoading) {
      loadingStore.start(loadingTaskId)
    }

    const result = await operation()
    return result
  } catch (error: any) {
    if (showErrorNotification) {
      const message = error?.message || 'An error occurred'
      notificationStore.error(message)
    }
    throw error
  } finally {
    if (showLoading) {
      loadingStore.stop(loadingTaskId)
    }
  }
}

// User API
export const userAPI = {
  get: () => apiCall(() => window.electronAPI.user.get()),
  update: (userData: any) => apiCall(() => window.electronAPI.user.update(userData))
}

// Deck API
export const deckAPI = {
  getAll: () => apiCall(() => window.electronAPI.decks.getAll()),
  create: (deckData: any) => apiCall(() => window.electronAPI.decks.create(deckData)),
  update: (id: number, deckData: any) =>
    apiCall(() => window.electronAPI.decks.update(id, deckData)),
  delete: (id: number) => apiCall(() => window.electronAPI.decks.delete(id)),
  archive: () => apiCall(() => window.electronAPI.decks.archive())
}

// Duel API
export const duelAPI = {
  getAll: (filters?: any) => apiCall(() => window.electronAPI.duels.getAll(filters)),
  getById: (id: number) => apiCall(() => window.electronAPI.duels.getById(id)),
  create: (duelData: any) => apiCall(() => window.electronAPI.duels.create(duelData)),
  update: (id: number, duelData: any) =>
    apiCall(() => window.electronAPI.duels.update(id, duelData)),
  delete: (id: number) => apiCall(() => window.electronAPI.duels.delete(id)),
  import: (duelsData: any[]) => apiCall(() => window.electronAPI.duels.import(duelsData)),
  export: () => apiCall(() => window.electronAPI.duels.export())
}

// Statistics API
export const statisticsAPI = {
  getDashboard: (year: number, month: number, gameMode: string) =>
    apiCall(() => window.electronAPI.statistics.getDashboard(year, month, gameMode)),
  getMonthly: (year: number, month: number, gameMode: string) =>
    apiCall(() => window.electronAPI.statistics.getMonthly(year, month, gameMode)),
  getMonthlyDeckDistribution: (year: number, month: number, gameMode: string) =>
    apiCall(() =>
      window.electronAPI.statistics.getMonthlyDeckDistribution(year, month, gameMode)
    ),
  getRecentDeckDistribution: (gameMode: string, limit: number = 30) =>
    apiCall(() => window.electronAPI.statistics.getRecentDeckDistribution(gameMode, limit)),
  getDeckWinRates: (year: number, month: number, gameMode: string) =>
    apiCall(() => window.electronAPI.statistics.getDeckWinRates(year, month, gameMode)),
  getTimeSeries: (year: number, month: number, gameMode: string) =>
    apiCall(() => window.electronAPI.statistics.getTimeSeries(year, month, gameMode)),
  getMatchupWinrates: (year: number, month: number, gameMode: string) =>
    apiCall(() => window.electronAPI.statistics.getMatchupWinrates(year, month, gameMode))
}
