<template>
  <component
    :is="inline ? 'div' : 'v-dialog'"
    v-bind="inline ? {} : dialogProps"
    :fullscreen="inline ? undefined : $vuetify.display.xs"
    class="duel-form-wrapper"
    @update:model-value="inline ? undefined : $emit('update:modelValue', $event)"
  >
    <v-card v-if="isActive" class="duel-form-card">
      <div class="card-glow"></div>

      <v-card-title class="pa-6">
        <v-icon class="mr-2" color="primary">mdi-file-document-edit</v-icon>
        <span class="text-h5">{{ isEdit ? '対戦記録を編集' : '新規対戦記録' }}</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- ゲームモードタブ（ダイアログモードかつhideGameModeTabがfalseの場合のみ表示） -->
        <v-tabs v-if="!inline && !hideGameModeTab" v-model="form.game_mode" color="primary" class="mb-4 mode-tabs-dialog" show-arrows>
          <v-tab value="RANK">
            <v-icon start>mdi-crown</v-icon>
            <span class="d-none d-sm-inline">ランク</span>
          </v-tab>
          <v-tab value="RATE">
            <v-icon start>mdi-chart-line</v-icon>
            <span class="d-none d-sm-inline">レート</span>
          </v-tab>
          <v-tab value="EVENT">
            <v-icon start>mdi-calendar-star</v-icon>
            <span class="d-none d-sm-inline">イベント</span>
          </v-tab>
          <v-tab value="DC">
            <v-icon start>mdi-trophy-variant</v-icon>
            <span class="d-none d-sm-inline">DC</span>
          </v-tab>
        </v-tabs>

        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <v-row>
            <v-col cols="12" md="6">
              <v-combobox
                v-model="selectedMyDeck"
                :items="myDecks"
                item-title="name"
                item-value="id"
                label="使用デッキ"
                prepend-inner-icon="mdi-cards"
                variant="outlined"
                color="primary"
                :rules="[rules.required]"
                clearable
                placeholder="デッキを選択または入力"
              >
                <template #no-data>
                  <v-list-item>
                    <v-list-item-title>
                      新しいデッキ名を入力できます（登録時に自動追加）
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-combobox>
            </v-col>

            <v-col cols="12" md="6">
              <v-combobox
                v-model="selectedOpponentDeck"
                :items="opponentDecks"
                item-title="name"
                item-value="id"
                label="相手デッキ"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                color="secondary"
                :rules="[rules.required]"
                clearable
                placeholder="デッキを選択または入力"
              >
                <template #no-data>
                  <v-list-item>
                    <v-list-item-title>
                      新しいデッキ名を入力できます（登録時に自動追加）
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-combobox>
            </v-col>

            <v-col cols="12" md="4">
              <div class="radio-group-wrapper">
                <label class="radio-label">
                  <v-icon class="mr-2" size="small">mdi-poker-chip</v-icon>
                  コイン
                </label>
                <v-radio-group
                  v-model="form.coin"
                  inline
                  color="primary"
                  :rules="[rules.required]"
                  hide-details="auto"
                >
                  <v-radio
                    v-for="option in coinOptions"
                    :key="option.value"
                    :label="option.title"
                    :value="option.value"
                  />
                </v-radio-group>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <div class="radio-group-wrapper">
                <label class="radio-label">
                  <v-icon class="mr-2" size="small">mdi-swap-horizontal</v-icon>
                  先攻/後攻
                </label>
                <v-radio-group
                  v-model="form.first_or_second"
                  inline
                  color="primary"
                  :rules="[rules.required]"
                  hide-details="auto"
                >
                  <v-radio
                    v-for="option in turnOptions"
                    :key="option.value"
                    :label="option.title"
                    :value="option.value"
                  />
                </v-radio-group>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <div class="radio-group-wrapper">
                <label class="radio-label">
                  <v-icon class="mr-2" size="small">mdi-trophy</v-icon>
                  勝敗
                </label>
                <v-radio-group
                  v-model="form.result"
                  inline
                  :rules="[rules.required]"
                  hide-details="auto"
                >
                  <v-radio
                    v-for="option in resultOptions"
                    :key="option.value"
                    :label="option.title"
                    :value="option.value"
                    :color="option.color"
                  />
                </v-radio-group>
              </div>
            </v-col>

            <v-col v-if="form.game_mode === 'RANK'" cols="12" md="6">
              <v-select
                v-model="form.rank"
                :items="RANKS"
                item-title="label"
                item-value="value"
                label="ランク"
                prepend-inner-icon="mdi-crown"
                variant="outlined"
                color="warning"
                :rules="form.game_mode === 'RANK' ? [rules.required] : []"
              />
            </v-col>

            <v-col v-if="form.game_mode === 'RATE'" cols="12" md="6">
              <v-text-field
                v-model.number="form.rate_value"
                label="レート"
                prepend-inner-icon="mdi-chart-line"
                variant="outlined"
                color="info"
                type="number"
                min="0"
                placeholder="例: 2500"
                :rules="form.game_mode === 'RATE' ? [rules.required, rules.number] : []"
              />
            </v-col>

            <v-col v-if="form.game_mode === 'DC'" cols="12" md="6">
              <v-text-field
                v-model.number="form.dc_value"
                label="DCポイント"
                prepend-inner-icon="mdi-trophy-variant"
                variant="outlined"
                color="warning"
                type="number"
                min="0"
                placeholder="例: 18500"
                :rules="form.game_mode === 'DC' ? [rules.required, rules.number] : []"
              />
            </v-col>

            <!-- 対戦日時（編集時またはダイアログモード時のみ表示） -->
            <v-col v-if="isEdit || !inline" cols="12" :md="form.game_mode === 'EVENT' ? 12 : 6">
              <v-text-field
                v-model="form.played_date"
                label="対戦日時"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                type="datetime-local"
                :rules="[rules.required]"
                @update:modelValue="markPlayedDateTouched"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="備考"
                prepend-inner-icon="mdi-note-text"
                variant="outlined"
                rows="3"
                counter="1000"
                placeholder="メモやコメントを入力"
                :rules="[rules.maxLength]"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">
          {{ inline ? 'リセット' : 'キャンセル' }}
        </v-btn>
        <v-btn color="primary" :loading="loading" @click="handleSubmit">
          <v-icon start>mdi-content-save</v-icon>
          {{ isEdit ? '更新' : '登録' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </component>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Duel, DuelCreate, Deck, GameMode } from '@/types'
import { useNotificationStore } from '@/stores/notification'
import { RANKS, DEFAULT_RANK, DEFAULT_RATE, DEFAULT_DC } from '@/utils/constants'
import { deckAPI, duelAPI } from '@/services/api'

interface Props {
  modelValue: boolean
  duel: Duel | null
  inline?: boolean
  defaultGameMode?: GameMode
  defaultFirstOrSecond?: 0 | 1
  hideGameModeTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultGameMode: 'RANK',
  inline: false,
  defaultFirstOrSecond: 1,
  hideGameModeTab: false
})
const emit = defineEmits(['update:modelValue', 'saved'])

const dialogProps = computed(() => ({
  modelValue: props.modelValue,
  maxWidth: 700,
  persistent: true,
  transition: 'fade-transition'
}))

const isActive = computed(() => (props.inline ? true : props.modelValue))

const notificationStore = useNotificationStore()

const formRef = ref()
const loading = ref(false)
const myDecks = ref<Deck[]>([])
const opponentDecks = ref<Deck[]>([])

const selectedMyDeck = ref<Deck | string | null>(null)
const selectedOpponentDeck = ref<Deck | string | null>(null)
const playedDateTouched = ref(false)
const latestDuels = ref<Duel[]>([])
const suppressCoinSync = ref(false)

const formatDateToLocalInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getCurrentLocalDateTime = () => formatDateToLocalInput(new Date())

const defaultForm = (): DuelCreate => {
  return {
    deck_id: null,
    opponentDeck_id: null,
    result: true,
    game_mode: 'RANK',
    rank: undefined,
    rate_value: undefined,
    dc_value: undefined,
    coin: true,
    // コインが表の場合、defaultFirstOrSecondの設定に従う
    first_or_second: props.defaultFirstOrSecond === 1,
    played_date: getCurrentLocalDateTime(),
    notes: ''
  }
}

const form = ref<DuelCreate>(defaultForm())

const isEdit = computed(() => !!props.duel)

// コインの結果に基づいて先攻/後攻を決定する関数
const applyCoinDefault = (coin: boolean, base: 0 | 1): boolean => {
  // 後攻をデフォルトにしている場合（base === 0）、コインの結果に関わらず後攻を維持
  if (base === 0) {
    return false
  }
  // 先攻をデフォルトにしている場合（base === 1）、コインが表なら先攻、裏なら後攻
  return coin === true ? true : false
}

const coinOptions = [
  { title: '表', value: true },
  { title: '裏', value: false }
]

const turnOptions = [
  { title: '先攻', value: true },
  { title: '後攻', value: false }
]

const resultOptions = [
  { title: '勝ち', value: true, color: 'success' },
  { title: '負け', value: false, color: 'error' }
]

const rules = {
  required: (v: any) => (v !== null && v !== undefined && v !== '') || '入力必須です',
  number: (v: any) => (!isNaN(v) && v >= 0) || '0以上の数値を入力してください',
  maxLength: (v: string) => !v || v.length <= 1000 || '1000文字以内で入力してください'
}

const localDateTimeToISO = (localDateTime: string): string => {
  return `${localDateTime}:00`
}

const isoToLocalDateTime = (isoString: string): string => {
  return isoString.replace(/\.\d{3}Z?$/, '').substring(0, 16)
}

const markPlayedDateTouched = () => {
  playedDateTouched.value = true
}

const fetchDecks = async () => {
  try {
    const allDecks = await deckAPI.getAll()
    myDecks.value = allDecks.filter((d) => d.is_opponent_deck === 0)
    opponentDecks.value = allDecks.filter((d) => d.is_opponent_deck === 1)
  } catch (error) {
    console.error('Failed to fetch decks:', error)
  }
}

const loadLatestDuels = async () => {
  try {
    const duels = (await duelAPI.getAll()) as Duel[] | undefined
    latestDuels.value = Array.isArray(duels) ? duels : []
  } catch (error) {
    console.error('Failed to fetch latest duels:', error)
    latestDuels.value = []
  }
}

const findDeckSelection = (duel?: Duel | null): Deck | string | null => {
  if (!duel) {
    return null
  }

  if (duel.player_deck_id) {
    const matchedDeck = myDecks.value.find((deck) => deck.id === duel.player_deck_id)
    if (matchedDeck) {
      return matchedDeck
    }
  }

  if (duel.player_deck_name) {
    return duel.player_deck_name
  }

  if (duel.deck?.name) {
    return duel.deck.name
  }

  return null
}

const ensureDefaultsForMode = (mode: GameMode) => {
  if (mode === 'RANK') {
    if (form.value.rank === undefined || form.value.rank === null) {
      form.value.rank = DEFAULT_RANK
    }
  } else if (mode === 'RATE') {
    if (form.value.rate_value === undefined || form.value.rate_value === null) {
      form.value.rate_value = DEFAULT_RATE
    }
  } else if (mode === 'DC') {
    if (form.value.dc_value === undefined || form.value.dc_value === null) {
      form.value.dc_value = DEFAULT_DC
    }
  }
}

const applyLatestDefaultsForMode = (mode: GameMode) => {
  if (isEdit.value) {
    return
  }

  const duels = latestDuels.value
  const latestModeDuel = duels.find((duel) => duel.game_mode === mode)
  const fallbackDuel = duels[0]

  selectedMyDeck.value = findDeckSelection(latestModeDuel ?? fallbackDuel ?? null)

  if (mode === 'RANK') {
    const rankSource =
      latestModeDuel ?? duels.find((duel) => duel.game_mode === 'RANK' && duel.rank_value != null)
    if (rankSource && typeof rankSource.rank_value === 'number') {
      form.value.rank = rankSource.rank_value
    }
  } else if (mode === 'RATE') {
    const rateSource =
      latestModeDuel ??
      duels.find((duel) => duel.game_mode === 'RATE' && duel.rate_value != null)
    if (rateSource && typeof rateSource.rate_value === 'number') {
      form.value.rate_value = rateSource.rate_value
    }
  } else if (mode === 'DC') {
    const dcSource =
      latestModeDuel ?? duels.find((duel) => duel.game_mode === 'DC' && duel.dc_value != null)
    if (dcSource && typeof dcSource.dc_value === 'number') {
      form.value.dc_value = dcSource.dc_value
    }
  }

  ensureDefaultsForMode(mode)
}

const createDeckIfNeeded = async (name: string, isOpponent: boolean): Promise<number | null> => {
  try {
    const trimmedName = name.trim()

    const decks = isOpponent ? opponentDecks.value : myDecks.value
    const existingDeck = decks.find((d) => d.name === trimmedName)
    if (existingDeck) {
      return existingDeck.id
    }

    const newDeck = await deckAPI.create({
      name: trimmedName,
      is_opponent_deck: isOpponent
    })

    const deckType = isOpponent ? '相手のデッキ' : '自分のデッキ'
    notificationStore.success(`${deckType}「${trimmedName}」を登録しました`)

    return newDeck.id
  } catch (error: any) {
    console.error('Failed to create deck:', error)
    throw error
  }
}

const resolveDeckId = async (
  selected: Deck | string | null,
  isOpponent: boolean
): Promise<number | null> => {
  if (!selected) {
    return null
  }

  if (typeof selected === 'object' && selected.id) {
    return selected.id
  }

  if (typeof selected === 'string' && selected.trim()) {
    return await createDeckIfNeeded(selected, isOpponent)
  }

  return null
}

const initializeForm = async () => {
  playedDateTouched.value = false
  await fetchDecks()
  if (props.duel) {
    const localDateTime = isoToLocalDateTime(props.duel.played_at)

    form.value = {
      deck_id: props.duel.player_deck_id,
      opponentDeck_id: props.duel.opponent_deck_id,
      result: props.duel.result === 'win',
      game_mode: props.duel.game_mode,
      rank: props.duel.rank_value,
      rate_value: props.duel.rate_value,
      dc_value: props.duel.dc_value,
      coin: props.duel.coin_result === 'win',
      first_or_second: props.duel.turn_order === 'first',
      played_date: localDateTime,
      notes: props.duel.notes || ''
    }

    selectedMyDeck.value = myDecks.value.find((d) => d.id === props.duel?.player_deck_id) || null
    selectedOpponentDeck.value =
      opponentDecks.value.find((d) => d.id === props.duel?.opponent_deck_id) || null
  } else {
    form.value = defaultForm()
    selectedMyDeck.value = null
    selectedOpponentDeck.value = null
    playedDateTouched.value = false

    await loadLatestDuels()

    form.value.game_mode = props.defaultGameMode
    applyLatestDefaultsForMode(form.value.game_mode)
  }
}

watch(
  () => isActive.value,
  async (newValue) => {
    if (newValue) {
      // アニメーション完了後にフォーム初期化（150ms遅延）
      setTimeout(async () => {
        await initializeForm()
      }, 150)
    }
  },
  { immediate: true }
)

watch(
  () => form.value.game_mode,
  async (newMode) => {
    if (isEdit.value || !isActive.value) return

    form.value.rank = undefined
    form.value.rate_value = undefined
    form.value.dc_value = undefined

    if (!latestDuels.value.length) {
      await loadLatestDuels()
    }

    applyLatestDefaultsForMode(newMode)
  }
)

// defaultGameModeの変更を監視（inlineモード用）
watch(
  () => props.defaultGameMode,
  (newMode) => {
    if (!props.inline || isEdit.value) return
    if (form.value.game_mode === newMode) return
    form.value.game_mode = newMode
    applyLatestDefaultsForMode(newMode)
  }
)

// コイン結果に連動して先攻/後攻を自動設定
watch(
  () => form.value.coin,
  (newCoin) => {
    // 編集モードでは自動変更しない（意図しない書き換え防止）
    if (isEdit.value) return
    if (suppressCoinSync.value) {
      suppressCoinSync.value = false
      return
    }
    // コインが表のときはセグメントで指定した値、裏のときは後攻をデフォルトとする
    const base = props.defaultFirstOrSecond
    form.value.first_or_second = applyCoinDefault(newCoin, base)
  }
)

// defaultFirstOrSecondの変更を監視
watch(
  () => props.defaultFirstOrSecond,
  (newBase) => {
    if (isEdit.value) return
    form.value.first_or_second = applyCoinDefault(form.value.coin, newBase)
  }
)

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (!isEdit.value && !playedDateTouched.value) {
    form.value.played_date = getCurrentLocalDateTime()
  }

  loading.value = true

  try {
    const myDeckId = await resolveDeckId(selectedMyDeck.value, false)
    const opponentDeckId = await resolveDeckId(selectedOpponentDeck.value, true)

    if (!myDeckId || !opponentDeckId) {
      notificationStore.error('デッキの登録に失敗しました')
      loading.value = false
      return
    }

    const submitData = {
      player_deck_id: myDeckId,
      opponent_deck_id: opponentDeckId,
      result: form.value.result ? 'win' : 'loss',
      game_mode: form.value.game_mode,
      rank_value: form.value.rank,
      rate_value: form.value.rate_value,
      dc_value: form.value.dc_value,
      coin_result: form.value.coin ? 'win' : 'loss',
      turn_order: form.value.first_or_second ? 'first' : 'second',
      played_at: localDateTimeToISO(form.value.played_date),
      notes: form.value.notes
    }

    if (isEdit.value && props.duel) {
      await duelAPI.update(props.duel.id, submitData)
      notificationStore.success('対戦記録を更新しました')
    } else {
      await duelAPI.create(submitData)
      notificationStore.success('対戦記録を登録しました')
    }

    emit('saved')
    closeDialog()
  } catch (error) {
    console.error('Failed to save duel:', error)
  } finally {
    loading.value = false
  }
}

const closeDialog = () => {
  if (props.inline) {
    formRef.value?.resetValidation()
    selectedMyDeck.value = null
    selectedOpponentDeck.value = null
    playedDateTouched.value = false
    void initializeForm()
    return
  }

  emit('update:modelValue', false)
  formRef.value?.resetValidation()
  selectedMyDeck.value = null
  selectedOpponentDeck.value = null
  playedDateTouched.value = false
}
</script>

<style scoped lang="scss">
.duel-form-wrapper {
  width: 100%;

  // ダイアログトランジションの高速化
  :deep(.v-overlay__content) {
    will-change: transform, opacity;
    transform: translateZ(0);
  }

  :deep(.v-overlay__scrim) {
    will-change: opacity;
  }
}

.duel-form-card {
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
  position: relative;
  overflow: hidden;
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
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

.radio-group-wrapper {
  padding: 12px 16px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 6px;
  background-color: rgba(128, 128, 128, 0.08);

  .radio-label {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: rgba(128, 128, 128, 0.8);
    margin-bottom: 8px;
  }

  :deep(.v-selection-control-group) {
    gap: 16px;
  }
}

@media (max-width: 599px) {
  .duel-form-card {
    .v-card-title {
      padding: 16px !important;

      .text-h5 {
        font-size: 1.25rem !important;
      }
    }

    .v-card-text {
      padding: 16px !important;
    }
  }

  .mode-tabs-dialog {
    .v-tab {
      min-width: 60px;
      padding: 0 12px;
      font-size: 0.875rem;
    }
  }

  .radio-group-wrapper {
    :deep(.v-selection-control-group) {
      gap: 8px;
    }
  }
}
</style>
