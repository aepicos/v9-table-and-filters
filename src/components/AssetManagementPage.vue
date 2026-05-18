<script setup lang="ts">
import { ref } from 'vue'
import KpiBar from './KpiBar.vue'
import type { KpiDef } from './KpiBar.vue'
import AssetTable from './AssetTable.vue'
import FilterBar from './FilterBar.vue'
import { type FilterChip, type AdvancedQuery } from '../data/filters'
import { DATASET_STATS } from '../data/mockAssets'

const TABS = [
  'All assets',
  'Repositories',
  'Container images',
  'Packages',
  'API',
  'Web applications',
]

const activeTab = ref('All assets')
const search = ref('')

const filters = ref<FilterChip[]>([])
const advancedQuery = ref<AdvancedQuery | null>(null)

// ── KPI billboard filter ──────────────────────────────────────
const activeKpi = ref<string | null>(null)

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const KPI_DEFS: KpiDef[] = [
  {
    id: 'total',
    label: 'Total assets',
    value: fmt(DATASET_STATS.total),
    delta: '+248',
    change: 'none',
  },
  {
    id: 'at_risk',
    label: 'Assets at risk',
    value: fmt(DATASET_STATS.atRisk),
    delta: '+31',
    change: 'bad',
  },
  {
    id: 'class_a',
    label: 'Class "A" assets',
    value: fmt(DATASET_STATS.classA),
    delta: '+12',
    change: 'good',
  },
  {
    id: 'critical_issues',
    label: 'Assets with critical issues',
    value: fmt(DATASET_STATS.criticalIssues),
    delta: '-8',
    change: 'good',
  },
  {
    id: 'unmonitored',
    label: 'Unmonitored assets',
    value: fmt(DATASET_STATS.unmonitored),
    delta: '-124',
    change: 'good',
  },
]

function removeFilter(id: string) {
  filters.value = filters.value.filter((f) => f.id !== id)
}

function addFilter(chip: FilterChip) {
  advancedQuery.value = null
  filters.value.push(chip)
}

function setOperator(id: string, operator: string) {
  const chip = filters.value.find((f) => f.id === id)
  if (chip) chip.operator = operator
}

function setValue(id: string, value: string) {
  const chip = filters.value.find((f) => f.id === id)
  if (chip) chip.value = value
}

function applyAdvanced(query: AdvancedQuery) {
  filters.value = []
  advancedQuery.value = query
}

function clearAdvanced() {
  advancedQuery.value = null
}
</script>

<template>
  <main
    class="flex flex-col flex-1 min-h-screen overflow-y-auto overflow-x-hidden"
  >
    <!-- Page header -->
    <div
      class="flex items-center justify-between px-6 border-b shrink-0"
      style="height: 56px; background: var(--v9-ui-bg); border-color: var(--v9-ui-border);"
    >
      <div class="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5" style="color: var(--v9-ui-icon);">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <h1 class="text-sm font-semibold" style="color: var(--v9-ui-text); margin: 0;">Asset Management</h1>
      </div>

    </div>

    <!-- Tabs -->
    <div
      class="flex items-center gap-0 px-6 border-b shrink-0"
      style="background: var(--v9-ui-bg); border-color: var(--v9-ui-border);"
    >
      <button
        v-for="tab in TABS"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
        :style="activeTab === tab
          ? 'border-color: var(--v9-ui-text); color: var(--v9-ui-text);'
          : 'border-color: transparent; color: var(--v9-ui-dimmed);'"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Content area -->
    <div class="flex flex-col gap-4 px-6 pt-6 pb-8 flex-1">
      <!-- KPI billboard bar -->
      <KpiBar
        :kpis="KPI_DEFS"
        :can-filter="true"
        v-model="activeKpi"
      />

      <!-- Filter bar -->
      <FilterBar
        :filters="filters"
        :advanced-query="advancedQuery"
        @remove="removeFilter"
        @add="addFilter"
        @set-operator="setOperator"
        @set-value="setValue"
        @apply-advanced="applyAdvanced"
        @clear-advanced="clearAdvanced"
      />

      <!-- Data table — sticky so it never scrolls below viewport -->
      <div
        class="sticky top-0 flex flex-col"
        style="height: calc(100vh - 56px - 2rem);"
      >
        <AssetTable
          :search="search"
          :filters="filters"
          :advanced-query="advancedQuery"
          :kpi-filter="activeKpi"
        />
      </div>
    </div>
  </main>
</template>
