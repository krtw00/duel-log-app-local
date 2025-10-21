import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'

const THEME_STORAGE_KEY = 'theme'
const DEFAULT_THEME = 'dark'

const readStoredTheme = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

const writeStoredTheme = (value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Ignore storage errors
  }
}

const normaliseTheme = (value: string) => (value === 'light' ? 'light' : 'dark')

export const useThemeStore = defineStore('theme', () => {
  const themeName = ref<'customDarkTheme' | 'customLightTheme'>('customDarkTheme')
  const isDark = ref(true)
  const localTheme = ref(readStoredTheme())

  const applyTheme = (theme: string) => {
    const normalised = normaliseTheme(theme)
    isDark.value = normalised === 'dark'
    themeName.value = isDark.value ? 'customDarkTheme' : 'customLightTheme'
    localTheme.value = normalised
  }

  const loadTheme = async () => {
    const userStore = useUserStore()
    await userStore.fetchUser()

    if (userStore.user) {
      applyTheme(userStore.user.theme_preference)
    } else {
      applyTheme(localTheme.value)
    }
  }

  const toggleTheme = async () => {
    const userStore = useUserStore()
    const nextTheme = isDark.value ? 'light' : 'dark'

    if (userStore.user) {
      try {
        await userStore.updateUser({ theme_preference: nextTheme })
        applyTheme(nextTheme)
      } catch (error) {
        console.error('Failed to update theme preference:', error)
      }
    } else {
      applyTheme(nextTheme)
      writeStoredTheme(nextTheme)
    }
  }

  return {
    themeName,
    isDark,
    loadTheme,
    toggleTheme
  }
})
