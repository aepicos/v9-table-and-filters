<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { FILTERS, type FilterChip, type AdvancedQuery, type FilterGroup as FilterGroupData } from '../data/filters'
import FilterChipComponent from './FilterChip.vue'
import FilterMenu from './FilterMenu.vue'
import FilterQueryMenu from './FilterQueryMenu.vue'
import FilterGroup from './FilterGroup.vue'
import FilterGroupOperator from './FilterGroupOperator.vue'

const props = defineProps<{
  filters: FilterChip[]
  advancedQuery: AdvancedQuery | null
}>()

const emit = defineEmits<{
  remove: [id: string]
  add: [chip: FilterChip]
  'set-operator': [id: string, operator: string]
  'set-value': [id: string, value: string]
  'apply-advanced': [query: AdvancedQuery]
  'clear-advanced': []
}>()

// ── Popover state ─────────────────────────────────────────────────────────────

const showFilterMenu = ref(false)
const showQueryMenu = ref(false)

// Button refs for getBoundingClientRect positioning
const addBtnRef = ref<HTMLElement | null>(null)
const tuneBtnRef = ref<HTMLElement | null>(null)
const editBtnRef = ref<HTMLElement | null>(null)

// ── Viewport-aware popover positioning ───────────────────────────────────────
//
// Rules:
//   Horizontal — align to button's left edge; shift left if the popover would
//                overflow the right edge; clamp so it never goes off the left.
//   Vertical   — prefer below the button; flip above when there isn't enough
//                room below. Uses a per-menu height estimate so no two-pass
//                render is needed.
//
const POPOVER_W     = 496
const GAP           = 6   // px gap between button and popover
const EDGE          = 8   // min distance from any viewport edge

function anchorPos(el: HTMLElement | null, estimatedH: number): Record<string, string> {
  if (!el) return { top: '0px', left: '0px' }
  const r  = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal
  let left = r.left
  if (left + POPOVER_W > vw - EDGE) left = vw - POPOVER_W - EDGE
  if (left < EDGE) left = EDGE

  // Vertical — flip above when space below is insufficient
  const spaceBelow = vh - r.bottom - GAP
  const spaceAbove = r.top  - GAP

  if (spaceBelow >= estimatedH || spaceBelow >= spaceAbove) {
    return { top: `${r.bottom + GAP}px`, left: `${left}px` }
  } else {
    // Position so the popover's bottom lands just above the button
    const top = r.top - GAP - estimatedH
    return { top: `${Math.max(EDGE, top)}px`, left: `${left}px` }
  }
}

// FilterMenu:      48px header + up to 380px body  ≈ 440px
// FilterQueryMenu: 48px header + up to 480px body + ~52px footer ≈ 580px
const filterMenuPos = computed(() =>
  anchorPos(showFilterMenu.value ? (addBtnRef.value ?? editBtnRef.value) : null, 440))
const queryMenuPos = computed(() =>
  anchorPos(showQueryMenu.value  ? (tuneBtnRef.value ?? editBtnRef.value) : null, 580))

function openFilterMenu() {
  showQueryMenu.value = false
  showFilterMenu.value = true
}

function openQueryMenu() {
  showFilterMenu.value = false
  showQueryMenu.value = true
}

function closeAll() {
  showFilterMenu.value = false
  showQueryMenu.value = false
}

// ── Filter menu → add chip ────────────────────────────────────────────────────

function onMenuSelect(filterId: string, value: string, operator: string) {
  const def = FILTERS.find(f => f.id === filterId)
  const label = def?.label ?? value
  emit('add', {
    id: Math.random().toString(36).slice(2, 9),
    filterId,
    key: label,
    operator,
    value,
  })
  showFilterMenu.value = false
  nextTick(() => addBtnRef.value?.focus())
}

function onMenuSelectMany(chips: { filterId: string; value: string; operator: string }[]) {
  for (const { filterId, value, operator } of chips) {
    const def = FILTERS.find(f => f.id === filterId)
    const label = def?.label ?? value
    emit('add', {
      id: Math.random().toString(36).slice(2, 9),
      filterId,
      key: label,
      operator,
      value,
    })
  }
  showFilterMenu.value = false
  nextTick(() => addBtnRef.value?.focus())
}

function closeFilterMenu() {
  showFilterMenu.value = false
  nextTick(() => addBtnRef.value?.focus())
}

function closeQueryMenu() {
  showQueryMenu.value = false
  nextTick(() => (tuneBtnRef.value ?? editBtnRef.value)?.focus())
}

// ── Advanced query ────────────────────────────────────────────────────────────

// Convert simple chips → advanced groups.
//
// • All unique keys → one group, AND operator (e.g. [asset class A] [language Go]
//   becomes a single group: [asset class A] AND [language Go])
//
// • Duplicate keys present → group by key, OR within each group, AND between groups
//   (e.g. [asset class A] [asset class B] [team X] → ([A] OR [B]) AND ([X]))
//
function simpleFiltersToGroups(chips: FilterChip[]): FilterGroupData[] {
  function makeCondition(chip: FilterChip) {
    return {
      id: Math.random().toString(36).slice(2, 9),
      filterId: chip.filterId ?? '',
      key: chip.key,
      operator: chip.operator,
      value: chip.value,
    }
  }

  const ids = chips.map(c => c.filterId ?? c.id)
  const allUnique = new Set(ids).size === ids.length

  if (allUnique) {
    return [{
      id: Math.random().toString(36).slice(2, 9),
      operator: 'AND' as const,
      conditions: chips.map(makeCondition),
    }]
  }

  // Duplicate keys — group by filterId, OR within, AND between
  const byKey = new Map<string, FilterChip[]>()
  for (const chip of chips) {
    const key = chip.filterId ?? chip.id
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(chip)
  }
  return Array.from(byKey.values()).map(group => ({
    id: Math.random().toString(36).slice(2, 9),
    operator: 'OR' as const,
    conditions: group.map(makeCondition),
  }))
}

// What to seed the query menu with: existing advanced query, or converted simple filters
const queryMenuInitialGroups = computed(() =>
  props.advancedQuery?.groups ?? (props.filters.length ? simpleFiltersToGroups(props.filters) : undefined)
)
const queryMenuInitialGroupOperator = computed(() =>
  props.advancedQuery?.groupOperator ?? (props.filters.length ? 'AND' : undefined)
)

function onApplyAdvanced(query: AdvancedQuery) {
  // Clear any simple filters that were absorbed into the query
  for (const chip of props.filters) emit('remove', chip.id)
  emit('apply-advanced', query)
  showQueryMenu.value = false
}

// ── Inline mutations on the advanced query summary ────────────────────────────

function cloneQuery(q: AdvancedQuery): AdvancedQuery {
  return {
    groupOperator: q.groupOperator,
    groups: q.groups.map(g => ({ ...g, conditions: g.conditions.map(c => ({ ...c })) })),
  }
}

function removeAdvancedCondition(groupId: string, conditionId: string) {
  if (!props.advancedQuery) return
  const q = cloneQuery(props.advancedQuery)
  const group = q.groups.find(g => g.id === groupId)
  if (group) group.conditions = group.conditions.filter(c => c.id !== conditionId)
  q.groups = q.groups.filter(g => g.conditions.length > 0)
  if (q.groups.length === 0) emit('clear-advanced')
  else emit('apply-advanced', q)
}

function toggleAdvancedGroupOperator(groupId: string) {
  if (!props.advancedQuery) return
  const q = cloneQuery(props.advancedQuery)
  const group = q.groups.find(g => g.id === groupId)
  if (group) { group.operator = group.operator === 'AND' ? 'OR' : 'AND'; emit('apply-advanced', q) }
}

function toggleAdvancedGroupsOperator() {
  if (!props.advancedQuery) return
  const q = cloneQuery(props.advancedQuery)
  q.groupOperator = q.groupOperator === 'AND' ? 'OR' : 'AND'
  emit('apply-advanced', q)
}

// ── Derived ───────────────────────────────────────────────────────────────────

const hasFilters = computed(() => props.filters.length > 0 || props.advancedQuery !== null)

// Build a map of filterId → already-applied values so FilterMenu can disable them
const activeValuesByFilter = computed(() => {
  const map: Record<string, string[]> = {}
  for (const chip of props.filters) {
    if (!chip.filterId) continue
    ;(map[chip.filterId] ??= []).push(chip.value)
  }
  return map
})
</script>

<template>
  <!-- Click-outside overlay (z-index 999, below popovers at 1000) -->
  <teleport to="body">
    <div
      v-if="showFilterMenu || showQueryMenu"
      class="v9-bar-overlay"
      @click="closeAll"
      @keydown.esc="closeAll"
    />
  </teleport>

  <!-- Filter menu popover — teleported so bar's overflow-x:auto doesn't clip it -->
  <teleport to="body">
    <div
      v-if="showFilterMenu"
      class="v9-bar-teleport"
      :style="filterMenuPos"
    >
      <FilterMenu
        :active-values="activeValuesByFilter"
        @select="onMenuSelect"
        @select-many="onMenuSelectMany"
        @close="closeFilterMenu"
      />
    </div>
  </teleport>

  <!-- Query menu popover — teleported for same reason -->
  <teleport to="body">
    <div
      v-if="showQueryMenu"
      class="v9-bar-teleport"
      :style="queryMenuPos"
    >
      <FilterQueryMenu
        :filter-defs="FILTERS"
        :initial-groups="queryMenuInitialGroups"
        :initial-group-operator="queryMenuInitialGroupOperator"
        @apply="onApplyAdvanced"
        @cancel="closeQueryMenu"
      />
    </div>
  </teleport>

  <div class="v9-bar" :class="{ 'v9-bar--active': hasFilters }" role="toolbar" aria-label="Filters">

    <!-- Leading filter icon — decorative; label is on the toolbar -->
    <div class="v9-bar__icon-box" aria-hidden="true">
      <svg viewBox="0 0 24 24" :width="20" :height="20" fill="currentColor">
        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
      </svg>
    </div>

    <!-- ── Simple filters mode ── -->
    <template v-if="!advancedQuery">

      <!-- Chips + add button — wrap freely within the space between icon and tune -->
      <div class="v9-bar__chips-scroll">

        <FilterChipComponent
          v-for="chip in filters"
          :key="chip.id"
          :chip="chip"
          :filter-def="FILTERS.find(f => f.id === chip.filterId)"
          :active-values="activeValuesByFilter[chip.filterId ?? '']"
          @remove="$emit('remove', chip.id)"
          @update-operator="(op) => $emit('set-operator', chip.id, op)"
          @update-value="(val) => $emit('set-value', chip.id, val)"
        />

        <button
          ref="addBtnRef"
          class="v9-btn v9-btn--s v9-btn--default"
          :class="filters.length === 0
            ? ['v9-btn--icon-left', showFilterMenu && 'v9-btn--active']
            : ['v9-btn--icon-only', showFilterMenu && 'v9-btn--active']"
          aria-label="Add filter"
          :data-tooltip="filters.length > 0 ? 'Add filter' : undefined"
          :aria-expanded="showFilterMenu"
          @click="openFilterMenu"
        >
          <svg viewBox="0 0 24 24" :width="14" :height="14" aria-hidden="true">
            <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
          </svg>
          <span v-if="filters.length === 0">Add filter</span>
        </button>

      </div>

      <!-- Tune — direct child of v9-bar, pinned block-start at the trailing edge -->
      <button
        ref="tuneBtnRef"
        class="v9-btn v9-btn--s v9-btn--subtle v9-btn--icon-left v9-bar__tune"
        :class="{ 'v9-btn--active': showQueryMenu }"
        aria-label="Advanced filter"
        :aria-expanded="showQueryMenu"
        @click="openQueryMenu"
      >
        <svg viewBox="0 0 24 24" :width="20" :height="20" aria-hidden="true">
          <path d="M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z" fill="currentColor"/>
        </svg>
        <span>Advanced filter</span>
      </button>

    </template>

    <!-- ── Advanced query summary mode ── -->
    <template v-else>

      <!-- Groups + between-group operators — wrap freely -->
      <div class="v9-bar__chips-scroll">
        <template v-for="(group, gIdx) in advancedQuery!.groups" :key="group.id">

          <!-- Between-group operator -->
          <FilterGroupOperator
            v-if="gIdx > 0"
            :value="advancedQuery!.groupOperator"
            role="Between groups"
            @toggle="toggleAdvancedGroupsOperator"
          />

          <!-- Group: chips + intra-group operators -->
          <FilterGroup
            :group="group"
            :filter-defs="FILTERS"
            @toggle-operator="toggleAdvancedGroupOperator(group.id)"
            @remove-condition="(cId) => removeAdvancedCondition(group.id, cId)"
          />

        </template>

        <!-- Tune/edit icon button — replaces the + Add filter button -->
        <button
          ref="editBtnRef"
          class="v9-btn v9-btn--s v9-btn--default v9-btn--icon-only"
          :class="{ 'v9-btn--active': showQueryMenu }"
          aria-label="Edit advanced filter"
          data-tooltip="Edit advanced filter"
          :aria-expanded="showQueryMenu"
          @click="openQueryMenu"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
            <path d="M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z"/>
          </svg>
        </button>
      </div>

      <!-- Clear — pinned to trailing edge like the Tune button -->
      <button
        class="v9-btn v9-btn--s v9-btn--subtle v9-btn--icon-left v9-bar__tune"
        aria-label="Clear advanced filters"
        @click="$emit('clear-advanced')"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        Clear
      </button>

    </template>

  </div>
</template>

<style scoped>
.v9-bar {
  display: flex;
  align-items: flex-start;
  gap: var(--v9-space-xs);
  padding: 0;
  background: var(--v9-ui-bg);
  height: fit-content;
  flex-shrink: 0;
  /* No overflow here — keeps tooltip ::after pseudo-elements unclipped */
}

/* Chips row — wraps onto new lines when filters overflow.
   No overflow set here so tooltip ::after pseudo-elements are never clipped. */
.v9-bar__chips-scroll {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--v9-space-xs);
  flex: 1;
}

/* Tune pinned to the trailing edge, top-aligned */
.v9-bar__tune { margin-left: auto; align-self: flex-start; }

/* Leading icon box */
.v9-bar__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  color: var(--v9-ui-dimmed);
  flex-shrink: 0;
}

/* ── v9 Button system (size s used throughout the bar) ───────────────────── */

.v9-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-weight: var(--v9-font-weight-regular);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.1s, color 0.1s;
}
.v9-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

/* Size s */
.v9-btn--s { height: var(--v9-input-s); padding: 0 var(--v9-space-s); font-size: var(--v9-font-size-s); }

/* Default variant */
.v9-btn--default {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  color: var(--v9-ui-text);
  box-shadow: var(--v9-elevation-input);
}
.v9-btn--default:hover              { background: var(--v9-ui-hover); }
.v9-btn--default:active             { box-shadow: var(--v9-elevation-input-inner); }
.v9-btn--default.v9-btn--active     { background: var(--v9-ui-hover); }

/* Subtle variant */
.v9-btn--subtle {
  background: none;
  border: 1px solid transparent;
  color: var(--v9-ui-dimmed);
}
.v9-btn--subtle:hover           { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-btn--subtle.v9-btn--active  { background: var(--v9-ui-hover); color: var(--v9-ui-text); }

/* Icon-left: reduce leading padding by one step (space.s → space.xxs) */
.v9-btn--icon-left { padding-left: var(--v9-space-xxs); }

/* Icon-only: square, centred */
.v9-btn--icon-only { width: var(--v9-input-s); justify-content: center; padding: 0; }

/* Teleported popovers — fixed to viewport, above overlay */
.v9-bar-teleport { position: fixed; z-index: 1000; }

/* Advanced summary label (non-interactive) */
.v9-bar__advanced-summary {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xs);
  height: var(--v9-input-s);
  padding: 0 var(--v9-space-s);
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Click-outside overlay */
.v9-bar-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* CSS tooltip — shown on hover and focus-visible */
[data-tooltip] { position: relative; }

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  line-height: var(--v9-line-height-s);
  padding: 3px 8px;
  border-radius: var(--v9-radius-s);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s 0.4s; /* delay so it doesn't flash on quick mouse-overs */
  z-index: 1100;
}

[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after {
  opacity: 1;
}
</style>
