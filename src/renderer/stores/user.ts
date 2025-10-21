import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface User {
  id: number
  username: string
  streamer_mode: number
  theme_preference: string
  created_at: string
  updated_at: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const localStreamerMode = ref<boolean>(false)

  const fetchUser = async () => {
    try {
      const userData = await window.electronAPI.user.get()
      user.value = userData as User
      localStreamerMode.value = Boolean(userData.streamer_mode)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await window.electronAPI.user.update(userData)
      user.value = updatedUser as User
      if (userData.streamer_mode !== undefined) {
        localStreamerMode.value = Boolean(userData.streamer_mode)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      throw error
    }
  }

  const toggleStreamerMode = async (enabled: boolean) => {
    localStreamerMode.value = enabled
    if (user.value) {
      try {
        await updateUser({ streamer_mode: enabled ? 1 : 0 } as any)
      } catch (error) {
        // Revert on error
        localStreamerMode.value = !enabled
        throw error
      }
    }
  }

  return {
    user,
    localStreamerMode,
    fetchUser,
    updateUser,
    toggleStreamerMode
  }
})
