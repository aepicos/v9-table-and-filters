<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { FilterChip, FilterCondition, AdvancedQuery } from '../data/filters'
import type { AssetItem as AssetItemType } from '../data/assets'
import { assetPath } from '../data/assets'
import { DATASET, COVERAGE_ABBREV, COVERAGE_TYPES } from '../data/mockAssets'
import RadioBar from './RadioBar.vue'
import Badge from './Badge.vue'
import Checkbox from './Checkbox.vue'
import ParentCheckbox from './ParentCheckbox.vue'
import AssetDrawer from './AssetDrawer.vue'
import SortPopover from './SortPopover.vue'
import type { SortColDef } from './SortPopover.vue'

/* ============================================================
   PROPS
   ============================================================ */

const props = defineProps<{
  search?: string
  filters?: FilterChip[]
  advancedQuery?: AdvancedQuery | null
}>()

/* ============================================================
   CONSTANTS
   ============================================================ */

const PAGE_SIZE = 100

type ColId =
  | 'select'
  | 'name'
  | 'type'
  | 'assetClass'
  | 'issueCounts'
  | 'riskScore'
  | 'coverage'
  | 'team'
  | 'language'
  | 'environment'
  | 'lastScan'
  | 'source'
  | 'visibility'
  | 'actions'

interface ColDef {
  id: ColId
  label: string
  width: number        // min/fallback width in px
  sticky: boolean
  visible: boolean
  sortable: boolean
  defaultDesc?: boolean
  autoWidth?: boolean  // if true, column uses max-content (fits its widest cell)
}

const INITIAL_COLUMNS: ColDef[] = [
  { id: 'select',      label: '',            width: 48,  sticky: true,  visible: true,  sortable: false },
  { id: 'name',        label: 'Asset name',  width: 260, sticky: true,  visible: true,  sortable: true  },
  { id: 'type',        label: 'Type',        width: 140, sticky: false, visible: true,  sortable: true  },
  { id: 'assetClass',  label: 'Class',       width: 80,  sticky: false, visible: true,  sortable: true  },
  { id: 'issueCounts', label: 'Issues',      width: 200, sticky: false, visible: true,  sortable: false },
  { id: 'riskScore',   label: 'Risk score',  width: 100, sticky: false, visible: true,  sortable: true,  defaultDesc: true },
  { id: 'coverage',    label: 'Coverage',    width: 180, sticky: false, visible: true,  sortable: false },
  { id: 'team',        label: 'Team',        width: 200, sticky: false, visible: true,  sortable: true  },
  { id: 'language',    label: 'Language',    width: 110, sticky: false, visible: false, sortable: true  },
  { id: 'environment', label: 'Environment', width: 110, sticky: false, visible: false, sortable: true  },
  { id: 'lastScan',    label: 'Last scan',   width: 120, sticky: false, visible: false, sortable: false },
  { id: 'source',      label: 'Source',      width: 130, sticky: false, visible: false, sortable: false, autoWidth: true },
  { id: 'visibility',  label: 'Visibility',  width: 100, sticky: false, visible: false, sortable: true  },
  { id: 'actions',     label: '',            width: 56,  sticky: false, visible: true,  sortable: false },
]

/* ============================================================
   DATA TYPES
   ============================================================ */

type AssetItem = AssetItemType

/* ============================================================
   DATA — imported from shared module
   ============================================================ */

// DATASET, COVERAGE_ABBREV, and all generator constants are imported above.

const getSecondaryLine = assetPath

const selectedAsset    = ref<AssetItem | null>(null)
const drawerTriggerEl  = ref<HTMLElement | null>(null)

function openAsset(item: AssetItem, trigger?: HTMLElement | null) {
  selectedAsset.value   = item
  drawerTriggerEl.value = trigger ?? null
}

// Action button tooltip (shared across all rows)
const actionTooltipVisible = ref(false)
const actionTooltipStyle = ref({ top: '0px', left: '0px' })

// Bulk actions bar — "Clear all" tooltip
const babTooltipVisible = ref(false)
const babTooltipStyle = ref({ top: '0px', left: '0px' })

function showBabTooltip(e: MouseEvent | FocusEvent) {
  const btn = e.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  babTooltipStyle.value = {
    top: `${rect.top - 4}px`,
    left: `${rect.left + rect.width / 2}px`,
  }
  babTooltipVisible.value = true
}

function hideBabTooltip() {
  babTooltipVisible.value = false
}

// Table options button tooltip
const tableOptsTooltipVisible = ref(false)
const tableOptsTooltipStyle = ref({ top: '0px', left: '0px' })

function showTableOptsTooltip(e: MouseEvent | FocusEvent) {
  const btn = e.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  tableOptsTooltipStyle.value = {
    top: `${rect.top - 4}px`,
    left: `${rect.left + rect.width / 2}px`,
  }
  tableOptsTooltipVisible.value = true
}

function hideTableOptsTooltip() {
  tableOptsTooltipVisible.value = false
}

function showActionTooltip(e: MouseEvent | FocusEvent) {
  const btn = e.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  actionTooltipStyle.value = {
    top: `${rect.top - 4}px`,
    left: `${rect.left + rect.width / 2}px`,
  }
  actionTooltipVisible.value = true
}

function hideActionTooltip() {
  actionTooltipVisible.value = false
}

// Floating active-row marker
const markerStyle = ref<{ left: string; top: string } | null>(null)

async function updateMarker() {
  await nextTick()
  if (!selectedAsset.value) { markerStyle.value = null; return }
  const row = document.querySelector('.at-data-row--active') as HTMLElement | null
  if (!row) { markerStyle.value = null; return }
  const rect = row.getBoundingClientRect()
  markerStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top + rect.height / 2 - 12}px`,
  }
}

watch(() => selectedAsset.value?.id, updateMarker)

/* ============================================================
   MOCK API
   ============================================================ */

interface PageResult {
  items: AssetItem[]
  nextCursor: number
  hasMore: boolean
}

interface GroupMeta {
  id: string
  label: string
  count: number
  issues: { critical: number; high: number; medium: number; low: number }
}

interface GroupState extends GroupMeta {
  expanded: boolean
  items: AssetItem[]
  cursor: number
  hasMore: boolean
  loading: boolean
}

function fetchPage(allItems: AssetItem[], cursor: number, signal?: AbortSignal): Promise<PageResult> {
  return new Promise((resolve, reject) => {
    const delay = 200 + (cursor === 0 ? 100 : 0)
    const t = setTimeout(() => {
      const slice = allItems.slice(cursor, cursor + PAGE_SIZE)
      resolve({ items: slice, nextCursor: cursor + slice.length, hasMore: cursor + slice.length < allItems.length })
    }, delay)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }
  })
}

function computeGroups(allItems: AssetItem[], groupByField: string): GroupMeta[] {
  const map = new Map<string, GroupMeta>()
  for (const item of allItems) {
    const key = String((item as unknown as Record<string, unknown>)[groupByField])
    if (!map.has(key)) {
      map.set(key, { id: key, label: key, count: 0, issues: { critical: 0, high: 0, medium: 0, low: 0 } })
    }
    const g = map.get(key)!
    g.count++
    g.issues.critical += item.issues.critical
    g.issues.high += item.issues.high
    g.issues.medium += item.issues.medium
    g.issues.low += item.issues.low
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function fetchGroupMetadata(allItems: AssetItem[], groupByField: string): Promise<GroupMeta[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(computeGroups(allItems, groupByField)), 300)
  })
}

function fetchGroupPage(allItems: AssetItem[], groupId: string, groupByField: string, cursor: number): Promise<PageResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const groupItems = allItems.filter(
        (item) => String((item as unknown as Record<string, unknown>)[groupByField]) === groupId
      )
      const slice = groupItems.slice(cursor, cursor + PAGE_SIZE)
      resolve({ items: slice, nextCursor: cursor + slice.length, hasMore: cursor + slice.length < groupItems.length })
    }, 250)
  })
}

/* ============================================================
   REACTIVE STATE
   ============================================================ */

type SelMode = 'none' | 'some' | 'all'
type Density = 'comfortable' | 'compact'
type SortDir = 'asc' | 'desc'

const columns = ref<ColDef[]>(INITIAL_COLUMNS.map((c) => ({ ...c })))
const density = ref<Density>('comfortable')
const groupBy = ref<string | null>(null)
const GROUP_BY_LABELS: Record<string, string> = {
  assetClass: 'Class',
  team: 'Team',
  type: 'Type',
  environment: 'Environment',
}
const groupByLabel = computed(() => groupBy.value ? (GROUP_BY_LABELS[groupBy.value] ?? 'Groups') : 'Groups')
const sortCol = ref<ColId | null>('riskScore')
const sortDir = ref<SortDir>('desc')
const groupSortCol = ref<string>('follow')
const groupSortDir = ref<SortDir>('asc')
const sortPopoverOpen = ref(false)
const sortBtnRef = ref<HTMLElement | null>(null)

// Selection
const selMode = ref<SelMode>('none')
const selIncluded = ref<Set<string>>(new Set())
const selExcluded = ref<Set<string>>(new Set())

// Flat mode
const flatItems = ref<AssetItem[]>([])
const flatCursor = ref(0)
const flatHasMore = ref(true)
const flatLoading = ref(false)

// Group mode
const groups = ref<GroupState[]>([])

// UI state
const colPanelOpen = ref(false)
const scrolledX = ref(false)

// ── Table options drawer focus management ──────────────────────
const colPanelTriggerRef = ref<HTMLElement | null>(null)
const colPanelCloseRef   = ref<HTMLElement | null>(null)
const colPanelRef        = ref<HTMLElement | null>(null)

watch(colPanelOpen, async (open) => {
  if (open) {
    await nextTick()
    colPanelCloseRef.value?.focus()
  } else {
    colPanelTriggerRef.value?.focus()
  }
})

function onDrawerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    colPanelOpen.value = false
    return
  }
  if (e.key !== 'Tab') return

  const panel = colPanelRef.value
  if (!panel) return
  const focusable = Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.hasAttribute('disabled'))

  const first = focusable[0]
  const last  = focusable[focusable.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }
}
const loadStatus = ref('')

// Refs
const scrollWrapperRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)

// AbortController for inflight requests
let abortCtrl: AbortController | null = null
let mainObserver: IntersectionObserver | null = null

/* ============================================================
   COMPUTED
   ============================================================ */

function applyChip(item: AssetItem, chip: FilterChip): boolean {
  const op = chip.operator
  const val = chip.value
  switch (chip.filterId) {
    case 'asset-type':
      return op === 'is' ? item.type === val : item.type !== val
    case 'asset-class':
      return op === 'is' ? item.assetClass === val : item.assetClass !== val
    case 'environment':
      return op === 'is' ? item.environment === val : item.environment !== val
    case 'team':
      return op === 'is' ? item.team === val : item.team !== val
    case 'language':
      return op === 'is' ? item.language === val : item.language !== val
    case 'exposure':
      return op === 'is' ? item.visibility === val : item.visibility !== val
    case 'issue-severity': {
      const has =
        val === 'Critical' ? item.issues.critical > 0 :
        val === 'High'     ? item.issues.high > 0 :
        val === 'Medium'   ? item.issues.medium > 0 :
        val === 'Low'      ? item.issues.low > 0 : false
      return op === 'is' ? has : !has
    }
    case 'risk-score': {
      const n = Number(val)
      if (isNaN(n)) return true
      if (op === '>') return item.riskScore > n
      if (op === '<') return item.riskScore < n
      if (op === '=') return item.riskScore === n
      return true
    }
    case 'ecosystem':
      return op === 'is' ? item.ecosystem === val : item.ecosystem !== val
    case 'lifecycle-stage':
      return op === 'is' ? item.lifecycleStage === val : item.lifecycleStage !== val
    case 'fixability':
      return op === 'is' ? item.fixability === val : item.fixability !== val
    case 'exploitability':
      return op === 'is' ? item.exploitability === val : item.exploitability !== val
    case 'issue-type':
      return op === 'is' ? item.issueType === val : item.issueType !== val
    case 'license':
      return op === 'is' ? item.license === val : item.license !== val
    case 'license-type':
      return op === 'is' ? item.licenseType === val : item.licenseType !== val
    case 'tag': {
      const lower = val.toLowerCase()
      if (op === 'is') return item.tags.some((t) => t.toLowerCase() === lower)
      if (op === 'is not') return !item.tags.some((t) => t.toLowerCase() === lower)
      const match = item.tags.some((t) => t.toLowerCase().includes(lower))
      return op === 'contains' ? match : !match
    }
    default:
      return true
  }
}

function applyAdvancedQuery(item: AssetItem, query: AdvancedQuery): boolean {
  if (query.groups.length === 0) return true
  const matchGroup = (group: { operator: 'AND' | 'OR'; conditions: FilterCondition[] }): boolean => {
    if (group.conditions.length === 0) return true
    return group.operator === 'AND'
      ? group.conditions.every((c) => applyChip(item, c))
      : group.conditions.some((c) => applyChip(item, c))
  }
  return query.groupOperator === 'AND'
    ? query.groups.every(matchGroup)
    : query.groups.some(matchGroup)
}

const filteredDataset = computed<AssetItem[]>(() => {
  let result: AssetItem[] = DATASET

  const q = props.search?.trim().toLowerCase()
  if (q) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.team.toLowerCase().includes(q) ||
      item.environment.toLowerCase().includes(q)
    )
  }

  if (props.advancedQuery && props.advancedQuery.groups.length > 0) {
    const aq = props.advancedQuery
    result = result.filter((item) => applyAdvancedQuery(item, aq))
  } else {
    const chips = props.filters ?? []
    if (chips.length) {
      const chipGroups = new Map<string, FilterChip[]>()
      for (const chip of chips) {
        const key = chip.filterId ?? chip.id
        if (!chipGroups.has(key)) chipGroups.set(key, [])
        chipGroups.get(key)!.push(chip)
      }
      result = result.filter((item) =>
        Array.from(chipGroups.values()).every((group) =>
          group.some((chip) => applyChip(item, chip))
        )
      )
    }
  }

  return result
})

const visibleCols = computed(() => columns.value.filter((c) => c.visible))

const colTemplate = computed(() =>
  visibleCols.value.map((c) => c.autoWidth ? `minmax(${c.width}px, max-content)` : c.width + 'px').join(' ')
)

const gridStyle = computed(() => ({ '--col-template': colTemplate.value }))

const sortedFlatItems = computed<AssetItem[]>(() => {
  if (!sortCol.value) return flatItems.value
  const col = sortCol.value
  return [...flatItems.value].sort((a, b) => {
    let cmp = 0
    if (col === 'riskScore') {
      cmp = a.riskScore - b.riskScore
    } else {
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      cmp = aVal.localeCompare(bVal)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

// Sorted full dataset — used as the source for group item pagination
const sortedFilteredDataset = computed<AssetItem[]>(() => {
  if (!sortCol.value) return filteredDataset.value
  const col = sortCol.value
  return [...filteredDataset.value].sort((a, b) => {
    let cmp = 0
    if (col === 'riskScore') {
      cmp = a.riskScore - b.riskScore
    } else {
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      cmp = aVal.localeCompare(bVal)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const sortLabel = computed(() => columns.value.find(c => c.id === sortCol.value)?.label ?? '')
const sortArrow = computed(() => {
  const col = columns.value.find(c => c.id === sortCol.value)
  const showDown = col?.defaultDesc ? sortDir.value === 'desc' : sortDir.value === 'asc'
  return showDown ? '↓' : '↑'
})

const sortableColumns = computed<SortColDef[]>(() =>
  columns.value.filter(c => c.sortable && c.id !== 'select').map(c => ({ id: c.id, label: c.label, defaultDesc: c.defaultDesc }))
)

const sortDisplayText = computed(() => {
  const assetPart = `${sortLabel.value} ${sortArrow.value}`
  if (groupBy.value && groupSortCol.value !== 'follow') {
    const groupLabel = groupSortCol.value === 'name' ? 'Name' : 'Risk score'
    const groupIsDefaultDesc = groupSortCol.value === 'riskScore'
    const groupArrow = (groupIsDefaultDesc ? groupSortDir.value === 'desc' : groupSortDir.value === 'asc') ? '↓' : '↑'
    return `${groupLabel} ${groupArrow} › ${assetPart}`
  }
  return assetPart
})

const sortedGroups = computed<GroupState[]>(() => {
  if (!groupBy.value) return groups.value

  const gBy = groupBy.value

  // Explicit group sort (Name or Risk score)
  if (groupSortCol.value !== 'follow') {
    const mul = groupSortDir.value === 'asc' ? 1 : -1
    if (groupSortCol.value === 'name') {
      return [...groups.value].sort((a, b) => mul * a.label.localeCompare(b.label))
    }
    if (groupSortCol.value === 'riskScore') {
      const byGroup = new Map<string, AssetItem[]>()
      for (const g of groups.value) byGroup.set(g.id, [])
      for (const item of filteredDataset.value) {
        const gId = String((item as unknown as Record<string, unknown>)[gBy])
        byGroup.get(gId)?.push(item)
      }
      return [...groups.value].sort((a, b) => {
        const sa = (byGroup.get(a.id) ?? []).map(i => i.riskScore).sort((x, y) => y - x)
        const sb = (byGroup.get(b.id) ?? []).map(i => i.riskScore).sort((x, y) => y - x)
        for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
          const va = sa[i] ?? -Infinity
          const vb = sb[i] ?? -Infinity
          if (va !== vb) return mul * (va - vb)
        }
        return 0
      })
    }
    return groups.value
  }

  // Follow asset sorting
  if (!sortCol.value) return groups.value

  const col = sortCol.value
  const mul = sortDir.value === 'asc' ? 1 : -1

  // Build groupId → all items map once (avoids O(G²·N) repeated filtering)
  const byGroup = new Map<string, AssetItem[]>()
  for (const g of groups.value) byGroup.set(g.id, [])
  for (const item of filteredDataset.value) {
    const gId = String((item as unknown as Record<string, unknown>)[gBy])
    byGroup.get(gId)?.push(item)
  }

  function compareGroups(a: GroupState, b: GroupState): number {
    const ia = byGroup.get(a.id) ?? []
    const ib = byGroup.get(b.id) ?? []

    if (col === 'riskScore') {
      const sa = ia.map(i => i.riskScore).sort((x, y) => y - x)
      const sb = ib.map(i => i.riskScore).sort((x, y) => y - x)
      for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
        const va = sa[i] ?? -Infinity
        const vb = sb[i] ?? -Infinity
        if (va !== vb) return mul * (va - vb)
      }
      return 0
    }

    function modal(items: AssetItem[]): [string, number] {
      const freq = new Map<string, number>()
      for (const item of items) {
        const v = String((item as unknown as Record<string, unknown>)[col] ?? '')
        freq.set(v, (freq.get(v) ?? 0) + 1)
      }
      let bestVal = '', bestCount = 0
      for (const [v, c] of freq) {
        if (c > bestCount || (c === bestCount && v < bestVal)) {
          bestVal = v; bestCount = c
        }
      }
      return [bestVal, bestCount]
    }

    const [va, ca] = modal(ia)
    const [vb, cb] = modal(ib)
    const cmpVal = va.localeCompare(vb)
    if (cmpVal !== 0) return mul * cmpVal
    return cb - ca
  }

  return [...groups.value].sort(compareGroups)
})

// Selection helpers
function isSelected(id: string): boolean {
  if (selMode.value === 'none') return false
  if (selMode.value === 'all') return !selExcluded.value.has(id)
  return selIncluded.value.has(id)
}

// Computed map of groupId → checkbox state so Vue explicitly tracks
// selMode / selIncluded / selExcluded as dependencies. A plain function
// called from the template can miss re-evaluation when selection changes
// while groups are first loading (async boundary in loadGroupMeta).
const groupCheckboxStates = computed<Map<string, false | 'indeterminate' | 'group-checked'>>(() => {
  const map = new Map<string, false | 'indeterminate' | 'group-checked'>();
  if (!groupBy.value) return map
  const gBy = groupBy.value
  for (const group of groups.value) {
    const items = sortedFilteredDataset.value.filter(
      (item) => String((item as unknown as Record<string, unknown>)[gBy]) === group.id
    )
    if (items.length === 0) {
      map.set(group.id, false)
    } else if (items.every((i) => isSelected(i.id))) {
      map.set(group.id, 'group-checked')
    } else if (items.some((i) => isSelected(i.id))) {
      map.set(group.id, 'indeterminate')
    } else {
      map.set(group.id, false)
    }
  }
  return map
})



const headerCbAllChecked = computed(() => selMode.value === 'all' && selExcluded.value.size === 0)
const headerCbIndeterminate = computed(() => !headerCbAllChecked.value && selMode.value !== 'none')

const selectedCount = computed(() => {
  if (selMode.value === 'none') return 0
  if (selMode.value === 'all') return filteredDataset.value.length - selExcluded.value.size
  return selIncluded.value.size
})

/* ============================================================
   SELECTION ACTIONS
   ============================================================ */

function toggleItem(id: string) {
  if (selMode.value === 'all') {
    const next = new Set(selExcluded.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selExcluded.value = next
  } else {
    const next = new Set(selIncluded.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selIncluded.value = next
    selMode.value = next.size === 0 ? 'none' : 'some'
  }
}

function selectAll() {
  selMode.value = 'all'
  selExcluded.value = new Set()
}

function deselectAll() {
  selMode.value = 'none'
  selIncluded.value = new Set()
  selExcluded.value = new Set()
}

function toggleGroupItems(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group) return
  // Derive the full item list from the source dataset so this works even when
  // the group is collapsed and group.items hasn't been lazy-loaded yet.
  const allGroupItems = sortedFilteredDataset.value.filter(
    (item) => String((item as unknown as Record<string, unknown>)[groupBy.value!]) === groupId
  )
  if (allGroupItems.length === 0) return
  // Deselect if any items are selected (covers both indeterminate and group-checked);
  // select all only when the group is fully unchecked.
  const anySel = allGroupItems.some((item) => isSelected(item.id))
  if (anySel) {
    if (selMode.value === 'all') {
      const next = new Set(selExcluded.value)
      allGroupItems.forEach((item) => next.add(item.id))
      selExcluded.value = next
    } else {
      const next = new Set(selIncluded.value)
      allGroupItems.forEach((item) => next.delete(item.id))
      if (next.size === 0) selMode.value = 'none'
      selIncluded.value = next
    }
  } else {
    if (selMode.value === 'all') {
      const next = new Set(selExcluded.value)
      allGroupItems.forEach((item) => next.delete(item.id))
      selExcluded.value = next
    } else {
      selMode.value = 'some'
      const next = new Set(selIncluded.value)
      allGroupItems.forEach((item) => next.add(item.id))
      selIncluded.value = next
    }
  }
}

/* ============================================================
   SORT
   ============================================================ */

function handleSort(colId: ColId) {
  if (sortCol.value === colId) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = colId
    sortDir.value = 'asc'
  }
  groupSortCol.value = 'follow'
}

function setSort(col: string, dir: SortDir) {
  sortCol.value = col as ColId
  sortDir.value = dir
}

function setGroupSort(col: string, dir: SortDir) {
  groupSortCol.value = col
  groupSortDir.value = dir
}

/* ============================================================
   COLUMN VISIBILITY
   ============================================================ */

function toggleColVisibility(colId: ColId) {
  columns.value = columns.value.map((c) =>
    c.id === colId && !c.sticky ? { ...c, visible: !c.visible } : c
  )
}

/* ============================================================
   FLAT LOADING
   ============================================================ */

async function loadMoreFlat() {
  if (flatLoading.value || !flatHasMore.value || groupBy.value) return
  flatLoading.value = true
  abortCtrl = new AbortController()
  loadStatus.value = 'Loading assets…'
  try {
    const result = await fetchPage(filteredDataset.value, flatCursor.value, abortCtrl.signal)
    flatItems.value = [...flatItems.value, ...result.items]
    flatCursor.value = result.nextCursor
    flatHasMore.value = result.hasMore
    loadStatus.value = result.hasMore
      ? `Loaded ${result.nextCursor.toLocaleString()} of ${filteredDataset.value.length.toLocaleString()} assets`
      : `All ${filteredDataset.value.length.toLocaleString()} assets loaded`
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') {
      loadStatus.value = 'Error loading assets.'
    }
  } finally {
    flatLoading.value = false
    abortCtrl = null
  }
}

/* ============================================================
   GROUP LOADING
   ============================================================ */

async function loadGroupMeta(gBy: string) {
  loadStatus.value = 'Loading groups…'
  const metas = await fetchGroupMetadata(filteredDataset.value, gBy)
  groups.value = metas.map((g) => ({
    ...g,
    expanded: false,
    items: [],
    cursor: 0,
    hasMore: true,
    loading: false,
  }))
  loadStatus.value = `${metas.length} groups loaded`
}

async function loadGroupItems(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group || group.loading || !group.hasMore) return

  groups.value = groups.value.map((g) => g.id === groupId ? { ...g, loading: true } : g)

  try {
    const result = await fetchGroupPage(sortedFilteredDataset.value, groupId, groupBy.value!, group.cursor)
    groups.value = groups.value.map((g) => {
      if (g.id !== groupId) return g
      return { ...g, items: [...g.items, ...result.items], cursor: result.nextCursor, hasMore: result.hasMore, loading: false }
    })
  } catch (err) {
    console.error('Group load error:', err)
    groups.value = groups.value.map((g) => g.id === groupId ? { ...g, loading: false } : g)
  }
}

function toggleGroupExpand(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  const wasExpanded = group?.expanded ?? false
  groups.value = groups.value.map((g) =>
    g.id === groupId ? { ...g, expanded: !g.expanded } : g
  )
  if (!wasExpanded && group && group.items.length === 0) {
    setTimeout(() => loadGroupItems(groupId), 0)
  }
}

/* ============================================================
   RESET ON DATASET / GROUPBY CHANGE
   ============================================================ */

function resetAndReload() {
  abortCtrl?.abort()
  flatItems.value = []
  flatCursor.value = 0
  flatHasMore.value = true
  flatLoading.value = false
  loadStatus.value = ''
  groups.value = []

  if (groupBy.value) {
    loadGroupMeta(groupBy.value)
  } else {
    // trigger flat load via observer or direct call
    nextTick(() => loadMoreFlat())
  }
}

watch(() => props.search, resetAndReload)
watch(() => props.filters, resetAndReload, { deep: true })
watch(() => props.advancedQuery, resetAndReload, { deep: true })
watch(() => groupBy.value, resetAndReload)

// ── Animated count display ────────────────────────────────────
const displayedCount = ref(filteredDataset.value.length)
let countRafId: number | null = null

watch(() => filteredDataset.value.length, (newVal) => {
  if (countRafId !== null) cancelAnimationFrame(countRafId)
  const start = displayedCount.value  // animate from wherever we currently are
  const end = newVal
  const duration = 450
  const startTime = performance.now()

  function tick(now: number) {
    const t = Math.min((now - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)  // easeOutCubic
    displayedCount.value = Math.round(start + (end - start) * eased)
    if (t < 1) countRafId = requestAnimationFrame(tick)
    else countRafId = null
  }

  countRafId = requestAnimationFrame(tick)
})

// When sort changes in grouped mode, reset each group's items and reload expanded ones
watch([sortCol, sortDir], () => {
  if (!groupBy.value) return
  const expandedIds = groups.value.filter(g => g.expanded).map(g => g.id)
  groups.value = groups.value.map(g => ({ ...g, items: [], cursor: 0, hasMore: true, loading: false }))
  for (const id of expandedIds) loadGroupItems(id)
})

/* ============================================================
   MAIN INTERSECTION OBSERVER (flat mode sentinel)
   ============================================================ */

function setupMainObserver() {
  mainObserver?.disconnect()
  mainObserver = null
  if (!sentinelRef.value || groupBy.value) return

  mainObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !flatLoading.value && flatHasMore.value) {
        loadMoreFlat()
      }
    },
    { rootMargin: '200px' }
  )
  mainObserver.observe(sentinelRef.value)
}

/* ============================================================
   GROUP SENTINEL OBSERVER
   ============================================================ */

// Map of groupId -> observer
const groupObservers = new Map<string, IntersectionObserver>()

function setupGroupSentinel(el: Element | null, groupId: string) {
  if (!el) return
  // Clean up existing observer for this group
  groupObservers.get(groupId)?.disconnect()

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadGroupItems(groupId)
      }
    },
    { rootMargin: '200px' }
  )
  obs.observe(el)
  groupObservers.set(groupId, obs)
}

function cleanupGroupObservers() {
  groupObservers.forEach((obs) => obs.disconnect())
  groupObservers.clear()
}

/* ============================================================
   SCROLL HANDLER
   ============================================================ */

function onScroll() {
  scrolledX.value = (scrollWrapperRef.value?.scrollLeft ?? 0) > 0
}

/* ============================================================
   CLICK OUTSIDE to close col panel
   ============================================================ */

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.at-toolbar-item') && !target.closest('.topt-panel')) {
    colPanelOpen.value = false
  }
  // Close the drawer on outside click, unless the click is inside the
  // drawer panel itself or on a table row (row click will handle navigation).
  if (selectedAsset.value && !target.closest('.dr-panel') && !target.closest('.at-data-row')) {
    selectedAsset.value   = null
    drawerTriggerEl.value = null
  }
}

function handleKeyEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') { selectedAsset.value = null; drawerTriggerEl.value = null }
}

/* ============================================================
   LIFECYCLE
   ============================================================ */

let scrollWrapperRo: ResizeObserver | null = null

onMounted(() => {
  // Initial load
  loadMoreFlat()
  nextTick(() => setupMainObserver())
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyEsc)

  nextTick(() => {
    const el = scrollWrapperRef.value
    if (!el) return
    const update = () => el.style.setProperty('--scroll-wrapper-width', el.clientWidth + 'px')
    update()
    scrollWrapperRo = new ResizeObserver(update)
    scrollWrapperRo.observe(el)
  })
})

onUnmounted(() => {
  mainObserver?.disconnect()
  cleanupGroupObservers()
  scrollWrapperRo?.disconnect()
  abortCtrl?.abort()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyEsc)
})

// Re-setup sentinel when sentinel mounts
watch(sentinelRef, (el) => {
  if (el && !groupBy.value) {
    setupMainObserver()
  }
})

/* ============================================================
   HELPERS
   ============================================================ */

type BadgeType = 'default' | 'dimmed' | 'info' | 'success' | 'danger' | 'warning'

function classBadgeType(assetClass: string): BadgeType {
  return ({ A: 'danger', B: 'warning', C: 'default', D: 'dimmed' } as Record<string, BadgeType>)[assetClass] ?? 'default'
}

function scoreBadgeType(score: number): BadgeType {
  if (score === 0)   return 'dimmed'
  if (score >= 500)  return 'danger'
  if (score >= 250)  return 'warning'
  return 'default'
}

function envBadgeType(env: string): BadgeType {
  return ({
    'Production':  'danger',
    'Staging':     'warning',
    'Development': 'info',
    'Testing':     'success',
  } as Record<string, BadgeType>)[env] ?? 'default'
}

function ariaSortFor(col: ColDef): 'ascending' | 'descending' | 'none' | undefined {
  if (!col.sortable) return undefined
  if (sortCol.value === col.id) return sortDir.value === 'asc' ? 'ascending' : 'descending'
  return 'none'
}
</script>

<template>
  <div class="at-table-container">
    <!-- Table toolbar -->
    <div class="at-table-header">
      <div class="at-table-header__caption">
        <span class="at-table-header__title">Assets</span>
        <span class="at-table-header__divider">|</span>
        <span class="at-table-header__count">
          {{ displayedCount.toLocaleString() }} assets
        </span>
      </div>
      <div class="at-table-header__actions">
        <!-- Group by -->
        <RadioBar
          label="Group by:"
          size="s"
          :show-clear="true"
          clear-tooltip="Clear grouping"
          :options="[
            { label: 'Class',       value: 'assetClass' },
            { label: 'Team',        value: 'team' },
            { label: 'Type',        value: 'type' },
            { label: 'Environment', value: 'environment' },
          ]"
          :model-value="groupBy ?? ''"
          @update:model-value="(v) => { groupBy = v || null }"
        />

        <!-- Sort by display -->
        <button
          ref="sortBtnRef"
          class="at-sort-display"
          :aria-expanded="sortPopoverOpen"
          aria-haspopup="listbox"
          @click.stop="sortPopoverOpen = !sortPopoverOpen"
        >
          <span class="at-sort-display__label">Sort by:</span>
          <span class="at-sort-display__value">{{ sortDisplayText }}</span>
        </button>

        <SortPopover
          v-if="sortPopoverOpen"
          :sort-col="sortCol"
          :sort-dir="sortDir"
          :group-sort-col="groupSortCol"
          :group-sort-dir="groupSortDir"
          :columns="sortableColumns"
          :is-grouped="!!groupBy"
          :group-label="groupByLabel"
          :trigger-el="sortBtnRef"
          @set-sort="(col, dir) => setSort(col, dir)"
          @set-group-sort="(col, dir) => setGroupSort(col, dir)"
          @close="sortPopoverOpen = false"
        />

        <!-- Table options trigger -->
        <div class="at-toolbar-item">
          <button
            ref="colPanelTriggerRef"
            class="at-icon-btn at-icon-btn--square"
            :aria-expanded="colPanelOpen"
            aria-haspopup="dialog"
            aria-label="Table options"
            @click.stop="colPanelOpen = !colPanelOpen; hideTableOptsTooltip()"
            @mouseenter="showTableOptsTooltip"
            @mouseleave="hideTableOptsTooltip"
            @focus="showTableOptsTooltip"
            @blur="hideTableOptsTooltip"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1q-.09-.03-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1q.09.03.18.03c.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64zm-1.98-1.71c.04.31.05.52.05.73s-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Selection bar removed — bulk action popover will replace it -->

    <!-- Scroll wrapper -->
    <div
      ref="scrollWrapperRef"
      class="at-grid-scroll-wrapper"
      :class="{ 'at-scrolled-x': scrolledX }"
      @scroll="onScroll"
    >
      <!-- Grid -->
      <div
        role="grid"
        class="at-grid"
        :class="`at-density-${density}`"
        :style="(gridStyle as any)"
        :aria-rowcount="filteredDataset.length"
        :aria-colcount="visibleCols.length"
      >
        <!-- Header -->
        <div class="at-grid-head">
          <div role="row" class="at-header-row">
            <template v-for="(col, colIndex) in visibleCols" :key="col.id">
              <!-- Select column header -->
              <div
                v-if="col.id === 'select'"
                role="columnheader"
                data-col-id="select"
                class="at-cell"
                :aria-colindex="colIndex + 1"
              >
                <ParentCheckbox
                  :model-value="headerCbAllChecked ? 'group-checked' : headerCbIndeterminate ? 'indeterminate' : false"
                  aria-label="Select all visible rows"
                  @update:model-value="selMode === 'none' ? selectAll() : deselectAll()"
                />
              </div>
              <!-- Other column headers -->
              <div
                v-else
                role="columnheader"
                :data-col-id="col.id"
                class="at-cell"
                :class="{ 'at-sortable': col.sortable }"
                :aria-colindex="colIndex + 1"
                :aria-sort="ariaSortFor(col)"
              >
                <button
                  v-if="col.label && col.sortable"
                  class="at-col-sort-btn"
                  :aria-label="`Sort by ${col.label}`"
                  @click="handleSort(col.id)"
                >
                  {{ col.label }}
                  <span class="at-sort-indicator" aria-hidden="true" />
                </button>
                <span v-else-if="col.label">{{ col.label }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Body -->
        <div id="at-grid-body">
          <!-- Grouped mode -->
          <template v-if="groupBy">
            <div v-for="group in sortedGroups" :key="group.id">
              <!-- Group header -->
              <div
                role="row"
                class="at-group-header-row"
                :data-group-id="group.id"
                tabindex="0"
                :aria-expanded="group.expanded"
                @click="toggleGroupExpand(group.id)"
                @keydown.enter.prevent="toggleGroupExpand(group.id)"
                @keydown.space.prevent="toggleGroupExpand(group.id)"
              >
                <div role="gridcell" class="at-group-header-cell">
                  <ParentCheckbox
                    :model-value="groupCheckboxStates.get(group.id) ?? false"
                    :aria-label="`Select all in ${group.label}`"
                    @update:model-value="toggleGroupItems(group.id)"
                    @click.stop
                  />
                  <button
                    class="at-group-toggle"
                    :aria-expanded="group.expanded"
                    :aria-label="`${group.expanded ? 'Collapse' : 'Expand'} group ${group.label}`"
                    @click.stop="toggleGroupExpand(group.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <div class="at-group-header-cell__left">
                    <span class="at-group-header-cell__name">{{ group.label }}</span>
                    <span class="at-group-header-cell__count">({{ group.count }} assets)</span>
                  </div>
                  <div class="at-group-header-cell__right">
                    <span class="at-group-header-cell__metric" style="color: var(--at-critical);">
                      {{ group.issues.critical }}c critical
                    </span>
                    <span class="at-group-header-cell__metric">
                      Issues: {{ group.issues.high }}h {{ group.issues.medium }}m
                    </span>
                  </div>
                </div>
              </div>

              <!-- Group body -->
              <div v-if="group.expanded" :data-group-body="group.id" class="at-group-body">
                <div v-if="group.loading && group.items.length === 0" class="at-group-loading">
                  Loading…
                </div>
                <!-- Data rows -->
                <div
                  v-for="(item, idx) in group.items"
                  :key="item.id"
                  role="row"
                  :aria-rowindex="idx + 1"
                  :aria-selected="isSelected(item.id)"
                  :data-id="item.id"
                  class="at-data-row"
                  :class="{ 'at-data-row--active': selectedAsset?.id === item.id }"
                  tabindex="0"
                  @click="openAsset(item)"
                >
                  <template v-for="col in visibleCols" :key="col.id">
                    <div role="gridcell" :data-col-id="col.id" class="at-cell">
                      <!-- select -->
                      <Checkbox
                        v-if="col.id === 'select'"
                        :model-value="isSelected(item.id)"
                        :aria-label="`Select ${item.name}`"
                        @update:model-value="toggleItem(item.id)"
                        @click.stop
                      />
                      <!-- name -->
                      <div v-else-if="col.id === 'name'" class="at-asset-name-cell">
                        <button class="at-asset-name-primary" :aria-label="`Open ${item.name}`" @click.stop="openAsset(item, $event.currentTarget as HTMLElement)">
                          {{ item.name }}
                        </button>
                        <span class="at-asset-name-secondary">{{ getSecondaryLine(item) }}</span>
                      </div>
                      <!-- type -->
                      <span v-else-if="col.id === 'type'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.type }}
                      </span>
                      <!-- assetClass -->
                      <Badge v-else-if="col.id === 'assetClass'" :text="item.assetClass" :type="classBadgeType(item.assetClass)" />
                      <!-- issueCounts -->
                      <div v-else-if="col.id === 'issueCounts'" class="at-issue-counts">
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--critical" aria-hidden="true">C</div>
                          <span class="at-issue-count--critical">{{ item.issues.critical }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--high" aria-hidden="true">H</div>
                          <span class="at-issue-count--high">{{ item.issues.high }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--medium" aria-hidden="true">M</div>
                          <span class="at-issue-count--medium">{{ item.issues.medium }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--low" aria-hidden="true">L</div>
                          <span class="at-issue-count--low">{{ item.issues.low }}</span>
                        </div>
                      </div>
                      <!-- riskScore -->
                      <Badge
                        v-else-if="col.id === 'riskScore'"
                        :text="item.riskScore === 0 ? '—' : String(item.riskScore)"
                        :type="scoreBadgeType(item.riskScore)"
                        :aria-label="`Risk score: ${item.riskScore === 0 ? 'none' : item.riskScore}`"
                      />
                      <!-- coverage -->
                      <div v-else-if="col.id === 'coverage'" class="at-coverage-grid">
                        <div
                          v-for="cov in COVERAGE_TYPES"
                          :key="cov"
                          :class="`at-coverage-icon ${item.coverage.includes(cov) ? 'at-coverage-icon--active' : 'at-coverage-icon--empty'}`"
                          :title="cov"
                        >
                          {{ COVERAGE_ABBREV[cov] ?? cov.slice(0, 3) }}
                        </div>
                      </div>
                      <!-- team -->
                      <span v-else-if="col.id === 'team'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.team }}
                      </span>
                      <!-- language -->
                      <span v-else-if="col.id === 'language'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.language }}
                      </span>
                      <!-- environment -->
                      <Badge v-else-if="col.id === 'environment'" :text="item.environment" :type="envBadgeType(item.environment)" />
                      <!-- lastScan -->
                      <span v-else-if="col.id === 'lastScan'" style="font-size: 12px; color: var(--at-text-2);">
                        {{ item.lastScan }}
                      </span>
                      <!-- source -->
                      <div v-else-if="col.id === 'source'" class="at-tags-list">
                        <Badge v-for="s in item.source" :key="s" :text="s" />
                      </div>
                      <!-- visibility -->
                      <span v-else-if="col.id === 'visibility'" style="font-size: 12px; color: var(--at-text-2);">
                        {{ item.visibility }}
                      </span>
                      <!-- actions -->
                      <button
                        v-else-if="col.id === 'actions'"
                        class="at-row-action-btn"
                        aria-label="Options"
                        @click.stop
                        @mouseenter="showActionTooltip"
                        @mouseleave="hideActionTooltip"
                        @focus="showActionTooltip"
                        @blur="hideActionTooltip"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>
                  </template>
                </div>

                <!-- Group sentinel -->
                <div
                  v-if="group.hasMore"
                  class="at-sentinel"
                  aria-hidden="true"
                  :data-group-sentinel="group.id"
                  :ref="(el) => setupGroupSentinel(el as Element | null, group.id)"
                />
              </div>
            </div>
          </template>

          <!-- Flat mode -->
          <template v-else>
            <div
              v-for="(item, idx) in sortedFlatItems"
              :key="item.id"
              role="row"
              :aria-rowindex="idx + 1"
              :aria-selected="isSelected(item.id)"
              :data-id="item.id"
              class="at-data-row"
              :class="{ 'at-data-row--active': selectedAsset?.id === item.id }"
              tabindex="0"
              @click="openAsset(item)"
            >
              <template v-for="col in visibleCols" :key="col.id">
                <div role="gridcell" :data-col-id="col.id" class="at-cell">
                  <Checkbox
                    v-if="col.id === 'select'"
                    :model-value="isSelected(item.id)"
                    :aria-label="`Select ${item.name}`"
                    @update:model-value="toggleItem(item.id)"
                    @click.stop
                  />
                  <div v-else-if="col.id === 'name'" class="at-asset-name-cell">
                    <button class="at-asset-name-primary" :aria-label="`Open ${item.name}`" @click.stop="openAsset(item, $event.currentTarget as HTMLElement)">
                      {{ item.name }}
                    </button>
                    <span class="at-asset-name-secondary">{{ getSecondaryLine(item) }}</span>
                  </div>
                  <span v-else-if="col.id === 'type'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.type }}
                  </span>
                  <Badge v-else-if="col.id === 'assetClass'" :text="item.assetClass" :type="classBadgeType(item.assetClass)" />
                  <div v-else-if="col.id === 'issueCounts'" class="at-issue-counts">
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--critical" aria-hidden="true">C</div>
                      <span class="at-issue-count--critical">{{ item.issues.critical }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--high" aria-hidden="true">H</div>
                      <span class="at-issue-count--high">{{ item.issues.high }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--medium" aria-hidden="true">M</div>
                      <span class="at-issue-count--medium">{{ item.issues.medium }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--low" aria-hidden="true">L</div>
                      <span class="at-issue-count--low">{{ item.issues.low }}</span>
                    </div>
                  </div>
                  <Badge
                    v-else-if="col.id === 'riskScore'"
                    :text="item.riskScore === 0 ? '—' : String(item.riskScore)"
                    :type="scoreBadgeType(item.riskScore)"
                  />
                  <div v-else-if="col.id === 'coverage'" class="at-coverage-grid">
                    <div
                      v-for="cov in COVERAGE_TYPES"
                      :key="cov"
                      :class="`at-coverage-icon ${item.coverage.includes(cov) ? 'at-coverage-icon--active' : 'at-coverage-icon--empty'}`"
                      :title="cov"
                    >
                      {{ COVERAGE_ABBREV[cov] ?? cov.slice(0, 3) }}
                    </div>
                  </div>
                  <span v-else-if="col.id === 'team'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.team }}
                  </span>
                  <span v-else-if="col.id === 'language'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.language }}
                  </span>
                  <Badge v-else-if="col.id === 'environment'" :text="item.environment" :type="envBadgeType(item.environment)" />
                  <span v-else-if="col.id === 'lastScan'" style="font-size: 12px; color: var(--at-text-2);">
                    {{ item.lastScan }}
                  </span>
                  <div v-else-if="col.id === 'source'" class="at-tags-list">
                    <Badge v-for="s in item.source.slice(0, 3)" :key="s" :text="s" />
                    <Badge v-if="item.source.length > 3" :text="`+${item.source.length - 3}`" type="dimmed" />
                  </div>
                  <span v-else-if="col.id === 'visibility'" style="font-size: 12px; color: var(--at-text-2);">
                    {{ item.visibility }}
                  </span>
                  <button
                    v-else-if="col.id === 'actions'"
                    class="at-row-action-btn"
                    aria-label="Options"
                    @click.stop
                    @mouseenter="showActionTooltip"
                    @mouseleave="hideActionTooltip"
                    @focus="showActionTooltip"
                    @blur="hideActionTooltip"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              </template>
            </div>

            <!-- Main flat sentinel -->
            <div
              ref="sentinelRef"
              class="at-sentinel"
              aria-hidden="true"
              id="at-sentinel"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="at-table-footer">
      <span class="at-load-status" aria-live="polite" id="at-load-status">
        {{ loadStatus }}
      </span>
    </div>

    <!-- SR announcer -->
    <div
      id="at-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="at-sr-only"
    />
  </div>

  <AssetDrawer
    :asset="selectedAsset"
    :assets="sortedFlatItems"
    :trigger-el="drawerTriggerEl"
    @close="selectedAsset = null; drawerTriggerEl = null"
    @navigate="selectedAsset = $event"
  />

  <!-- Table options drawer -->
  <Teleport to="body">
    <Transition name="topt">
      <aside
        v-if="colPanelOpen"
        ref="colPanelRef"
        class="topt-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Table options"
        @keydown="onDrawerKeydown"
      >
        <header class="topt-header">
          <span class="topt-header__title">Table options</span>
          <button ref="colPanelCloseRef" class="topt-header__close" aria-label="Close" @click="colPanelOpen = false">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M15.25 4.75L4.75 15.25M4.75 4.75l10.5 10.5"/>
            </svg>
          </button>
        </header>

        <div class="topt-content">
          <!-- Row density -->
          <section class="topt-section">
            <h3 class="topt-section__title">Row density</h3>
            <RadioBar
              size="l"
              :stretch="true"
              aria-label="Row density"
              :options="[
                {
                  label: 'Loose',
                  value: 'comfortable',
                  icon: 'M22 22H2V2H22V22ZM4 20H20V13H4V20ZM4 11H20V4H4V11Z',
                  iconViewBox: '0 0 24 24',
                  iconFilled: true,
                  iconFillRule: 'evenodd',
                  iconClipRule: 'evenodd',
                },
                {
                  label: 'Tight',
                  value: 'compact',
                  icon: 'M22 22H2V2H22V22ZM4 20H20V16H4V20ZM4 14H20V10H4V14ZM4 8H20V4H4V8Z',
                  iconViewBox: '0 0 24 24',
                  iconFilled: true,
                  iconFillRule: 'evenodd',
                  iconClipRule: 'evenodd',
                },
              ]"
              :model-value="density"
              @update:model-value="(v) => { density = v as 'comfortable' | 'compact' }"
            />
          </section>

          <div class="topt-divider" />

          <!-- Columns -->
          <section class="topt-section">
            <h3 class="topt-section__title">Columns</h3>
            <div class="topt-col-list">
              <label
                v-for="col in columns.filter(c => !c.sticky && c.id !== 'actions')"
                :key="col.id"
                class="at-col-vis-item"
              >
                <input
                  type="checkbox"
                  :checked="col.visible"
                  @change="toggleColVisibility(col.id)"
                />
                {{ col.label }}
              </label>
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </Teleport>

  <!-- Bulk actions bar -->
  <Teleport to="body">
    <Transition name="bab">
      <div
        v-if="selectedCount > 0"
        class="at-bab"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <!-- Count + clear -->
        <div class="at-bab__count">
          <span class="at-bab__count-text">
            {{ selectedCount }} {{ selectedCount === 1 ? 'item' : 'items' }} selected
          </span>
          <button class="at-bab__icon-btn" aria-label="Clear all" @mouseenter="showBabTooltip" @mouseleave="hideBabTooltip" @focus="showBabTooltip" @blur="hideBabTooltip" @click="deselectAll(); hideBabTooltip()">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="at-bab__divider" aria-hidden="true" />

        <!-- Actions -->
        <div class="at-bab__actions">
          <button class="at-bab__btn">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5l6-4.5-6-4.5v9z"/>
            </svg>
            Monitor
          </button>
          <button class="at-bab__btn">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L22 5c0-1.11-.9-2-1-2zm0 14H3V5h18v12zm-5-9h-2v6h2V8zm-4 0H10v6h2V8z"/>
            </svg>
            Pause
          </button>
          <button class="at-bab__btn" :disabled="selectedCount > 20">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
            </svg>
            Retest
          </button>
          <button class="at-bab__btn at-bab__btn--danger">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </Transition>
    <div v-if="babTooltipVisible" class="v9-tooltip" role="tooltip" :style="babTooltipStyle">Clear all</div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="actionTooltipVisible"
      class="v9-tooltip"
      role="tooltip"
      :style="actionTooltipStyle"
    >Options</div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="tableOptsTooltipVisible"
      class="v9-tooltip"
      role="tooltip"
      :style="tableOptsTooltipStyle"
    >Table options</div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="markerStyle"
      class="at-row-marker"
      :style="markerStyle"
      aria-hidden="true"
    />
  </Teleport>
</template>
