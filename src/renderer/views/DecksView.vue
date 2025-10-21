<template>
  <div>
    <app-bar current-view="decks" @toggle-drawer="drawer = !drawer" />

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list nav dense>
        <v-list-item
          v-for="item in navItems"
          :key="item.view"
          :prepend-icon="item.icon"
          :to="item.path"
          :title="item.name"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main class="main-content">
      <v-container fluid class="pa-6">
        <!-- アーカイブボタン -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-alert type="info" variant="tonal" prominent border="start" class="archive-alert">
              <template #prepend>
                <v-icon size="large">mdi-archive</v-icon>
              </template>
              <div class="d-flex align-center justify-space-between flex-wrap ga-4">
                <div>
                  <div class="text-h6 mb-1">月次リセット機能</div>
                  <div class="text-body-2">
                    新弾リリース時など、全デッキを一括アーカイブできます。アーカイブしても過去の対戦記録は保持されます。
                  </div>
                </div>
                <v-btn
                  color="warning"
                  prepend-icon="mdi-archive"
                  variant="elevated"
                  size="large"
                  @click="archiveAllDecks"
                >
                  全デッキをアーカイブ
                </v-btn>
              </div>
            </v-alert>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="deck-card">
              <v-card-title class="pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" color="primary">mdi-cards</v-icon>
                    <span class="text-h6">自分のデッキ</span>
                  </div>
                  <v-btn color="primary" prepend-icon="mdi-plus" @click="addPlayerDeck">
                    デッキ追加
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item
                    v-for="deck in playerDecks"
                    :key="deck.id"
                    class="deck-item"
                  >
                    <v-list-item-title>{{ deck.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      作成日: {{ formatDate(deck.created_at) }}
                    </v-list-item-subtitle>
                    <template #append>
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        @click="editDeck(deck)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        @click="deleteDeck(deck.id)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
                <div v-if="playerDecks.length === 0" class="text-center pa-8">
                  <v-icon size="64" color="grey">mdi-cards-outline</v-icon>
                  <p class="text-grey mt-4">デッキがありません</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="deck-card">
              <v-card-title class="pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" color="secondary">mdi-cards-variant</v-icon>
                    <span class="text-h6">対戦相手のデッキ</span>
                  </div>
                  <v-btn color="secondary" prepend-icon="mdi-plus" @click="addOpponentDeck">
                    デッキ追加
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item
                    v-for="deck in opponentDecks"
                    :key="deck.id"
                    class="deck-item"
                  >
                    <v-list-item-title>{{ deck.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      作成日: {{ formatDate(deck.created_at) }}
                    </v-list-item-subtitle>
                    <template #append>
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        @click="editDeck(deck)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        @click="deleteDeck(deck.id)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
                <div v-if="opponentDecks.length === 0" class="text-center pa-8">
                  <v-icon size="64" color="grey">mdi-cards-outline</v-icon>
                  <p class="text-grey mt-4">デッキがありません</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppBar from '@/components/layout/AppBar.vue'
import { deckAPI } from '@/services/api'
import { useNotificationStore } from '@/stores/notification'
import type { Deck } from '@/types'

const drawer = ref(false)
const decks = ref<Deck[]>([])

const notificationStore = useNotificationStore()

const navItems = [
  { name: 'ダッシュボード', path: '/', view: 'dashboard', icon: 'mdi-view-dashboard' },
  { name: 'デッキ管理', path: '/decks', view: 'decks', icon: 'mdi-cards' },
  { name: '統計', path: '/statistics', view: 'statistics', icon: 'mdi-chart-bar' }
]

const playerDecks = computed(() => decks.value.filter((d) => d.is_opponent_deck === 0))
const opponentDecks = computed(() => decks.value.filter((d) => d.is_opponent_deck === 1))

const fetchDecks = async () => {
  try {
    decks.value = await deckAPI.getAll()
  } catch (error) {
    notificationStore.error('デッキの取得に失敗しました')
    console.error('Failed to fetch decks:', error)
  }
}

const addPlayerDeck = () => {
  const name = prompt('デッキ名を入力してください')
  if (name) {
    createDeck(name, false)
  }
}

const addOpponentDeck = () => {
  const name = prompt('相手デッキ名を入力してください')
  if (name) {
    createDeck(name, true)
  }
}

const createDeck = async (name: string, isOpponent: boolean) => {
  try {
    await deckAPI.create({ name, is_opponent_deck: isOpponent })
    notificationStore.success('デッキを追加しました')
    fetchDecks()
  } catch (error) {
    notificationStore.error('デッキの追加に失敗しました')
  }
}

const editDeck = (deck: Deck) => {
  const name = prompt('新しいデッキ名を入力してください', deck.name)
  if (name && name !== deck.name) {
    updateDeck(deck.id, name)
  }
}

const updateDeck = async (id: number, name: string) => {
  try {
    await deckAPI.update(id, { name })
    notificationStore.success('デッキを更新しました')
    fetchDecks()
  } catch (error) {
    notificationStore.error('デッキの更新に失敗しました')
  }
}

const deleteDeck = async (id: number) => {
  if (confirm('このデッキを削除しますか?')) {
    try {
      await deckAPI.delete(id)
      notificationStore.success('デッキを削除しました')
      fetchDecks()
    } catch (error: any) {
      notificationStore.error(error.message || 'デッキの削除に失敗しました')
    }
  }
}

const archiveAllDecks = async () => {
  if (confirm('すべてのデッキをアーカイブしますか？\nアーカイブされたデッキと同じ名前のデッキを再度作成できるようになります。')) {
    try {
      const result = await deckAPI.archive()
      notificationStore.success(`${result.archived_count}件のデッキをアーカイブしました`)
      fetchDecks()
    } catch (error: any) {
      notificationStore.error(error.message || 'アーカイブに失敗しました')
    }
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP')
}

onMounted(() => {
  fetchDecks()
})
</script>

<style scoped lang="scss">
.main-content {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}

.deck-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.deck-item {
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(0, 217, 255, 0.05);
  }
}

.archive-alert {
  border-left: 4px solid rgb(var(--v-theme-warning)) !important;
  background: rgba(255, 193, 7, 0.05) !important;

  :deep(.v-alert__prepend) {
    color: rgb(var(--v-theme-warning));
  }
}
</style>
