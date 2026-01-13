<template>
  <div class="duel-entry-section">
    <v-card class="entry-toolbar mb-4">
      <v-card-title class="pa-4 entry-toolbar__title">
        <v-icon class="mr-2" color="primary">mdi-tune-variant</v-icon>
        <span class="text-subtitle-1">新規追加時の初期値</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <div class="default-toggle d-flex align-center ga-2">
          <v-tooltip
            text="先攻/後攻の初期値（コイン表時の基準）"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-information-outline"
                variant="text"
                density="compact"
                class="default-toggle__icon"
              />
            </template>
          </v-tooltip>
          <v-btn-toggle
            v-model="defaultFirstOrSecondProxy"
            mandatory
            divided
            density="compact"
            variant="outlined"
            color="primary"
            selected-class="default-toggle__selected"
            class="default-toggle__toggle"
          >
            <v-btn :value="0" size="small">後攻</v-btn>
            <v-btn :value="1" size="small">先攻</v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>

    <DuelFormDialog
      inline
      :model-value="true"
      :duel="null"
      :default-game-mode="defaultGameMode"
      :default-first-or-second="defaultFirstOrSecond"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameMode } from '@/types'
import DuelFormDialog from '@/components/duel/DuelFormDialog.vue'

interface Props {
  defaultGameMode: GameMode
  defaultFirstOrSecond: 0 | 1
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'duel-saved'): void
  (e: 'update:defaultFirstOrSecond', value: 0 | 1): void
}>()

const defaultFirstOrSecondProxy = computed({
  get: () => props.defaultFirstOrSecond,
  set: (value: 0 | 1) => emit('update:defaultFirstOrSecond', value)
})

const handleSaved = () => {
  emit('duel-saved')
}
</script>

<style scoped>
.duel-entry-section {
  margin-bottom: 24px;
}

.entry-toolbar {
  backdrop-filter: blur(12px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
}

.entry-toolbar__title {
  display: flex;
  align-items: center;
}

.default-toggle__icon {
  opacity: 0.9;
}

.default-toggle__toggle {
  border-width: 2px;
  background: rgba(var(--v-theme-surface), 0.9);
  border-color: rgba(var(--v-theme-on-surface), 0.25) !important;
}

.default-toggle__selected {
  background: rgba(var(--v-theme-primary), 0.25) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

.default-toggle__toggle :deep(.v-btn) {
  font-weight: 600;
}
</style>
