<script setup lang="ts">
import { ref, watch } from 'vue'
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

// ── KPI → filter chip templates ───────────────────────────────
type ChipTemplate = Omit<FilterChip, 'id'>

const KPI_CHIP_TEMPLATES: Record<string, ChipTemplate[]> = {
  at_risk: [
    { filterId: 'issue-severity', key: 'Issue severity', operator: 'is', value: 'Critical' },
    { filterId: 'issue-severity', key: 'Issue severity', operator: 'is', value: 'High' },
    { filterId: 'risk-score',     key: 'Risk score',     operator: '>',  value: '900' },
  ],
  class_a: [
    { filterId: 'asset-class', key: 'Asset class', operator: 'is', value: 'A' },
  ],
  critical_issues: [
    { filterId: 'issue-severity', key: 'Issue severity', operator: 'is', value: 'Critical' },
  ],
  known_exploits: [
    { filterId: 'exploitability', key: 'Exploitability', operator: 'is', value: 'Known exploit' },
  ],
}

// ── KPI state ─────────────────────────────────────────────────
const activeKpis = ref<string[]>([])

/** Maps kpiId → the chip IDs that were injected for it */
const kpiChipIds = ref(new Map<string, string[]>())

let uid = 0
function nextId() { return `kpi-chip-${++uid}` }

/** Called by KpiBar via v-model when the user clicks a cell */
function handleKpiChange(newIds: string[]) {
  const prev = activeKpis.value

  // ── Deactivate removed KPIs ──────────────────────────────
  for (const id of prev) {
    if (!newIds.includes(id)) {
      deactivateKpi(id)
    }
  }

  // ── Activate added KPIs ───────────────────────────────────
  for (const id of newIds) {
    if (!prev.includes(id) && KPI_CHIP_TEMPLATES[id]) {
      const chips: FilterChip[] = KPI_CHIP_TEMPLATES[id].map(t => ({ ...t, id: nextId() }))
      filters.value = [...filters.value, ...chips]
      kpiChipIds.value.set(id, chips.map(c => c.id))
    }
  }

  activeKpis.value = newIds
}

/** Remove a KPI's chips and mark it inactive (without triggering the watch loop) */
function deactivateKpi(kpiId: string, keepChips = false) {
  const chipIds = kpiChipIds.value.get(kpiId) ?? []
  if (!keepChips) {
    filters.value = filters.value.filter(f => !chipIds.includes(f.id))
  }
  kpiChipIds.value.delete(kpiId)
  activeKpis.value = activeKpis.value.filter(id => id !== kpiId)
}

// ── Detect external chip removal/modification ─────────────────
// If a user removes or edits a chip that belongs to a KPI, deactivate
// that KPI and clean up its remaining chips.
let _suppressWatch = false

watch(filters, (newFilters) => {
  if (_suppressWatch) return
  const filterIds = new Set(newFilters.map(f => f.id))

  for (const [kpiId, chipIds] of kpiChipIds.value.entries()) {
    // Check if any chip was removed
    const missing = chipIds.some(id => !filterIds.has(id))
    if (missing) {
      // Suppress re-entry, then remove remaining chips for this KPI
      _suppressWatch = true
      deactivateKpi(kpiId)
      _suppressWatch = false
    }
  }
}, { deep: true })

// ── Standard filter bar handlers ──────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const KPI_DEFS: KpiDef[] = [
  {
    id: 'total',
    label: 'Total assets',
    value: fmt(DATASET_STATS.total),
    delta: '—',
    change: 'none',
    filterable: false,
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
    id: 'known_exploits',
    label: 'Assets with known exploits',
    value: fmt(DATASET_STATS.knownExploits),
    delta: '-42',
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
  if (chip) {
    // If this chip belongs to a KPI, changing it deactivates that KPI
    // (keep all chips in place — user is taking manual control)
    for (const [kpiId, chipIds] of kpiChipIds.value.entries()) {
      if (chipIds.includes(id)) {
        kpiChipIds.value.delete(kpiId)
        activeKpis.value = activeKpis.value.filter(k => k !== kpiId)
        break
      }
    }
    chip.operator = operator
  }
}

function setValue(id: string, value: string) {
  const chip = filters.value.find((f) => f.id === id)
  if (chip) {
    // Same as setOperator: manual edit detaches chip from its KPI
    for (const [kpiId, chipIds] of kpiChipIds.value.entries()) {
      if (chipIds.includes(id)) {
        kpiChipIds.value.delete(kpiId)
        activeKpis.value = activeKpis.value.filter(k => k !== kpiId)
        break
      }
    }
    chip.value = value
  }
}

function applyAdvanced(query: AdvancedQuery) {
  // Clear any active KPI filters too
  activeKpis.value = []
  kpiChipIds.value.clear()
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
        :model-value="activeKpis"
        @update:model-value="handleKpiChange"
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
        />
      </div>
    </div>
  </main>
</template>
