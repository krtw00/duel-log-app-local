<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    persistent
    :fullscreen="$vuetify.display.xs"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="duel-form-card">
      <div class="card-glow"></div>

      <v-card-title class="pa-6">
        <v-icon class="mr-2" color="primary">mdi-file-document-edit</v-icon>
        <span class="text-h5">{{ isEdit ? '対戦記録を編集' : '新規対戦記録' }}</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-tabs v-model="form.game_mode" color="primary" class="mb-4 mode-tabs-dialog" show-arrows>
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
              <v-select
                v-model="form.coin"
                :items="coinOptions"
                label="コイン"
                prepend-inner-icon="mdi-poker-chip"
                variant="outlined"
                color="primary"
                :rules="[rules.required]"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.first_or_second"
                :items="turnOptions"
                label="先攻/後攻"
                prepend-inner-icon="mdi-swap-horizontal"
                variant="outlined"
                color="primary"
                :rules="[rules.required]"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.result"
                :items="resultOptions"
                label="勝敗"
                prepend-inner-icon="mdi-trophy"
                variant="outlined"
                :color="form.result ? 'success' : 'error'"
                :rules="[rules.required]"
              />
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

            <v-col cols="12" :md="form.game_mode === 'EVENT' ? 12 : 6">
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
        <v-btn variant="text" @click="closeDialog"> キャンセル </v-btn>
        <v-btn color="primary" :loading="loading" @click="handleSubmit">
          <v-icon start>mdi-content-save</v-icon>
          {{ isEdit ? '更新' : '登録' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
  defaultGameMode?: GameMode
}

const props = withDefaults(defineProps<Props>(), {
  defaultGameMode: 'RANK'
})
const emit = defineEmits(['update:modelValue', 'saved'])

const notificationStore = useNotificationStore()

const formRef = ref()
const loading = ref(false)
const myDecks = ref<Deck[]>([])
const opponentDecks = ref<Deck[]>([])

const selectedMyDeck = ref<Deck | string | null>(null)
const selectedOpponentDeck = ref<Deck | string | null>(null)
const playedDateTouched = ref(false)

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
    first_or_second: true,
    played_date: getCurrentLocalDateTime(),
    notes: ''
  }
}

const form = ref<DuelCreate>(defaultForm())

const isEdit = computed(() => !!props.duel)

const coinOptions = [
  { title: '表', value: true },
  { title: '裏', value: false }
]

const turnOptions = [
  { title: '先攻', value: true },
  { title: '後攻', value: false }
]

const resultOptions = [
  { title: '勝ち', value: true },
  { title: '負け', value: false }
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

watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue) {
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
        form.value.game_mode = props.defaultGameMode
        selectedMyDeck.value = null
        selectedOpponentDeck.value = null
        playedDateTouched.value = false

        if (form.value.game_mode === 'RANK') {
          form.value.rank = DEFAULT_RANK
        } else if (form.value.game_mode === 'RATE') {
          form.value.rate_value = DEFAULT_RATE
        } else if (form.value.game_mode === 'DC') {
          form.value.dc_value = DEFAULT_DC
        }
      }
    }
  }
)

watch(
  () => form.value.game_mode,
  (newMode) => {
    if (isEdit.value) return

    form.value.rank = undefined
    form.value.rate_value = undefined
    form.value.dc_value = undefined

    if (newMode === 'RANK') {
      form.value.rank = DEFAULT_RANK
    } else if (newMode === 'RATE') {
      form.value.rate_value = DEFAULT_RATE
    } else if (newMode === 'DC') {
      form.value.dc_value = DEFAULT_DC
    }
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
  emit('update:modelValue', false)
  formRef.value?.resetValidation()
  selectedMyDeck.value = null
  selectedOpponentDeck.value = null
  playedDateTouched.value = false
}
</script>

<style scoped lang="scss">
.duel-form-card {
  backdrop-filter: blur(20px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
  position: relative;
  overflow: hidden;
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
}
</style>
