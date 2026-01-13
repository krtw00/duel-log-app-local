<template>
  <app-layout current-view="dashboard" main-class="dashboard-main">
    <v-container fluid class="pa-4 dashboard-container">
        <v-card class="mode-tab-card mb-4">
          <v-tabs
            v-model="currentMode"
            color="primary"
            align-tabs="center"
            show-arrows
            class="mode-tabs"
            @update:model-value="handleModeChange"
          >
            <v-tab value="RANK" class="custom-tab">
              <v-icon :start="$vuetify.display.smAndUp">mdi-crown</v-icon>
              <span class="d-none d-sm-inline">ランク</span>
              <v-chip class="ml-1 ml-sm-2" size="small" color="primary">
                {{ rankDuels.length }}
              </v-chip>
            </v-tab>
            <v-tab value="RATE" class="custom-tab">
              <v-icon :start="$vuetify.display.smAndUp">mdi-chart-line</v-icon>
              <span class="d-none d-sm-inline">レート</span>
              <v-chip class="ml-1 ml-sm-2" size="small" color="info">
                {{ rateDuels.length }}
              </v-chip>
            </v-tab>
            <v-tab value="EVENT" class="custom-tab">
              <v-icon :start="$vuetify.display.smAndUp">mdi-calendar-star</v-icon>
              <span class="d-none d-sm-inline">イベント</span>
              <v-chip class="ml-1 ml-sm-2" size="small" color="secondary">
                {{ eventDuels.length }}
              </v-chip>
            </v-tab>
            <v-tab value="DC" class="custom-tab">
              <v-icon :start="$vuetify.display.smAndUp">mdi-trophy-variant</v-icon>
              <span class="d-none d-sm-inline">DC</span>
              <v-chip class="ml-1 ml-sm-2" size="small" color="warning">
                {{ dcDuels.length }}
              </v-chip>
            </v-tab>
          </v-tabs>
        </v-card>

        <v-row class="mb-4 year-month-row">
          <v-col cols="6" sm="3">
            <v-select
              v-model="selectedYear"
              :items="years"
              label="年"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="fetchDuels"
            />
          </v-col>
          <v-col cols="6" sm="3">
            <v-select
              v-model="selectedMonth"
              :items="months"
              label="月"
              variant="outlined"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              @update:model-value="fetchDuels"
            />
          </v-col>
        </v-row>

        <v-card class="filter-card mb-4">
          <v-card-title class="pa-4">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-filter</v-icon>
              <span class="text-h6">統計フィルター</span>
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="filterPeriodType"
                  :items="filterPeriodOptions"
                  label="期間"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="applyFilters"
                ></v-select>
              </v-col>
              <v-col v-if="filterPeriodType === 'range'" cols="6" sm="3" md="2">
                <v-text-field
                  v-model.number="filterRangeStart"
                  label="開始（試合目）"
                  variant="outlined"
                  density="compact"
                  hide-details
                  type="number"
                  min="1"
                  @update:model-value="applyFilters"
                ></v-text-field>
              </v-col>
              <v-col v-if="filterPeriodType === 'range'" cols="6" sm="3" md="2">
                <v-text-field
                  v-model.number="filterRangeEnd"
                  label="終了（試合目）"
                  variant="outlined"
                  density="compact"
                  hide-details
                  type="number"
                  min="1"
                  @update:model-value="applyFilters"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="filterMyDeckId"
                  :items="availableMyDecks"
                  item-title="name"
                  item-value="id"
                  label="自分のデッキ"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  :disabled="availableMyDecks.length === 0"
                  @update:model-value="handleMyDeckFilterChange"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6" md="2" class="d-flex align-center">
                <v-btn color="secondary" variant="outlined" block @click="resetFilters">
                  <v-icon start>mdi-refresh</v-icon>
                  リセット
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-row class="mb-4 stat-row">
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="総試合数"
              :value="currentStats.total_duels"
              icon="mdi-sword-cross"
              color="primary"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="勝率"
              :value="formatPercent(currentStats.win_rate)"
              icon="mdi-trophy"
              color="success"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="先攻勝率"
              :value="formatPercent(currentStats.first_turn_win_rate)"
              icon="mdi-lightning-bolt"
              color="warning"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="後攻勝率"
              :value="formatPercent(currentStats.second_turn_win_rate)"
              icon="mdi-shield"
              color="secondary"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="コイン勝率"
              :value="formatPercent(currentStats.coin_win_rate)"
              icon="mdi-poker-chip"
              :color="coinWinRateColor"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <stat-card
              title="先攻率"
              :value="formatPercent(currentStats.go_first_rate)"
              icon="mdi-arrow-up-bold-hexagon-outline"
              color="teal"
            />
          </v-col>
        </v-row>

        <v-card class="duel-card">
          <v-card-title class="pa-4">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-table</v-icon>
              <span class="text-h6">対戦履歴</span>
            </div>

            <div class="d-flex d-sm-none flex-column ga-2 mt-3">
              <div class="d-flex align-center ga-2 mb-2">
                <v-tooltip
                  text="先攻/後攻の初期値（コイン表時の基準）"
                  location="top"
                  content-class="default-turn-tooltip"
                >
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-information-outline"
                      variant="text"
                      density="compact"
                      :class="['default-toggle__icon', themeStore.isDark ? 'text-white' : 'text-black']"
                    />
                  </template>
                </v-tooltip>
                <v-btn-toggle
                  v-model="defaultFirstOrSecond"
                  mandatory
                  divided
                  density="compact"
                  variant="outlined"
                  color="primary"
                  selected-class="default-toggle__selected"
                  :class="['default-toggle__toggle', 'flex-grow-1', themeStore.isDark ? 'toggle-dark-mode' : 'toggle-light-mode']"
                >
                  <v-btn :value="0" size="small" class="flex-grow-1">後攻</v-btn>
                  <v-btn :value="1" size="small" class="flex-grow-1">先攻</v-btn>
                </v-btn-toggle>
              </div>
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                block
                size="large"
                @click="openDuelDialog"
              >
                対戦記録を追加
              </v-btn>
              <div class="d-flex ga-2">
                <v-btn
                  color="secondary"
                  prepend-icon="mdi-download"
                  size="small"
                  class="flex-grow-1"
                  :loading="exportingCSV"
                  :disabled="exportingCSV"
                  @click="exportCSV"
                >
                  エクスポート
                </v-btn>
                <v-btn
                  color="success"
                  prepend-icon="mdi-upload"
                  size="small"
                  class="flex-grow-1"
                  :loading="importingCSV"
                  :disabled="importingCSV"
                  @click="importCSV"
                >
                  インポート
                </v-btn>
              </div>
            </div>

            <div class="d-none d-sm-flex align-center ga-2">
              <v-spacer />
              <v-tooltip
                text="先攻/後攻の初期値（コイン表時の基準）"
                location="top"
                content-class="default-turn-tooltip"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-information-outline"
                    variant="text"
                    density="compact"
                    :class="['default-toggle__icon', themeStore.isDark ? 'text-white' : 'text-black']"
                  />
                </template>
              </v-tooltip>
              <v-btn-toggle
                v-model="defaultFirstOrSecond"
                mandatory
                divided
                density="compact"
                variant="outlined"
                color="primary"
                selected-class="default-toggle__selected"
                :class="['default-toggle__toggle', 'mr-4', themeStore.isDark ? 'toggle-dark-mode' : 'toggle-light-mode']"
              >
                <v-btn :value="0" size="small">後攻</v-btn>
                <v-btn :value="1" size="small">先攻</v-btn>
              </v-btn-toggle>
              <v-btn
                color="secondary"
                prepend-icon="mdi-download"
                :loading="exportingCSV"
                :disabled="exportingCSV"
                @click="exportCSV"
              >
                CSVエクスポート
              </v-btn>
              <v-btn
                color="success"
                prepend-icon="mdi-upload"
                :loading="importingCSV"
                :disabled="importingCSV"
                @click="importCSV"
              >
                CSVインポート
              </v-btn>
              <v-btn color="primary" prepend-icon="mdi-plus" @click="openDuelDialog">
                対戦記録を追加
              </v-btn>
            </div>
          </v-card-title>
          <duel-table
            :duels="currentDuels"
            :loading="loading"
            @edit="editDuel"
            @delete="deleteDuel"
          />
        </v-card>
      </v-container>

    <duel-form-dialog
      v-model="showDuelDialog"
      :duel="editingDuel"
      :default-game-mode="currentMode"
      :default-first-or-second="defaultFirstOrSecond"
      hide-game-mode-tab
      @saved="handleDuelSaved"
    />
  </app-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatCard from '@/components/duel/StatCard.vue'
import DuelTable from '@/components/duel/DuelTable.vue'
import DuelFormDialog from '@/components/duel/DuelFormDialog.vue'
import { deckAPI, duelAPI } from '@/services/api'
import { useNotificationStore } from '@/stores/notification'
import { useThemeStore } from '@/stores/theme'
import type { Deck, Duel, DuelStats, GameMode } from '@/types'

const currentMode = ref<GameMode>('RANK')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const loading = ref(false)
const duels = ref<Duel[]>([])

const showDuelDialog = ref(false)
const editingDuel = ref<Duel | null>(null)
const exportingCSV = ref(false)
const importingCSV = ref(false)
const defaultFirstOrSecond = ref<0 | 1>(1)

const notificationStore = useNotificationStore()
const themeStore = useThemeStore()

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
})

const months = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({
    title: `${i + 1}月`,
    value: i + 1
  }))
)

const filterPeriodType = ref<'all' | 'range'>('all')
const filterRangeStart = ref(1)
const filterRangeEnd = ref(30)
const filterMyDeckId = ref<number | null>(null)

const filterPeriodOptions = [
  { title: '全体', value: 'all' },
  { title: '範囲指定', value: 'range' }
]

type DeckOption = { id: number; name: string }
const availableDecksByMode = ref<Record<GameMode, DeckOption[]>>({
  RANK: [],
  RATE: [],
  EVENT: [],
  DC: []
})

const availableMyDecks = computed(() => availableDecksByMode.value[currentMode.value] || [])

const rankDuels = computed(() => duels.value.filter((duel) => duel.game_mode === 'RANK'))
const rateDuels = computed(() => duels.value.filter((duel) => duel.game_mode === 'RATE'))
const eventDuels = computed(() => duels.value.filter((duel) => duel.game_mode === 'EVENT'))
const dcDuels = computed(() => duels.value.filter((duel) => duel.game_mode === 'DC'))

const currentDuels = computed(() => {
  switch (currentMode.value) {
    case 'RANK':
      return rankDuels.value
    case 'RATE':
      return rateDuels.value
    case 'EVENT':
      return eventDuels.value
    case 'DC':
      return dcDuels.value
    default:
      return []
  }
})

const getRangeFilteredDuels = (duelList: Duel[]): Duel[] => {
  const sorted = [...duelList].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  )

  if (filterPeriodType.value === 'range') {
    const start = Math.max(0, (filterRangeStart.value || 1) - 1)
    const end = filterRangeEnd.value || sorted.length
    return sorted.slice(start, end)
  }

  return sorted
}

const applyStatFilters = (duelList: Duel[]): Duel[] => {
  const ranged = getRangeFilteredDuels(duelList)
  if (filterMyDeckId.value !== null) {
    return ranged.filter((duel) => duel.player_deck_id === filterMyDeckId.value)
  }
  return ranged
}

const filteredRankDuels = computed(() => applyStatFilters(rankDuels.value))
const filteredRateDuels = computed(() => applyStatFilters(rateDuels.value))
const filteredEventDuels = computed(() => applyStatFilters(eventDuels.value))
const filteredDcDuels = computed(() => applyStatFilters(dcDuels.value))

const emptyStats = (): DuelStats => ({
  total_duels: 0,
  win_count: 0,
  lose_count: 0,
  win_rate: 0,
  first_turn_win_rate: 0,
  second_turn_win_rate: 0,
  coin_win_rate: 0,
  go_first_rate: 0
})

const rankStats = ref<DuelStats>(emptyStats())
const rateStats = ref<DuelStats>(emptyStats())
const eventStats = ref<DuelStats>(emptyStats())
const dcStats = ref<DuelStats>(emptyStats())

const currentStats = computed(() => {
  switch (currentMode.value) {
    case 'RANK':
      return rankStats.value
    case 'RATE':
      return rateStats.value
    case 'EVENT':
      return eventStats.value
    case 'DC':
      return dcStats.value
    default:
      return emptyStats()
  }
})

const coinWinRateColor = computed(() => (themeStore.isDark ? 'yellow' : 'primary'))

const formatPercent = (value: number) => `${(Number.isFinite(value) ? value * 100 : 0).toFixed(1)}%`

const calculateStats = (duelList: Duel[]): DuelStats => {
  const total = duelList.length
  if (total === 0) {
    return emptyStats()
  }

  const winCount = duelList.filter((duel) => duel.result === 'win').length
  const firstTurnDuels = duelList.filter((duel) => duel.turn_order === 'first')
  const secondTurnDuels = duelList.filter((duel) => duel.turn_order === 'second')
  const firstTurnWins = firstTurnDuels.filter((duel) => duel.result === 'win').length
  const secondTurnWins = secondTurnDuels.filter((duel) => duel.result === 'win').length
  const coinWins = duelList.filter((duel) => duel.coin_result === 'win').length

  return {
    total_duels: total,
    win_count: winCount,
    lose_count: total - winCount,
    win_rate: winCount / total,
    first_turn_win_rate:
      firstTurnDuels.length > 0 ? firstTurnWins / firstTurnDuels.length : 0,
    second_turn_win_rate:
      secondTurnDuels.length > 0 ? secondTurnWins / secondTurnDuels.length : 0,
    coin_win_rate: total > 0 ? coinWins / total : 0,
    go_first_rate: total > 0 ? firstTurnDuels.length / total : 0
  }
}

const updateStats = () => {
  rankStats.value = calculateStats(filteredRankDuels.value)
  rateStats.value = calculateStats(filteredRateDuels.value)
  eventStats.value = calculateStats(filteredEventDuels.value)
  dcStats.value = calculateStats(filteredDcDuels.value)
}

const updateAvailableDecks = () => {
  const modeMap: Record<GameMode, Duel[]> = {
    RANK: rankDuels.value,
    RATE: rateDuels.value,
    EVENT: eventDuels.value,
    DC: dcDuels.value
  }

  const updated: Record<GameMode, DeckOption[]> = {
    RANK: [],
    RATE: [],
    EVENT: [],
    DC: []
  }

  ;(Object.keys(modeMap) as GameMode[]).forEach((mode) => {
    const rangeFiltered = getRangeFilteredDuels(modeMap[mode])
    const deckMap = new Map<number, DeckOption>()
    rangeFiltered.forEach((duel) => {
      if (duel.player_deck_id && duel.player_deck_name) {
        deckMap.set(duel.player_deck_id, {
          id: duel.player_deck_id,
          name: duel.player_deck_name
        })
      }
    })
    updated[mode] = Array.from(deckMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ja')
    )
  })

  availableDecksByMode.value = updated

  const currentDecks = updated[currentMode.value] || []
  if (
    filterMyDeckId.value !== null &&
    !currentDecks.some((deck) => deck.id === filterMyDeckId.value)
  ) {
    filterMyDeckId.value = null
  }
}

const applyFilters = () => {
  updateAvailableDecks()
  updateStats()
}

const handleMyDeckFilterChange = () => {
  applyFilters()
}

const resetFilters = () => {
  filterPeriodType.value = 'all'
  filterRangeStart.value = 1
  filterRangeEnd.value = 30
  filterMyDeckId.value = null
  applyFilters()
}

const fetchDuels = async () => {
  loading.value = true
  try {
    const deckList = (await deckAPI.getAll()) as Deck[]
    const deckMap = new Map<number, Deck>(deckList.map((deck) => [deck.id, deck]))

    const data = await duelAPI.getAll({
      year: selectedYear.value,
      month: selectedMonth.value
    })
    duels.value = (data || []).map((duel) => ({
      ...duel,
      player_deck_name: duel.player_deck_name ?? deckMap.get(duel.player_deck_id)?.name,
      opponent_deck_name:
        duel.opponent_deck_name ?? deckMap.get(duel.opponent_deck_id)?.name
    }))
    applyFilters()
  } catch (error) {
    notificationStore.error('対戦履歴の取得に失敗しました')
    console.error('Failed to fetch duels:', error)
  } finally {
    loading.value = false
  }
}

const handleModeChange = (mode: GameMode) => {
  currentMode.value = mode
  applyFilters()
}

const openDuelDialog = () => {
  editingDuel.value = null
  showDuelDialog.value = true
}

const editDuel = (duel: Duel) => {
  editingDuel.value = duel
  showDuelDialog.value = true
}

const handleDuelSaved = async () => {
  await fetchDuels()
}

const deleteDuel = async (id: number) => {
  if (!confirm('この対戦記録を削除しますか？')) {
    return
  }

  try {
    await duelAPI.delete(id)
    notificationStore.success('対戦記録を削除しました')
    await fetchDuels()
  } catch (error) {
    notificationStore.error('対戦記録の削除に失敗しました')
    console.error('Failed to delete duel:', error)
  }
}

const exportCSV = async () => {
  exportingCSV.value = true
  try {
    // 元のduel-log-appと同じカラムリストを使用
    const columns = [
      'deck_name',
      'opponent_deck_name',
      'result',
      'coin',
      'first_or_second',
      'rank',
      'rate_value',
      'dc_value',
      'notes',
      'played_date'
    ]

    const result = await window.electronAPI.duels.exportCSV(
      selectedYear.value,
      selectedMonth.value,
      currentMode.value,
      columns
    )

    if (result.success) {
      notificationStore.success('CSVファイルをエクスポートしました')
    } else if (!result.cancelled) {
      notificationStore.error(result.error || 'CSVエクスポートに失敗しました')
    }
  } catch (error) {
    notificationStore.error('CSVエクスポートに失敗しました')
    console.error('Failed to export CSV:', error)
  } finally {
    exportingCSV.value = false
  }
}

const importCSV = async () => {
  importingCSV.value = true
  try {
    const result = await window.electronAPI.duels.importCSV()

    if (result.success) {
      let message = `${result.count}件の対戦記録をインポートしました`
      if (result.skipped && result.skipped > 0) {
        message += `（${result.skipped}件スキップ）`
      }
      notificationStore.success(message)

      // エラーがある場合は警告を表示
      if (result.errors && result.errors.length > 0) {
        console.warn('インポート時のエラー:', result.errors)
        notificationStore.warning(`${result.errors.length}件の行でエラーが発生しました`)
      }

      await fetchDuels()
    } else if (!result.cancelled) {
      notificationStore.error(result.error || 'CSVインポートに失敗しました')
    }
  } catch (error) {
    notificationStore.error('CSVインポートに失敗しました')
    console.error('Failed to import CSV:', error)
  } finally {
    importingCSV.value = false
  }
}

onMounted(() => {
  fetchDuels()
})
</script>

<style scoped lang="scss">
:deep(.dashboard-main) {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  overflow: hidden;
}

.filter-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
  flex-shrink: 0;
}

.mode-tab-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
  flex-shrink: 0;
}

.stat-row {
  flex-shrink: 0;
}

.year-month-row {
  flex-shrink: 0;
}

.mode-tabs {
  .v-tab {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
}

.custom-tab {
  font-size: 1rem;
  padding: 0 24px;
  transition: background-color 0.3s ease;
  min-width: auto;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.duel-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.v-card-title) {
    flex-shrink: 0;
  }

  :deep(.v-data-table) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :deep(.v-table__wrapper) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
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

@media (max-width: 599px) {
  .custom-tab {
    padding: 0 8px;
    font-size: 0.875rem;
    min-width: 60px;
  }

  .mode-tabs {
    :deep(.v-slide-group__content) {
      justify-content: space-between;
    }
  }
}
</style>

<style lang="scss">

/* グローバルスタイル: トグルボタンの文字色 */
.toggle-dark-mode .v-btn,
.toggle-dark-mode .v-btn .v-btn__content {
  color: #fff !important;
}

.toggle-light-mode .v-btn,
.toggle-light-mode .v-btn .v-btn__content {
  color: #000 !important;
}

/* ツールチップのスタイル（teleport先でも効くようにグローバル指定） */
.default-turn-tooltip {
  font-weight: 600;
  padding: 8px 10px;
  border-radius: 8px;
  opacity: 1 !important;
}

.v-theme--customLightTheme .default-turn-tooltip,
.v-theme--customLightTheme.default-turn-tooltip {
  color: #000 !important;
  background: #fff !important;
  border: 1px solid rgba(0, 0, 0, 0.25) !important;
}

.v-theme--customDarkTheme .default-turn-tooltip,
.v-theme--customDarkTheme.default-turn-tooltip {
  color: #fff !important;
  background: #111 !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
}
</style>
