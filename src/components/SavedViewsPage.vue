<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  useSavedViews,
  applyViewFilters,
  formatRelativeDate,
  SCOPE_LABELS,
  VIEW_FILTER_DEFS,
  type SavedView,
} from '../data/savedViews'
import { type FilterChip, type AdvancedQuery } from '../data/filters'
import FilterBar from './FilterBar.vue'
import RadioBar from './RadioBar.vue'
import SortPopover from './SortPopover.vue'
import type { SortColDef } from './SortPopover.vue'

const props = defineProps<{
  previousPageLabel: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const { views, togglePin, deleteView } = useSavedViews()

const currentUser = 'Jakob Buhl'

let _uid = 0
function nextId() { return `vf-${++_uid}` }

// ── Filter state ───────────────────────────────────────────────────

const filters = ref<FilterChip[]>([
  { id: nextId(), filterId: 'view-page', key: 'Page', operator: 'is', value: 'Inventory' },
])

const filteredViews = computed(() => applyViewFilters(views.value, filters.value))

function removeFilter(id: string)                   { filters.value = filters.value.filter(f => f.id !== id) }
function addFilter(chip: FilterChip)                { filters.value.push(chip) }
function setFilterOperator(id: string, op: string)  { const f = filters.value.find(f => f.id === id); if (f) f.operator = op }
function setFilterValue(id: string, val: string)    { const f = filters.value.find(f => f.id === id); if (f) f.value = val }

// ── Group by / Sort by ────────────────────────────────────────────

const GROUP_BY_OPTIONS = [
  { label: 'Page',       value: 'page' },
  { label: 'Scope',      value: 'scope' },
  { label: 'Creator', value: 'createdBy' },
]

const SORT_COLS: SortColDef[] = [
  { id: 'name',      label: 'Name' },
  { id: 'page',      label: 'Page' },
  { id: 'scope',     label: 'Scope' },
  { id: 'createdBy', label: 'Creator' },
  { id: 'createdAt', label: 'Created', defaultDesc: true },
]

const groupBy        = ref<string | null>(null)
const sortCol        = ref<string>('name')
const sortDir        = ref<'asc' | 'desc'>('asc')
const sortPopoverOpen = ref(false)
const sortBtnRef     = ref<HTMLElement | null>(null)

const sortedFilteredViews = computed<SavedView[]>(() => {
  const col = sortCol.value
  return [...filteredViews.value].sort((a, b) => {
    let cmp = 0
    if (col === 'createdAt') {
      cmp = a.createdAt.getTime() - b.createdAt.getTime()
    } else if (col === 'scope') {
      cmp = SCOPE_LABELS[a.scope].localeCompare(SCOPE_LABELS[b.scope])
    } else {
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      cmp = aVal.localeCompare(bVal)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const groupedViews = computed<[string, SavedView[]][] | null>(() => {
  if (!groupBy.value) return null
  const field = groupBy.value
  const map = new Map<string, SavedView[]>()
  for (const view of sortedFilteredViews.value) {
    const key = field === 'scope'
      ? SCOPE_LABELS[view.scope]
      : String((view as unknown as Record<string, unknown>)[field])
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(view)
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const sortDisplayText = computed(() => {
  const col = SORT_COLS.find(c => c.id === sortCol.value)
  if (!col) return ''
  const showDown = col.defaultDesc ? sortDir.value === 'desc' : sortDir.value === 'asc'
  return `${col.label} ${showDown ? '↓' : '↑'}`
})

function setSort(col: string, dir: 'asc' | 'desc') {
  sortCol.value = col
  sortDir.value = dir
  sortPopoverOpen.value = false
}

function handleColSort(col: string) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = col
    const def = SORT_COLS.find(c => c.id === col)
    sortDir.value = def?.defaultDesc ? 'desc' : 'asc'
  }
}


// ── Animated count ────────────────────────────────────────────────

const displayedCount = ref(filteredViews.value.length)
let countRafId: number | null = null

watch(() => filteredViews.value.length, (newVal) => {
  if (countRafId !== null) cancelAnimationFrame(countRafId)
  const start = displayedCount.value
  const end   = newVal
  const duration  = 450
  const startTime = performance.now()
  function tick(now: number) {
    const t      = Math.min((now - startTime) / duration, 1)
    const eased  = 1 - Math.pow(1 - t, 3)
    displayedCount.value = Math.round(start + (end - start) * eased)
    if (t < 1) countRafId = requestAnimationFrame(tick)
    else countRafId = null
  }
  countRafId = requestAnimationFrame(tick)
})

// ── Summary popover ────────────────────────────────────────────────

const activeSummaryId = ref<string | null>(null)
const summaryPos      = ref({ top: '0px', left: '0px', width: '320px' })

function openSummary(id: string, event: MouseEvent) {
  if (activeSummaryId.value === id) { activeSummaryId.value = null; return }
  activeSummaryId.value = id
  const td = (event.currentTarget as HTMLElement).closest('td')!.getBoundingClientRect()
  const left = Math.max(8, td.left)
  summaryPos.value = {
    top:   `${td.bottom + 6}px`,
    left:  `${left}px`,
    width: `${Math.min(320, window.innerWidth - left - 16)}px`,
  }
}

// ── Actions dropdown ───────────────────────────────────────────────

const activeActionsId = ref<string | null>(null)
const actionsPos      = ref({ top: '0px', right: '0px' })

function openActions(id: string, event: MouseEvent) {
  if (activeActionsId.value === id) { activeActionsId.value = null; return }
  activeActionsId.value = id
  const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
  actionsPos.value = { top: `${r.bottom + 4}px`, right: `${window.innerWidth - r.right}px` }
}

function handleDelete(id: string) {
  deleteView(id)
  activeActionsId.value = null
}

// ── Outside click ──────────────────────────────────────────────────

function onOutside(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (!t.closest('.svp-summary-popover') && !t.closest('[data-summary-trigger]')) activeSummaryId.value = null
  if (!t.closest('.svp-actions-menu')    && !t.closest('[data-actions-trigger]'))  activeActionsId.value = null
  if (!t.closest('.sp-popover')          && !t.closest('.at-sort-display'))         sortPopoverOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutside))
onUnmounted(() => document.removeEventListener('mousedown', onOutside))
</script>

<template>
  <div class="svp-root">

    <!-- ── Page header ─────────────────────────────────────────── -->
    <div class="svp-header">
      <div class="page-title">
        <!-- Back button -->
        <div class="page-title__back-wrap">
          <button
            class="page-title__back-btn"
            @click="emit('back')"
            :aria-label="`Back to ${props.previousPageLabel}`"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"/>
            </svg>
          </button>
          <div class="page-title__back-tt" role="tooltip">Back to {{ props.previousPageLabel }}</div>
        </div>
        <div class="page-title__icon-box" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path d="M14.168 2.5H5.835c-.917 0-1.667.75-1.667 1.667V17.5l5.833-2.5 5.834 2.5V4.167c0-.917-.75-1.667-1.667-1.667m0 12.5-4.167-1.817L5.835 15V4.167h8.333z"/>
          </svg>
        </div>
        <h1 class="page-title__text">
          <span class="page-title__crumb page-title__crumb--current">Views</span>
        </h1>
      </div>
    </div>

    <!-- ── Content area ────────────────────────────────────────── -->
    <div class="svp-content">

      <!-- Filter bar (reusing the shared FilterBar component) -->
      <FilterBar
        :filters="filters"
        :advanced-query="null as unknown as AdvancedQuery | null"
        :filter-defs="VIEW_FILTER_DEFS"
        :simple="true"
        @remove="removeFilter"
        @add="addFilter"
        @set-operator="setFilterOperator"
        @set-value="setFilterValue"
        @apply-advanced="() => {}"
        @clear-advanced="() => {}"
      />

      <!-- Table card -->
      <div class="svp-table-card">

        <!-- Toolbar -->
        <div class="at-table-header">
          <div class="at-table-header__caption">
            <span class="at-table-header__title">Views</span>
            <span class="at-table-header__divider">|</span>
            <span class="at-table-header__count">{{ displayedCount }} {{ displayedCount === 1 ? 'view' : 'views' }}</span>
          </div>
          <div class="at-table-header__actions">
            <RadioBar
              label="Group by:"
              size="s"
              :show-clear="true"
              clear-tooltip="Clear grouping"
              :options="GROUP_BY_OPTIONS"
              :model-value="groupBy ?? ''"
              @update:model-value="(v: string) => { groupBy = v || null }"
            />
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
              :group-sort-col="'name'"
              :group-sort-dir="'asc'"
              :columns="SORT_COLS"
              :is-grouped="false"
              :trigger-el="sortBtnRef"
              @set-sort="setSort"
              @set-group-sort="() => {}"
              @close="sortPopoverOpen = false"
            />
          </div>
        </div>

        <div class="svp-table-scroll">
        <table class="svp-table" aria-label="Saved views">
          <thead class="svp-thead">
            <tr>
              <th class="svp-th svp-th--pin" scope="col" aria-label="Pinned"></th>
              <th class="svp-th svp-th--name" scope="col" :aria-sort="sortCol === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button class="svp-col-sort-btn" :class="{ 'svp-col-sort-btn--active': sortCol === 'name' }" @click="handleColSort('name')">
                  Name<span class="at-sort-indicator" aria-hidden="true" />
                </button>
              </th>
              <th class="svp-th svp-th--page" scope="col" :aria-sort="sortCol === 'page' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button class="svp-col-sort-btn" :class="{ 'svp-col-sort-btn--active': sortCol === 'page' }" @click="handleColSort('page')">
                  Page<span class="at-sort-indicator" aria-hidden="true" />
                </button>
              </th>
              <th class="svp-th svp-th--scope" scope="col" :aria-sort="sortCol === 'scope' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button class="svp-col-sort-btn" :class="{ 'svp-col-sort-btn--active': sortCol === 'scope' }" @click="handleColSort('scope')">
                  Scope<span class="at-sort-indicator" aria-hidden="true" />
                </button>
              </th>
              <th class="svp-th svp-th--created-by" scope="col" :aria-sort="sortCol === 'createdBy' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button class="svp-col-sort-btn" :class="{ 'svp-col-sort-btn--active': sortCol === 'createdBy' }" @click="handleColSort('createdBy')">
                  Creator<span class="at-sort-indicator" aria-hidden="true" />
                </button>
              </th>
              <th class="svp-th svp-th--created" scope="col" :aria-sort="sortCol === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button class="svp-col-sort-btn" :class="{ 'svp-col-sort-btn--active': sortCol === 'createdAt' }" @click="handleColSort('createdAt')">
                  Created<span class="at-sort-indicator" aria-hidden="true" />
                </button>
              </th>
              <th class="svp-th svp-th--summary" scope="col">Summary</th>
              <th class="svp-th svp-th--actions" scope="col" aria-label="Actions"></th>
            </tr>
          </thead>

          <tbody>
            <!-- Grouped mode -->
            <template v-if="groupedViews">
              <template v-for="[groupName, groupRows] in groupedViews" :key="groupName">
                <tr class="svp-group-row">
                  <td class="svp-group-cell" colspan="8">
                    {{ groupBy === 'createdBy' && groupName === currentUser ? 'Me' : groupName }}
                    <span class="svp-group-count">{{ groupRows.length }}</span>
                  </td>
                </tr>
                <tr v-for="view in groupRows" :key="view.id" class="svp-row">
                  <td class="svp-td svp-td--pin">
                    <button class="svp-icon-btn" :class="{ 'svp-icon-btn--pinned': view.pinned }" :aria-label="view.pinned ? 'Unpin view' : 'Pin view'" :aria-pressed="view.pinned" @click="togglePin(view.id)">
                      <svg v-if="!view.pinned" fill="currentColor" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M11.668 3.333V7.5c0 .933.308 1.8.833 2.5h-5a4.12 4.12 0 0 0 .834-2.5V3.333zm2.5-1.666H5.835A.836.836 0 0 0 5 2.5c0 .458.375.833.834.833h.833V7.5c0 1.383-1.117 2.5-2.5 2.5v1.667h4.975V17.5l.833.833.834-.833v-5.833h5.025V10a2.497 2.497 0 0 1-2.5-2.5V3.333h.833a.836.836 0 0 0 .833-.833.836.836 0 0 0-.833-.833"/></svg>
                      <svg v-else fill="currentColor" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m8.863 1.792-7.071 7.07a1.003 1.003 0 0 0 0 1.415 1.003 1.003 0 0 0 1.414 0l.707-.707 3.536 3.535a2.996 2.996 0 0 1 0 4.243l1.414 1.414 4.221-4.221 4.95 4.95h1.414v-1.415l-4.95-4.95 4.264-4.263-1.414-1.414a2.996 2.996 0 0 1-4.243 0L9.57 3.913l.707-.707a1.003 1.003 0 0 0 0-1.414 1.003 1.003 0 0 0-1.414 0"/></svg>
                    </button>
                  </td>
                  <td class="svp-td"><span class="svp-name">{{ view.name }}</span></td>
                  <td class="svp-td"><span class="svp-meta">{{ view.page }}</span></td>
                  <td class="svp-td"><span class="svp-meta">{{ SCOPE_LABELS[view.scope] }}</span></td>
                  <td class="svp-td"><span class="svp-meta">{{ view.createdBy === currentUser ? 'Me' : view.createdBy }}</span></td>
                  <td class="svp-td"><span class="svp-meta svp-meta--dimmed">{{ formatRelativeDate(view.createdAt) }}</span></td>
                  <td class="svp-td svp-td--summary">
                    <button class="svp-summary-btn" :class="{ 'svp-summary-btn--active': activeSummaryId === view.id }" data-summary-trigger :aria-expanded="activeSummaryId === view.id" aria-haspopup="true" @click="openSummary(view.id, $event)">
                      <span class="svp-summary-text">{{ view.summary }}</span>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true" class="svp-summary-chevron"><path d="M4 6l4 4 4-4"/></svg>
                    </button>
                  </td>
                  <td class="svp-td svp-td--actions">
                    <button class="svp-icon-btn" aria-label="View actions" data-actions-trigger :aria-expanded="activeActionsId === view.id" @click="openActions(view.id, $event)">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><circle cx="10" cy="4.5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15.5" r="1.5"/></svg>
                    </button>
                  </td>
                </tr>
              </template>
            </template>

            <!-- Flat mode -->
            <template v-else>
            <tr v-for="view in sortedFilteredViews" :key="view.id" class="svp-row">

              <!-- Pinned -->
              <td class="svp-td svp-td--pin">
                <button
                  class="svp-icon-btn"
                  :class="{ 'svp-icon-btn--pinned': view.pinned }"
                  :aria-label="view.pinned ? 'Unpin view' : 'Pin view'"
                  :aria-pressed="view.pinned"
                  @click="togglePin(view.id)"
                >
                  <svg v-if="!view.pinned" fill="currentColor" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                    <path d="M11.668 3.333V7.5c0 .933.308 1.8.833 2.5h-5a4.12 4.12 0 0 0 .834-2.5V3.333zm2.5-1.666H5.835A.836.836 0 0 0 5 2.5c0 .458.375.833.834.833h.833V7.5c0 1.383-1.117 2.5-2.5 2.5v1.667h4.975V17.5l.833.833.834-.833v-5.833h5.025V10a2.497 2.497 0 0 1-2.5-2.5V3.333h.833a.836.836 0 0 0 .833-.833.836.836 0 0 0-.833-.833"/>
                  </svg>
                  <svg v-else fill="currentColor" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="m8.863 1.792-7.071 7.07a1.003 1.003 0 0 0 0 1.415 1.003 1.003 0 0 0 1.414 0l.707-.707 3.536 3.535a2.996 2.996 0 0 1 0 4.243l1.414 1.414 4.221-4.221 4.95 4.95h1.414v-1.415l-4.95-4.95 4.264-4.263-1.414-1.414a2.996 2.996 0 0 1-4.243 0L9.57 3.913l.707-.707a1.003 1.003 0 0 0 0-1.414 1.003 1.003 0 0 0-1.414 0"/>
                  </svg>
                </button>
              </td>

              <!-- Name -->
              <td class="svp-td">
                <span class="svp-name">{{ view.name }}</span>
              </td>

              <!-- Page -->
              <td class="svp-td">
                <span class="svp-meta">{{ view.page }}</span>
              </td>

              <!-- Scope -->
              <td class="svp-td">
                <span class="svp-meta">{{ SCOPE_LABELS[view.scope] }}</span>
              </td>

              <!-- Created by -->
              <td class="svp-td">
                <span class="svp-meta">{{ view.createdBy === currentUser ? 'Me' : view.createdBy }}</span>
              </td>

              <!-- Created date -->
              <td class="svp-td">
                <span class="svp-meta svp-meta--dimmed">{{ formatRelativeDate(view.createdAt) }}</span>
              </td>

              <!-- Summary -->
              <td class="svp-td svp-td--summary">
                <button
                  class="svp-summary-btn"
                  :class="{ 'svp-summary-btn--active': activeSummaryId === view.id }"
                  data-summary-trigger
                  :aria-expanded="activeSummaryId === view.id"
                  aria-haspopup="true"
                  @click="openSummary(view.id, $event)"
                >
                  <span class="svp-summary-text">{{ view.summary }}</span>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                       stroke-linecap="round" stroke-linejoin="round"
                       width="14" height="14" aria-hidden="true" class="svp-summary-chevron">
                    <path d="M4 6l4 4 4-4"/>
                  </svg>
                </button>
              </td>

              <!-- Actions -->
              <td class="svp-td svp-td--actions">
                <button
                  class="svp-icon-btn"
                  aria-label="View actions"
                  data-actions-trigger
                  :aria-expanded="activeActionsId === view.id"
                  @click="openActions(view.id, $event)"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
                    <circle cx="10" cy="4.5" r="1.5"/>
                    <circle cx="10" cy="10" r="1.5"/>
                    <circle cx="10" cy="15.5" r="1.5"/>
                  </svg>
                </button>
              </td>

            </tr>
            </template><!-- /flat mode -->
          </tbody>
        </table>

        </div><!-- /svp-table-scroll -->

        <!-- Empty state -->
        <div v-if="filteredViews.length === 0" class="svp-empty">
          <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24" class="svp-empty-icon" aria-hidden="true">
            <path d="M14.168 2.5H5.835c-.917 0-1.667.75-1.667 1.667V17.5l5.833-2.5 5.834 2.5V4.167c0-.917-.75-1.667-1.667-1.667m0 12.5-4.167-1.817L5.835 15V4.167h8.333z"/>
          </svg>
          <p class="svp-empty-text">No views match your filters</p>
          <p class="svp-empty-sub">Try removing or changing a filter to see more results.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Teleported overlays ──────────────────────────────────── -->
  <Teleport to="body">

    <!-- Summary popover -->
    <div v-if="activeSummaryId" class="svp-summary-popover" :style="summaryPos">
      <p class="svp-summary-popover-text">
        {{ views.find(v => v.id === activeSummaryId)?.summary }}
      </p>
    </div>

    <!-- Actions dropdown -->
    <div v-if="activeActionsId" class="svp-actions-menu" role="menu" :style="actionsPos">
      <button
        class="svp-actions-item svp-actions-item--danger"
        role="menuitem"
        :disabled="views.find(v => v.id === activeActionsId)?.createdBy !== currentUser"
        @click="handleDelete(activeActionsId!)"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path d="M5 4V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1h3v1.5h-1.086l-.8 11.2A1.5 1.5 0 0 1 15.617 18H4.383a1.5 1.5 0 0 1-1.497-1.3L2.086 5.5H1V4zm2 0h6V3H7v1zm-2.91 1.5.782 10.957A.5.5 0 0 0 5.373 17h9.254a.5.5 0 0 0 .499-.543L15.91 5.5z"/>
        </svg>
        Delete view
      </button>
    </div>

  </Teleport>
</template>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────── */
.svp-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Page header ─────────────────────────────────────────────────── */
.svp-header {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-xl);
  height: 56px;
  flex-shrink: 0;
  background: var(--v9-ui-bg);
}

/* ── PageTitle ───────────────────────────────────────────────────── */
.page-title {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
}
.page-title__back-wrap {
  position: relative;
  flex-shrink: 0;
  margin-inline-start: -12px;
}
.page-title__back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s, color 0.1s;
}
.page-title__back-btn:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.page-title__back-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 2px; }
.page-title__back-tt {
  position: absolute;
  left: calc(100% + 4px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--v9-space-s);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  font-size: var(--v9-font-size-m);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.25s;
  z-index: 500;
}
.page-title__back-wrap:hover .page-title__back-tt { opacity: 1; }

.page-title__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  flex-shrink: 0;
  color: var(--v9-ui-icon);
}
.page-title__text {
  display: flex;
  align-items: baseline;
  gap: var(--v9-space-xs);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-xl);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-l);
  margin: 0;
}
.page-title__crumb { color: var(--v9-ui-dimmed); font-weight: var(--v9-font-weight-regular); }
.page-title__crumb--current { color: var(--v9-ui-text); font-weight: var(--v9-font-weight-strong); }

/* ── Content area ────────────────────────────────────────────────── */
.svp-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-l);
  padding: var(--v9-space-m) var(--v9-space-xl) var(--v9-space-m);
}

/* ── Table card (matches .at-table-container from inventory page) ── */
.svp-table-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  overflow: hidden;
}

/* ── Scrollable table wrapper ────────────────────────────────────── */
.svp-table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ── Table ───────────────────────────────────────────────────────── */
.svp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* ── Sticky header ───────────────────────────────────────────────── */
.svp-thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.svp-th {
  padding: var(--v9-space-s) var(--v9-space-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
  text-align: left;
  white-space: nowrap;
  background: var(--v9-ui-canvas);
  border-bottom: 1px solid var(--v9-ui-border);
}

/* Column widths */
.svp-th--pin        { width: 44px;  padding-right: 0; }
.svp-th--name       { min-width: 160px; }
.svp-th--page       { width: 130px; }
.svp-th--scope      { width: 100px; }
.svp-th--created-by { width: 140px; }
.svp-th--created    { width: 130px; }
.svp-th--summary    { width: 240px; }
.svp-th--actions    { width: 44px;  padding-left: 0; }

/* ── Sortable column header buttons ─────────────────────────────── */
.svp-col-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.1s;
}
.svp-col-sort-btn:hover { color: var(--v9-ui-text); }
.svp-col-sort-btn--active { color: var(--v9-ui-text); }
.svp-col-sort-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 2px; border-radius: 2px; }

/* ── Group header rows ───────────────────────────────────────────── */
.svp-group-row {
  background: var(--v9-ui-canvas);
  border-bottom: 1px solid var(--v9-ui-border-light);
}
.svp-group-cell {
  padding: var(--v9-space-xs) var(--v9-space-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-text);
}
.svp-group-count {
  margin-left: var(--v9-space-xs);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
}

/* ── Body rows ───────────────────────────────────────────────────── */
.svp-row {
  border-bottom: 1px solid var(--v9-ui-border-light);
  transition: background 0.1s;
}
.svp-row:last-child { border-bottom: none; }
.svp-row:hover { background: var(--v9-ui-hover); }

.svp-td {
  padding: var(--v9-space-s) var(--v9-space-m);
  vertical-align: middle;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
}
.svp-td--pin     { padding-right: 0; width: 44px; }
.svp-td--summary { padding-top: 4px; padding-bottom: 4px; }
.svp-td--actions { padding-left: 0; width: 44px; }

/* ── Cell contents ───────────────────────────────────────────────── */
.svp-name {
  font-weight: var(--v9-font-weight-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.svp-meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.svp-meta--dimmed { color: var(--v9-ui-dimmed); }

/* ── Icon buttons ────────────────────────────────────────────────── */
.svp-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 4px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-icon);
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
}
.svp-icon-btn:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.svp-icon-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.svp-icon-btn--pinned { color: var(--v9-ui-text); }

/* ── Summary button ──────────────────────────────────────────────── */
.svp-summary-btn {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  width: 100%;
  padding: 5px var(--v9-space-s);
  border: 1px solid transparent;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-dimmed);
  overflow: hidden;
  transition: background 0.1s, border-color 0.1s, color 0.1s;
}
.svp-summary-btn:hover {
  background: var(--v9-ui-hover);
  border-color: var(--v9-ui-border-light);
  color: var(--v9-ui-text);
}
.svp-summary-btn--active {
  background: var(--v9-ui-hover);
  border-color: var(--v9-ui-border);
  color: var(--v9-ui-text);
}
.svp-summary-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.svp-summary-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.svp-summary-chevron { flex-shrink: 0; color: var(--v9-ui-icon); }

/* ── Empty state ─────────────────────────────────────────────────── */
.svp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px var(--v9-space-xl);
  gap: var(--v9-space-s);
}
.svp-empty-icon  { color: var(--v9-ui-icon); opacity: 0.5; }
.svp-empty-text  { font-family: var(--v9-font); font-size: var(--v9-font-size-m); font-weight: var(--v9-font-weight-strong); color: var(--v9-ui-text); margin: 0; }
.svp-empty-sub   { font-family: var(--v9-font); font-size: var(--v9-font-size-m); color: var(--v9-ui-dimmed); margin: 0; text-align: center; }
</style>

<!-- Global: teleported overlays ─────────────────────────────────── -->
<style>
/* ── Summary popover ─────────────────────────────────────────────── */
.svp-summary-popover {
  position: fixed;
  z-index: 600;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  padding: var(--v9-space-m);
  animation: svp-fadein 0.1s ease;
}
.svp-summary-popover-text {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
  margin: 0;
}

/* ── Actions dropdown ────────────────────────────────────────────── */
.svp-actions-menu {
  position: fixed;
  z-index: 600;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  padding: var(--v9-space-xxs);
  min-width: 160px;
  animation: svp-fadein 0.1s ease;
}
.svp-actions-item {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  width: 100%;
  height: 32px;
  padding: 0 var(--v9-space-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.svp-actions-item:hover:not(:disabled) { background: var(--v9-ui-hover); }
.svp-actions-item:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.svp-actions-item:disabled { color: var(--v9-disabled-text); cursor: default; }
.svp-actions-item--danger { color: var(--v9-danger-main); }
.svp-actions-item--danger:disabled { color: var(--v9-disabled-text); }

@keyframes svp-fadein {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
