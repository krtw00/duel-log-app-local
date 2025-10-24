<template>
  <div>
    <!-- ナビゲーションバー -->
    <app-bar current-view="statistics" @toggle-drawer="drawer = !drawer" />

    <!-- レスポンシブ対応のナビゲーションドロワー -->
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

    <!-- メインコンテンツ -->
    <v-main class="main-content">
      <v-container fluid class="pa-6">
        <h1 class="statistics-title text-h4 mb-6">統計情報</h1>

        <!-- 年月選択 -->
        <v-row class="mb-4">
          <v-col cols="6" sm="3">
            <v-select
              v-model="selectedYear"
              :items="years"
              label="年"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="fetchStatistics"
            ></v-select>
          </v-col>
          <v-col cols="6" sm="3">
            <v-select
              v-model="selectedMonth"
              :items="months"
              label="月"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="fetchStatistics"
            ></v-select>
          </v-col>
        </v-row>

        <!-- 統計フィルター -->
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
                  @update:model-value="refreshStatisticsWithDecks"
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
                  @update:model-value="refreshStatisticsWithDecks"
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
                  @update:model-value="refreshStatisticsWithDecks"
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

        <!-- ゲームモード切り替えタブ -->
        <v-card class="mode-tab-card mb-4">
          <v-tabs v-model="currentTab" color="primary" align-tabs="center" height="64">
            <v-tab value="RANK" class="custom-tab">
              <v-icon start>mdi-crown</v-icon>
              ランク
            </v-tab>
            <v-tab value="RATE" class="custom-tab">
              <v-icon start>mdi-chart-line</v-icon>
              レート
            </v-tab>
            <v-tab value="EVENT" class="custom-tab">
              <v-icon start>mdi-calendar-star</v-icon>
              イベント
            </v-tab>
            <v-tab value="DC" class="custom-tab">
              <v-icon start>mdi-trophy-variant</v-icon>
              DC
            </v-tab>
          </v-tabs>
        </v-card>

        <v-window v-model="currentTab">
          <v-window-item v-for="mode in ['RANK', 'RATE', 'EVENT', 'DC']" :key="mode" :value="mode">
            <v-row>
              <!-- 月間デッキ分布 -->
              <v-col cols="12" lg="6">
                <v-card class="stats-card">
                  <v-card-title>月間デッキ分布 ({{ currentMonth }})</v-card-title>
                  <v-card-text>
                    <apexchart
                      v-if="
                        !loading && statisticsByMode[mode].monthlyDistribution.series.length > 0
                      "
                      type="pie"
                      height="350"
                      :options="statisticsByMode[mode].monthlyDistribution.chartOptions"
                      :series="statisticsByMode[mode].monthlyDistribution.series"
                    ></apexchart>
                    <div v-else class="no-data-placeholder">
                      <v-icon size="64" color="grey">mdi-chart-pie</v-icon>
                      <p class="text-body-1 text-grey mt-4">データがありません</p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- 月間対戦一覧 -->
              <v-col cols="12" lg="6">
                <v-card class="stats-card">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>月間対戦一覧 ({{ currentMonth }})</span>
                    <v-chip size="small" variant="outlined">
                      全 {{ monthlyDuelsByMode[mode]?.length || 0 }} 件
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <duel-table
                      :duels="monthlyDuelsByMode[mode] || []"
                      :loading="monthlyDuelsLoading"
                      :show-actions="false"
                      table-height="350px"
                    />
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- 自分のデッキ勝率 -->
              <v-col cols="12">
                <v-card class="stats-card">
                  <v-card-title>自分のデッキ勝率</v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="myDeckWinRatesHeaders"
                      :items="statisticsByMode[mode].myDeckWinRates"
                      :loading="loading"
                      class="matchup-table"
                      density="compact"
                    >
                      <template #[`item.win_rate`]='{ item }'>
                        {{ item.wins }} / {{ item.total_duels }} ({{ item.win_rate.toFixed(1) }}%)
                      </template>
                      <template #no-data>
                        <div class="no-data-placeholder py-8">
                          <v-icon size="64" color="grey">mdi-chart-bar</v-icon>
                          <p class="text-body-1 text-grey mt-4">データがありません</p>
                        </div>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- 相性表 -->
              <v-col cols="12">
                <v-card class="stats-card">
                  <v-card-title>デッキ相性表</v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="matchupHeaders"
                      :items="statisticsByMode[mode].matchupData"
                      :loading="loading"
                      class="matchup-table"
                      density="compact"
                    >
            <template #[`item.win_rate`]='{ item }'>
              {{ item.wins }} / {{ item.total_duels }} ({{ item.win_rate.toFixed(1) }}%)
            </template>
            <template #[`item.win_rate_first`]='{ item }'>
              {{ item.win_rate_first.toFixed(1) }}%
            </template>
            <template #[`item.win_rate_second`]='{ item }'>
              {{ item.win_rate_second.toFixed(1) }}%
            </template>
                      <template #no-data>
                        <div class="no-data-placeholder py-8">
                          <v-icon size="64" color="grey">mdi-table-off</v-icon>
                          <p class="text-body-1 text-grey mt-4">相性データがありません</p>
                        </div>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- レート/DC変動グラフ (RATEとDCタブのみ) -->
              <v-col v-if="mode === 'RATE' || mode === 'DC'" cols="12">
                <v-card class="stats-card">
                  <v-card-title
                    >{{ mode === 'RATE' ? 'レート変動' : 'DC変動' }} ({{
                      currentMonth
                    }})</v-card-title
                  >
                  <v-card-text>
                    <apexchart
                      v-if="!loading && statisticsByMode[mode].timeSeries.series[0].data.length > 0"
                      type="line"
                      height="350"
                      :options="statisticsByMode[mode].timeSeries.chartOptions"
                      :series="statisticsByMode[mode].timeSeries.series"
                    ></apexchart>
                    <div v-else class="no-data-placeholder">
                      <v-icon size="64" color="grey">{{
                        mode === 'RATE' ? 'mdi-chart-line' : 'mdi-trophy-variant'
                      }}</v-icon>
                      <p class="text-body-1 text-grey mt-4">データがありません</p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import AppBar from '@/components/layout/AppBar.vue';
import DuelTable from '@/components/duel/DuelTable.vue';
import { useThemeStore } from '@/stores/theme';
import { statisticsAPI, duelAPI } from '@/services/api';
import { useNotificationStore } from '@/stores/notification';

const themeStore = useThemeStore();
const notificationStore = useNotificationStore();

const drawer = ref(false);
const navItems = [
  { name: 'ダッシュボード', path: '/', view: 'dashboard', icon: 'mdi-view-dashboard' },
  { name: 'デッキ管理', path: '/decks', view: 'decks', icon: 'mdi-cards' },
  { name: '統計', path: '/statistics', view: 'statistics', icon: 'mdi-chart-bar' },
];

// --- Types ---
interface DistributionData {
  series: number[];
  chartOptions: any;
}

interface TimeSeriesData {
  series: { name: string; data: number[] }[];
  chartOptions: any;
}

interface StatisticsModeData {
  monthlyDistribution: DistributionData;
  matchupData: any[];
  myDeckWinRates: any[];
  timeSeries: TimeSeriesData;
}

interface AllStatisticsData {
  [key: string]: StatisticsModeData;
}

const loading = ref(true);
const currentTab = ref('RANK');

// --- Date Selection ---
const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref(new Date().getMonth() + 1);
const years = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
});
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const currentMonth = computed(() => `${selectedYear.value}年${selectedMonth.value}月`);

// --- Filter Settings ---
const filterPeriodType = ref<'all' | 'range'>('all');
const filterRangeStart = ref(1);
const filterRangeEnd = ref(30);
const filterMyDeckId = ref<number | null>(null);
const availableMyDecks = ref<{ id: number; name: string }[]>([]);

const filterPeriodOptions = [
  { title: '全体', value: 'all' },
  { title: '範囲指定', value: 'range' }
];

// --- Chart Base Options ---
const baseChartOptions = computed(() => ({
  chart: { type: 'pie', background: 'transparent' },
  labels: [],
  theme: {
    mode: themeStore.isDark ? 'dark' : 'light',
  },
  colors: ['#00D9FF', '#FF4560', '#775DD0', '#FEB019', '#00E396', '#D4526E', '#3F51B5', '#26A69A', '#E91E63', '#FFC107'],
  legend: {
    position: 'bottom',
    labels: {
      colors: themeStore.isDark ? '#fff' : '#000',
    },
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: { width: 200 },
        legend: { position: 'bottom' },
      },
    },
  ],
}));

const lineChartBaseOptions = computed(() => ({
  chart: {
    type: 'line',
    background: 'transparent',
    zoom: { enabled: false },
    toolbar: { show: false },
  },
  xaxis: {
    type: 'numeric',
    title: { text: '対戦数', style: { color: themeStore.isDark ? '#E4E7EC' : '#333' } },
    labels: { style: { colors: themeStore.isDark ? '#E4E7EC' : '#333' } },
  },
  yaxis: { labels: { style: { colors: themeStore.isDark ? '#E4E7EC' : '#333' } } },
  stroke: { curve: 'smooth', width: 3 },
  markers: {
    size: 4,
    colors: ['#00d9ff'],
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: { size: 7 },
  },
  grid: { borderColor: 'rgba(0, 217, 255, 0.1)', strokeDashArray: 4 },
  tooltip: { theme: themeStore.isDark ? 'dark' : 'light' },
  dataLabels: { enabled: false },
  theme: { mode: themeStore.isDark ? 'dark' : 'light' },
}));

// --- Statistics Data ---
const createInitialStats = (): AllStatisticsData => {
  const modes = ['RANK', 'RATE', 'EVENT', 'DC'];
  const stats: AllStatisticsData = {};
  modes.forEach((mode) => {
    stats[mode] = {
      monthlyDistribution: { series: [], chartOptions: { ...baseChartOptions.value, labels: [] } },
      matchupData: [],
      myDeckWinRates: [],
      timeSeries: {
        series: [{ name: mode, data: [] }],
        chartOptions: {
          ...lineChartBaseOptions.value,
          xaxis: { ...lineChartBaseOptions.value.xaxis, categories: [] },
          colors: [mode === 'DC' ? '#b536ff' : '#00d9ff'],
        },
      },
    };
  });
  return stats;
};

const statisticsByMode = ref<AllStatisticsData>(createInitialStats());
const monthlyDuelsByMode = ref<Record<string, any[]>>({
  RANK: [],
  RATE: [],
  EVENT: [],
  DC: [],
});
const monthlyDuelsLoading = ref(false);


const buildStatisticsOptions = () => {
  const options: Record<string, number> = {};

  if (filterPeriodType.value === 'range') {
    options.rangeStart = filterRangeStart.value;
    options.rangeEnd = filterRangeEnd.value;
  }

  if (filterMyDeckId.value !== null) {
    options.myDeckId = filterMyDeckId.value;
  }

  return options;
};

const fetchAvailableDecks = async () => {
  try {
    const options =
      filterPeriodType.value === 'range'
        ? { rangeStart: filterRangeStart.value, rangeEnd: filterRangeEnd.value }
        : {};
    const response = await statisticsAPI.getAvailableDecks(
      selectedYear.value,
      selectedMonth.value,
      currentTab.value,
      options
    );

    availableMyDecks.value = response?.my_decks || [];

    if (
      filterMyDeckId.value !== null &&
      !availableMyDecks.value.some((deck) => deck.id === filterMyDeckId.value)
    ) {
      filterMyDeckId.value = null;
    }
  } catch (error) {
    console.error('Failed to fetch available decks:', error);
  }
};

const fetchMonthlyDuels = async () => {
  monthlyDuelsLoading.value = true;
  try {
    const modes = ['RANK', 'RATE', 'EVENT', 'DC'];
    const options = buildStatisticsOptions();
    for (const mode of modes) {
      const filters = {
        year: selectedYear.value,
        month: selectedMonth.value,
        game_mode: mode,
        ...options
      };
      const duels = await duelAPI.getAll(filters);
      monthlyDuelsByMode.value[mode] = duels || [];
    }
  } catch (error) {
    console.error('Failed to fetch monthly duels:', error);
    notificationStore.error('月間対戦一覧の取得に失敗しました');
  } finally {
    monthlyDuelsLoading.value = false;
  }
};

const fetchStatistics = async () => {
  loading.value = true;
  try {
    await fetchMonthlyDuels();
    const modes = ['RANK', 'RATE', 'EVENT', 'DC'];
    const options = buildStatisticsOptions();

    for (const mode of modes) {
      // 月間デッキ分布を取得
      const monthlyDist = await statisticsAPI.getMonthlyDeckDistribution(
        selectedYear.value,
        selectedMonth.value,
        mode,
        options
      );
      const monthlyLabels = monthlyDist?.map((d: any) => d.deck_name) || [];
      const monthlySeries = monthlyDist?.map((d: any) => d.count) || [];
      statisticsByMode.value[mode].monthlyDistribution = {
        series: monthlySeries,
        chartOptions: { ...baseChartOptions.value, labels: monthlyLabels },
      };

      // マッチアップデータを取得
      const matchupData = await statisticsAPI.getMatchupWinrates(
        selectedYear.value,
        selectedMonth.value,
        mode,
        options
      );
      statisticsByMode.value[mode].matchupData = (matchupData || [])
        .slice()
        .sort((a: any, b: any) => (b.total_duels ?? 0) - (a.total_duels ?? 0));

      // 自分のデッキ勝率を取得
      const myDeckWinRates = await statisticsAPI.getDeckWinRates(
        selectedYear.value,
        selectedMonth.value,
        mode,
        options
      );
      statisticsByMode.value[mode].myDeckWinRates = (myDeckWinRates || [])
        .slice()
        .sort((a: any, b: any) => (b.total_duels ?? 0) - (a.total_duels ?? 0));

      // 時系列データを取得（RATEとDCのみ）
      if (mode === 'RATE' || mode === 'DC') {
        const timeSeriesData = await statisticsAPI.getTimeSeries(
          selectedYear.value,
          selectedMonth.value,
          mode,
          options
        );
        const categories = timeSeriesData?.map((_: any, i: number) => i + 1) || [];
        const seriesData = timeSeriesData?.map((d: any) => d.value) || [];
        statisticsByMode.value[mode].timeSeries = {
          series: [{ name: mode, data: seriesData }],
          chartOptions: {
            ...lineChartBaseOptions.value,
            xaxis: { ...lineChartBaseOptions.value.xaxis, categories },
            colors: [mode === 'DC' ? '#b536ff' : '#00d9ff'],
          },
        };
      }
    }
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    notificationStore.error('統計情報の取得に失敗しました');
  } finally {
    loading.value = false;
  }
};

const refreshStatisticsWithDecks = async () => {
  await fetchAvailableDecks();
  await fetchStatistics();
};

const handleMyDeckFilterChange = async () => {
  await fetchStatistics();
};

const resetFilters = () => {
  filterPeriodType.value = 'all';
  filterRangeStart.value = 1;
  filterRangeEnd.value = 30;
  filterMyDeckId.value = null;
  refreshStatisticsWithDecks();
};

// --- Data Table ---
const matchupHeaders = [
  { title: '使用デッキ', key: 'deck_name', sortable: false },
  { title: '相手デッキ', key: 'opponent_deck_name', sortable: false },
  { title: '対戦数', key: 'total_duels', sortable: true },
  { title: '勝率', key: 'win_rate', sortable: true },
  { title: '先攻勝率', key: 'win_rate_first', sortable: true },
  { title: '後攻勝率', key: 'win_rate_second', sortable: true },
];

const myDeckWinRatesHeaders = [
  { title: 'デッキ名', key: 'deck_name', sortable: true },
  { title: '対戦数', key: 'total_duels', sortable: true },
  { title: '勝率', key: 'win_rate', sortable: true },
];

onMounted(() => {
  refreshStatisticsWithDecks();
});

watch([selectedYear, selectedMonth], () => {
  refreshStatisticsWithDecks();
});

watch(currentTab, () => {
  refreshStatisticsWithDecks();
});

// テーマ変更時にグラフを再描画
watch(() => themeStore.isDark, () => {
  fetchStatistics();
});
</script>

<style scoped lang="scss">
.main-content {
  min-height: 100vh;
}

.statistics-title {
  color: rgb(var(--v-theme-on-surface));
}

.filter-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
}

.stats-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px !important;
  background-color: rgba(var(--v-theme-surface), 0.92);
}

.no-data-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: rgba(var(--v-theme-on-surface), 0.65);

  p {
    color: inherit;
  }
}

:deep(.stats-card .v-card-title) {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

:deep(.stats-card .v-card-text) {
  color: rgb(var(--v-theme-on-surface));
}

.matchup-table {
  background: transparent !important;
}

:deep(.matchup-table .v-data-table__th) {
  background: rgba(var(--v-theme-surface), 0.85) !important;
  color: rgba(var(--v-theme-on-surface), 0.75) !important;
  font-weight: 600 !important;
}

:deep(.matchup-table .v-data-table__td) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1) !important;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.mode-tab-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px !important;
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
</style>
