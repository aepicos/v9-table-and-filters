<script setup lang="ts">
import { ref, computed } from 'vue'
import { type FilterDef, type FilterGroup, type AdvancedQuery } from '../data/filters'
import FilterGroupOperator from './FilterGroupOperator.vue'
import FilterMenu from './FilterMenu.vue'

const props = defineProps<{
  filterDefs: FilterDef[]
  initialGroups?: FilterGroup[]
  initialGroupOperator?: 'AND' | 'OR'
}>()

const emit = defineEmits<{
  apply:  [query: AdvancedQuery]
  cancel: []
}>()

// ── State ─────────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function makeEmptyGroup(): FilterGroup {
  return { id: makeId(), operator: 'AND', conditions: [] }
}

const groups = ref<FilterGroup[]>(
  props.initialGroups?.length
    ? props.initialGroups.map(g => ({ ...g, conditions: g.conditions.map(c => ({ ...c })) }))
    : [makeEmptyGroup()]
)

const groupOperator = ref<'AND' | 'OR'>(props.initialGroupOperator ?? 'AND')

// Which group has the add-condition menu open (null = none)
const addingToGroup = ref<string | null>(null)

// Active values scoped to the currently-open group so FilterMenu can disable duplicates
const activeValuesForGroup = computed<Record<string, string[]>>(() => {
  if (!addingToGroup.value) return {}
  const g = groups.value.find(g => g.id === addingToGroup.value)
  if (!g) return {}
  const map: Record<string, string[]> = {}
  for (const cond of g.conditions) {
    ;(map[cond.filterId] ??= []).push(cond.value)
  }
  return map
})

// Per-group button refs for positioning the teleported sub-menu
const addBtnRefs = ref<Record<string, HTMLElement>>({})
function setAddBtnRef(el: Element | null, groupId: string) {
  if (el) addBtnRefs.value[groupId] = el as HTMLElement
  else delete addBtnRefs.value[groupId]
}

// Viewport-aware position for the sub FilterMenu
const subMenuStyle = computed(() => {
  const btn = addingToGroup.value ? addBtnRefs.value[addingToGroup.value] : null
  if (!btn) return {}
  const r  = btn.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const W = 496, H = 440, GAP = 6, EDGE = 8

  let left = r.left
  if (left + W > vw - EDGE) left = vw - W - EDGE
  if (left < EDGE) left = EDGE

  const spaceBelow = vh - r.bottom - GAP
  const spaceAbove = r.top - GAP
  if (spaceBelow >= H || spaceBelow >= spaceAbove) {
    return { top: `${r.bottom + GAP}px`, left: `${left}px` }
  } else {
    return { top: `${Math.max(EDGE, r.top - GAP - H)}px`, left: `${left}px` }
  }
})

// ── Mutations ─────────────────────────────────────────────────────────────────

function addGroup() {
  groups.value.push(makeEmptyGroup())
}

function removeGroup(groupId: string) {
  groups.value = groups.value.filter(g => g.id !== groupId)
  if (groups.value.length === 0) groups.value.push(makeEmptyGroup())
}

function toggleGroupOperator(groupId: string) {
  const g = groups.value.find(g => g.id === groupId)
  if (g) g.operator = g.operator === 'AND' ? 'OR' : 'AND'
}

function toggleBetweenOperator() {
  groupOperator.value = groupOperator.value === 'AND' ? 'OR' : 'AND'
}

function removeCondition(groupId: string, conditionId: string) {
  const g = groups.value.find(g => g.id === groupId)
  if (!g) return
  g.conditions = g.conditions.filter(c => c.id !== conditionId)
}

function openAddCondition(groupId: string) {
  addingToGroup.value = addingToGroup.value === groupId ? null : groupId
}

function onMenuSelect(groupId: string, filterId: string, value: string, operator: string) {
  const g = groups.value.find(g => g.id === groupId)
  const def = props.filterDefs.find(d => d.id === filterId)
  if (!g || !def) return
  g.conditions.push({
    id: makeId(),
    filterId,
    key: def.label,
    operator,
    value,
  })
  addingToGroup.value = null
}

function onMenuSelectMany(groupId: string, chips: { filterId: string; value: string; operator: string }[]) {
  const g = groups.value.find(g => g.id === groupId)
  if (!g) return
  for (const { filterId, value, operator } of chips) {
    const def = props.filterDefs.find(d => d.id === filterId)
    if (!def) continue
    g.conditions.push({
      id: makeId(),
      filterId,
      key: def.label,
      operator,
      value,
    })
  }
  addingToGroup.value = null
}

// ── Apply / Cancel / Delete ────────────────────────────────────────────────────

function apply() {
  const nonEmpty = groups.value.filter(g => g.conditions.length > 0)
  emit('apply', {
    groupOperator: groupOperator.value,
    groups: nonEmpty,
  })
}
</script>

<template>
  <!-- Click-outside overlay for sub-menu -->
  <teleport to="body">
    <div
      v-if="addingToGroup"
      class="v9-qm-overlay"
      @click="addingToGroup = null"
    />
  </teleport>

  <!-- Sub FilterMenu — teleported so it escapes the body's overflow clipping -->
  <teleport to="body">
    <div
      v-if="addingToGroup"
      class="v9-qm-sub-menu"
      :style="subMenuStyle"
    >
      <FilterMenu
        :active-values="activeValuesForGroup"
        @select="(fId, val, op) => onMenuSelect(addingToGroup!, fId, val, op)"
        @select-many="(chips) => onMenuSelectMany(addingToGroup!, chips)"
        @close="addingToGroup = null"
      />
    </div>
  </teleport>

  <div class="v9-qm" role="dialog" aria-label="Advanced filter builder">

    <!-- Header -->
    <div class="v9-qm__header">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
        <path d="M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z"/>
      </svg>
      <span class="v9-qm__header-title">Advanced filter</span>
    </div>

    <!-- Groups -->
    <div class="v9-qm__body">
      <template v-for="(group, gIdx) in groups" :key="group.id">

        <!-- Between-group operator -->
        <div v-if="gIdx > 0" class="v9-qm__between-op">
          <FilterGroupOperator
            :value="groupOperator"
            role="Between groups"
            @toggle="toggleBetweenOperator"
          />
        </div>

        <!-- Group card -->
        <div class="v9-qm__group">

          <!-- Conditions -->
          <div class="v9-qm__conditions">

            <!-- Remove-group button — absolute top-right -->
            <button
              v-if="groups.length > 1"
              class="v9-qm__remove-group"
              :aria-label="`Remove group ${gIdx + 1}`"
              @click="removeGroup(group.id)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>

            <!-- One row per condition: [AND] [chip] -->
            <div
              v-for="(cond, cIdx) in group.conditions"
              :key="cond.id"
              class="v9-qm__cond-row"
            >
              <FilterGroupOperator
                v-if="cIdx > 0"
                :value="group.operator"
                role="Inside group"
                @toggle="toggleGroupOperator(group.id)"
              />

              <div class="v9-chip">
                <div class="v9-chip__section v9-chip__key"><span>{{ cond.key }}</span></div>
                <div class="v9-chip__divider" />
                <div class="v9-chip__section v9-chip__operator-dimmed"><span>{{ cond.operator }}</span></div>
                <div class="v9-chip__divider" />
                <div class="v9-chip__section"><span>{{ cond.value }}</span></div>
                <div class="v9-chip__divider" />
                <button
                  class="v9-chip__delete"
                  :aria-label="`Remove ${cond.key} condition`"
                  @click="removeCondition(group.id, cond.id)"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Add condition — its own row, no operator prefix -->
            <button
              :ref="(el) => setAddBtnRef(el as Element | null, group.id)"
              class="v9-qm-btn v9-qm-btn--s v9-qm-btn--subtle v9-qm-btn--icon-left"
              :class="{ 'v9-qm-btn--active': addingToGroup === group.id }"
              :aria-label="`Add condition to group ${gIdx + 1}`"
              :aria-expanded="addingToGroup === group.id"
              @click="openAddCondition(group.id)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
                <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add condition
            </button>
          </div>
        </div>
      </template>

      <!-- Add group -->
      <button class="v9-qm-btn v9-qm-btn--s v9-qm-btn--default v9-qm-btn--icon-left" @click="addGroup">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
          <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add group
      </button>
    </div>

    <!-- Footer -->
    <div class="v9-qm__footer">
      <button class="v9-qm-btn v9-qm-btn--m v9-qm-btn--default" @click="$emit('cancel')">Cancel</button>
      <button class="v9-qm-btn v9-qm-btn--m v9-qm-btn--primary" @click="apply">
        Apply
        <span class="v9-qm-btn__kbd" aria-hidden="true">↵</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.v9-qm {
  width: 496px;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: var(--v9-elevation-m);
  display: flex;
  flex-direction: column;
  font-family: var(--v9-font);
  overflow: hidden;
}

/* Header */
.v9-qm__header {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  height: 36px;
  padding: var(--v9-space-s) var(--v9-space-m);
  flex-shrink: 0;
  color: var(--v9-ui-text);
}

.v9-qm__header-title {
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-m);
}

/* Body */
.v9-qm__body {
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-xs);
  padding: var(--v9-space-s) var(--v9-space-m);
  overflow-y: auto;
  max-height: 380px;
  border-top: 1px solid var(--v9-ui-border);
  scrollbar-width: thin;
  scrollbar-color: var(--v9-ui-border) transparent;
}

/* Add group button — content-width inside the column body */
.v9-qm__body > .v9-qm-btn {
  align-self: flex-start;
}

/* Between-group operator row */
.v9-qm__between-op {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-xxs);
}

/* Group card */
.v9-qm__group {
  position: relative;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: 10px;
}

/* Remove group — top-right corner */
.v9-qm__remove-group {
  position: absolute;
  top: var(--v9-space-xs);
  right: var(--v9-space-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  border-radius: var(--v9-radius-m);
  transition: background 0.1s, color 0.1s;
  z-index: 1;
}
.v9-qm__remove-group:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-qm__remove-group:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }

/* Conditions area — one row per condition */
.v9-qm__conditions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--v9-space-xs);
  padding: var(--v9-space-s) var(--v9-space-m);
}

/* Each row: optional [AND/OR] operator + chip */
.v9-qm__cond-row {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
}

/* Sub-menu teleport + overlay */
.v9-qm-sub-menu { position: fixed; z-index: 1001; }
.v9-qm-overlay  { position: fixed; inset: 0; z-index: 1000; }

/* Footer */
.v9-qm__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--v9-space-s);
  padding: var(--v9-space-s) var(--v9-space-m);
  border-top: 1px solid var(--v9-ui-border);
  flex-shrink: 0;
}

/* ── v9 Button system ────────────────────────────────────────────────────── */

.v9-qm-btn {
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
.v9-qm-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

/* Size s */
.v9-qm-btn--s { height: var(--v9-input-s); padding: 0 var(--v9-space-s); font-size: var(--v9-font-size-s); }

/* Size m */
.v9-qm-btn--m { height: var(--v9-input-m); padding: 0 var(--v9-space-m); font-size: var(--v9-font-size-m); align-self: center; }

/* Default variant */
.v9-qm-btn--default {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  color: var(--v9-ui-text);
  box-shadow: var(--v9-elevation-input);
}
.v9-qm-btn--default:hover  { background: var(--v9-ui-hover); }
.v9-qm-btn--default:active { box-shadow: var(--v9-elevation-input-inner); }

/* Subtle variant */
.v9-qm-btn--subtle {
  background: none;
  border: 1px solid transparent;
  color: var(--v9-ui-dimmed);
}
.v9-qm-btn--subtle:hover             { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-qm-btn--subtle.v9-qm-btn--active { background: var(--v9-ui-hover); color: var(--v9-ui-text); }

/* Primary variant */
.v9-qm-btn--primary {
  background: var(--v9-input-primary-bg);
  border: 1px solid var(--v9-input-primary-bg);
  color: var(--v9-input-primary-text);
}
.v9-qm-btn--primary:hover { filter: brightness(1.1); }

/* Icon-left: reduce leading padding */
.v9-qm-btn--icon-left { padding-left: var(--v9-space-xxs); }

/* Keyboard shortcut badge inside Apply button */
.v9-qm-btn__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  padding: 0 var(--v9-space-xxs);
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-s);
  font-size: var(--v9-font-size-xs, 12px);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
}

/* Inline chip styles */
.v9-chip {
  display: inline-flex;
  align-items: stretch;
  height: var(--v9-input-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
}

.v9-chip__section {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-s);
  white-space: nowrap;
  color: var(--v9-input-text);
}

.v9-chip__key {
  border-left: 1px solid var(--v9-ui-border-light);
}

.v9-chip__operator-dimmed {
  color: var(--v9-ui-dimmed);
  padding-left: var(--v9-space-xs);
  padding-right: var(--v9-space-xs);
}

.v9-chip__divider {
  width: 1px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
  align-self: stretch;
}

.v9-chip__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--v9-input-s);
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--v9-ui-icon);
  flex-shrink: 0;
  transition: background 0.1s, color 0.1s;
}
.v9-chip__delete:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-chip__delete:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; border-radius: 2px; }
</style>
