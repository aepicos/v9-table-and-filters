<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { ViewState } from '../data/savedViews'

const props = defineProps<{
  title: {
    crumbs: string[]
    current: string
    sub: string | null
  }
  initialState?: ViewState
}>()

const emit = defineEmits<{
  (e: 'state-changed'): void
}>()
import KpiBar from './KpiBar.vue'
import type { KpiDef } from './KpiBar.vue'
import AssetTable from './AssetTable.vue'
import FilterBar from './FilterBar.vue'
import { type FilterChip, type AdvancedQuery } from '../data/filters'
import { DATASET_STATS } from '../data/mockAssets'

const assetTableRef = ref<InstanceType<typeof AssetTable> | null>(null)

const search = ref('')

const filters = ref<FilterChip[]>(props.initialState?.filters ?? [])
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

// Emit state-changed when filters are modified after the component has mounted
let _pageMounted = false
onMounted(() => { _pageMounted = true })

watch(filters, () => {
  if (_pageMounted) emit('state-changed')
}, { deep: true })

watch(advancedQuery, () => {
  if (_pageMounted) emit('state-changed')
})

defineExpose({
  getCurrentState() {
    return {
      filters: filters.value,
      advancedQuery: advancedQuery.value,
      ...(assetTableRef.value?.getState() ?? {}),
    }
  }
})
</script>

<template>
  <main
    class="flex flex-col flex-1 min-h-screen overflow-y-auto overflow-x-hidden"
  >
    <!-- Page header -->
    <div
      class="flex items-center justify-between px-6 mt-3 shrink-0"
      style="height: 56px; background: var(--v9-ui-bg);"
    >
      <!-- PageTitle -->
      <div class="page-title">
        <!-- Icon box -->
        <div class="page-title__icon-box" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path d="m13.883 3.767 2.359 2.358-2.359 2.358-2.358-2.358zm-6.383.4V7.5H4.167V4.167zm8.333 8.333v3.333H12.5V12.5zm-8.333 0v3.333H4.167V12.5zm6.383-11.092L9.167 6.117l4.716 4.716L18.6 6.117zM9.167 2.5H2.5v6.667h6.667zm8.333 8.333h-6.667V17.5H17.5zm-8.333 0H2.5V17.5h6.667z"/>
          </svg>
        </div>
        <!-- Breadcrumb title -->
        <h1 class="page-title__text">
          <template v-for="(crumb, i) in props.title.crumbs" :key="i">
            <span class="page-title__crumb">{{ crumb }}</span>
            <span class="page-title__sep" aria-hidden="true">/</span>
          </template>
          <span class="page-title__crumb page-title__crumb--current">{{ props.title.current }}</span>
          <span v-if="props.title.sub" class="page-title__sub">{{ props.title.sub }}</span>
        </h1>
      </div>

    </div>

    <!-- Content area -->
    <div class="flex flex-col gap-4 px-6 pt-3 pb-8 flex-1">
      <!-- KPI billboard bar -->
      <KpiBar
        :kpis="KPI_DEFS"
        :can-filter="!advancedQuery"
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
          ref="assetTableRef"
          :search="search"
          :filters="filters"
          :advanced-query="advancedQuery"
          :initial-state="props.initialState"
          @state-changed="emit('state-changed')"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* PageTitle */
.page-title {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs); /* 6px */
}

/* Icon box — M/Default: 32×32px, ui/canvas bg, ui/border-light border, radius-m */
.page-title__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  color: var(--v9-ui-icon);
}

/* Breadcrumb text row */
.page-title__text {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs); /* 6px */
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-xxl); /* 20px */
  line-height: var(--v9-line-height-l); /* 24px */
  font-weight: var(--v9-font-weight-regular);
  white-space: nowrap;
}

.page-title__crumb {
  color: var(--v9-ui-dimmed);
  font-weight: var(--v9-font-weight-regular);
}

.page-title__crumb--current {
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-strong);
}

.page-title__sep {
  color: var(--v9-ui-dimmed);
  font-weight: var(--v9-font-weight-regular);
}

.page-title__sub {
  color: var(--v9-ui-text);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  align-self: flex-end; /* optically sits at the baseline of the larger text */
  padding-bottom: 2px;
}
</style>
