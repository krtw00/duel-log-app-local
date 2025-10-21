<template>
  <v-app-bar elevation="0" class="app-bar">
    <div class="app-bar-glow"></div>

    <v-app-bar-nav-icon class="hidden-md-and-up" @click="$emit('toggle-drawer')" />

    <v-app-bar-title class="ml-4 ml-sm-4 ml-xs-2">
      <span class="text-primary font-weight-black app-title">DUEL</span>
      <span class="text-secondary font-weight-black app-title">LOG</span>
    </v-app-bar-title>

    <v-spacer />

    <!-- テーマ切り替えボタン -->
    <v-btn
      :icon="themeStore.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      @click="themeStore.toggleTheme"
      class="mr-2"
    />

    <template v-for="item in navItems" :key="item.view">
      <v-btn
        v-if="currentView !== item.view"
        :prepend-icon="item.icon"
        variant="text"
        class="hidden-sm-and-down"
        @click="router.push(item.path)"
      >
        {{ item.name }}
      </v-btn>
    </template>

  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'

defineProps<{
  currentView: 'dashboard' | 'decks' | 'statistics'
}>()

defineEmits(['toggle-drawer'])

const router = useRouter()
const themeStore = useThemeStore()

const navItems = [
  { name: 'ダッシュボード', path: '/', view: 'dashboard', icon: 'mdi-view-dashboard' },
  { name: 'デッキ管理', path: '/decks', view: 'decks', icon: 'mdi-cards' },
  { name: '統計', path: '/statistics', view: 'statistics', icon: 'mdi-chart-bar' }
]
</script>

<style scoped lang="scss">
.app-bar {
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  position: relative;
  overflow: hidden;

  .v-btn,
  .v-chip {
    font-size: 20px;
  }
}

.app-bar-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #00d9ff, #b536ff, #ff2d95);
  animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

@media (max-width: 599px) {
  .app-bar {
    .app-title {
      font-size: 1.25rem !important;
    }

    .v-btn {
      font-size: 14px !important;
    }
  }
}
</style>
