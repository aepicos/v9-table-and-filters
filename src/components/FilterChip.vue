<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { FilterChip, FilterDef } from '../data/filters'

const props = defineProps<{
  chip: FilterChip
  filterDef: FilterDef | undefined
  activeValues?: string[]   // other values already applied for this filter key
}>()

const emit = defineEmits<{
  remove: []
  'update-operator': [operator: string]
  'update-value': [value: string]
}>()

// ── Dropdown state ────────────────────────────────────────────────────────────

const showOperatorMenu = ref(false)
const showValueMenu    = ref(false)
const loadingValues    = ref(false)
const loadedValues     = ref<string[]>([])

const operatorBtnRef = ref<HTMLElement | null>(null)
const valueBtnRef    = ref<HTMLElement | null>(null)

// ── Viewport-aware positioning ────────────────────────────────────────────────

const GAP  = 4   // px gap between chip section and dropdown
const EDGE = 8   // min distance from viewport edge

function dropdownStyle(
  el: HTMLElement | null,
  estimatedH: number,
  minW = 140,
): Record<string, string> {
  if (!el) return { top: '0px', left: '0px', minWidth: `${minW}px` }
  const r  = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal — left-align to button; clamp so it doesn't overflow right edge
  let left = r.left
  if (left + minW > vw - EDGE) left = vw - minW - EDGE
  if (left < EDGE) left = EDGE

  // Vertical — prefer below; flip above when insufficient space
  const spaceBelow = vh - r.bottom - GAP
  const spaceAbove = r.top - GAP

  const top = (spaceBelow >= estimatedH || spaceBelow >= spaceAbove)
    ? r.bottom + GAP
    : Math.max(EDGE, r.top - GAP - estimatedH)

  return { top: `${top}px`, left: `${left}px`, minWidth: `${minW}px` }
}

const operatorMenuStyle = computed(() =>
  dropdownStyle(showOperatorMenu.value ? operatorBtnRef.value : null, 120))

const valueMenuStyle = computed(() => {
  const itemCount = loadedValues.value.length || 6
  return dropdownStyle(showValueMenu.value ? valueBtnRef.value : null, itemCount * 32 + 8, 160)
})

// ── Open / close ──────────────────────────────────────────────────────────────

function openOperatorMenu() {
  showValueMenu.value = false
  showOperatorMenu.value = true
}

function openValueMenu() {
  showOperatorMenu.value = false
  showValueMenu.value = true
  startValueLoad()
}

async function startValueLoad() {
  const values = props.filterDef?.values
  if (!values?.length) return  // text/number — no preset values

  loadingValues.value = true
  loadedValues.value  = []

  // Simulate async fetch (matches FilterMenu loading behaviour)
  await new Promise(r => setTimeout(r, 300))

  loadedValues.value  = values
  loadingValues.value = false
}

function closeAll() {
  showOperatorMenu.value = false
  showValueMenu.value    = false
}

function selectOperator(op: string) {
  emit('update-operator', op)
  showOperatorMenu.value = false
  nextTick(() => operatorBtnRef.value?.focus())
}

function selectValue(val: string) {
  emit('update-value', val)
  showValueMenu.value = false
  nextTick(() => valueBtnRef.value?.focus())
}

// ── Whether the value section has preset options ──────────────────────────────

const hasPresets = computed(() => (props.filterDef?.values?.length ?? 0) > 0)

// ── Number input (for number-type filters, e.g. Risk score) ──────────────────

const isNumberFilter = computed(() => props.filterDef?.type === 'number')

const numberInputRef  = ref<HTMLInputElement | null>(null)
const numberDraft     = ref('')
const numberError     = computed(() => {
  if (numberDraft.value === '') return null
  const n = Number(numberDraft.value)
  if (isNaN(n)) return 'Enter a number'
  if (n < 0 || n > 1000) return 'Must be 0 – 1000'
  return null
})

// Pre-fill the draft with the current value when the menu opens
watch(showValueMenu, (open) => {
  if (open && isNumberFilter.value) {
    numberDraft.value = props.chip.value
    nextTick(() => {
      numberInputRef.value?.focus()
      numberInputRef.value?.select()
    })
  }
})

function applyNumberValue() {
  if (numberError.value !== null || numberDraft.value === '') return
  emit('update-value', numberDraft.value)
  showValueMenu.value = false
  nextTick(() => valueBtnRef.value?.focus())
}
</script>

<template>
  <!-- Click-outside overlay -->
  <teleport to="body">
    <div
      v-if="showOperatorMenu || showValueMenu"
      class="v9-chip-overlay"
      @click="closeAll"
      @keydown.esc="closeAll"
    />
  </teleport>

  <!-- Operator dropdown — teleported so bar overflow doesn't clip it -->
  <teleport to="body">
    <div
      v-if="showOperatorMenu"
      class="v9-chip-dropdown"
      role="listbox"
      :aria-label="`Operator options for ${chip.key}`"
      :style="operatorMenuStyle"
    >
      <button
        v-for="op in (filterDef?.operators ?? ['is', 'is not'])"
        :key="op"
        class="v9-chip-dropdown__item"
        :class="{ 'v9-chip-dropdown__item--selected': op === chip.operator }"
        role="option"
        :aria-selected="op === chip.operator"
        @click="selectOperator(op)"
      >
        <span class="v9-chip-dropdown__op-symbol">{{ op }}</span>
        <span v-if="filterDef?.operatorDescriptions?.[op]" class="v9-chip-dropdown__op-desc">
          {{ filterDef.operatorDescriptions[op] }}
        </span>
      </button>
    </div>
  </teleport>

  <!-- Value dropdown — teleported for same reason -->
  <teleport to="body">
    <div
      v-if="showValueMenu"
      class="v9-chip-dropdown"
      :class="{ 'v9-chip-dropdown--number': isNumberFilter }"
      role="dialog"
      :aria-label="`Change value for ${chip.key}`"
      :style="valueMenuStyle"
    >
      <!-- Number input (number-type filters, e.g. Risk score) -->
      <div v-if="isNumberFilter" class="v9-chip-dropdown__number-form">
        <input
          ref="numberInputRef"
          v-model="numberDraft"
          class="v9-chip-dropdown__number-input"
          :class="{ 'v9-chip-dropdown__number-input--error': numberError }"
          type="number"
          min="0"
          max="1000"
          placeholder="0 – 1000"
          aria-label="Enter a value between 0 and 1000"
          @keydown.enter.prevent="applyNumberValue"
          @keydown.escape.prevent="closeAll"
        />
        <button
          class="v9-chip-dropdown__number-apply"
          :disabled="!!numberError || numberDraft === ''"
          @click="applyNumberValue"
        >Apply</button>
        <p v-if="numberError" class="v9-chip-dropdown__number-error">{{ numberError }}</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loadingValues" class="v9-chip-dropdown__loading" role="status" aria-label="Loading values">
        <svg class="v9-chip-dropdown__spinner" viewBox="22 22 44 44" aria-hidden="true">
          <circle cx="44" cy="44" r="20" fill="none" stroke="currentColor" stroke-width="4"
            stroke-dasharray="80 200" stroke-dashoffset="0"/>
        </svg>
      </div>

      <!-- Enum values -->
      <template v-else-if="loadedValues.length">
        <button
          v-for="val in loadedValues"
          :key="val"
          class="v9-chip-dropdown__item"
          :class="{
            'v9-chip-dropdown__item--selected': val === chip.value,
            'v9-chip-dropdown__item--disabled': val !== chip.value && activeValues?.includes(val),
          }"
          role="option"
          :aria-selected="val === chip.value"
          :aria-disabled="(val !== chip.value && activeValues?.includes(val)) || undefined"
          :disabled="val !== chip.value && activeValues?.includes(val)"
          @click="selectValue(val)"
        >{{ val }}</button>
      </template>

      <!-- No presets (text / number type) -->
      <div v-else class="v9-chip-dropdown__empty">
        Type a value in the filter bar
      </div>
    </div>
  </teleport>

  <div class="v9-chip" role="group" :aria-label="`${chip.key} filter`">

    <!-- Key (non-interactive) -->
    <div class="v9-chip__section v9-chip__key">
      <span>{{ chip.key }}</span>
    </div>

    <div class="v9-chip__divider" aria-hidden="true" />

    <!-- Operator -->
    <button
      ref="operatorBtnRef"
      class="v9-chip__section v9-chip__operator"
      :aria-label="`Change operator for ${chip.key} filter, currently ${chip.operator}`"
      :aria-expanded="showOperatorMenu"
      aria-haspopup="listbox"
      @click="openOperatorMenu"
    >
      <span>{{ chip.operator }}</span>

    </button>

    <div class="v9-chip__divider" aria-hidden="true" />

    <!-- Value -->
    <button
      ref="valueBtnRef"
      class="v9-chip__section v9-chip__value"
      :aria-label="`Change value for ${chip.key} filter, currently ${chip.value}`"
      :aria-expanded="showValueMenu"
      :aria-haspopup="hasPresets ? 'listbox' : undefined"
      @click="openValueMenu"
    >
      <span>{{ chip.value }}</span>
    </button>

    <div class="v9-chip__divider" aria-hidden="true" />

    <!-- Delete -->
    <button
      class="v9-chip__delete"
      :aria-label="`Remove ${chip.key} filter`"
      data-tooltip="Remove filter"
      @click="$emit('remove')"
    >
      <svg viewBox="0 0 24 24" :width="14" :height="14" aria-hidden="true">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
      </svg>
    </button>

  </div>
</template>

<style scoped>
/* ── Chip shell ───────────────────────────────────────────────────────────── */

.v9-chip {
  display: inline-flex;
  align-items: stretch;
  height: var(--v9-input-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  overflow: visible;
  flex-shrink: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  position: relative;
}

/* ── Shared section styles ───────────────────────────────────────────────── */

.v9-chip__section {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 var(--v9-space-s);
  white-space: nowrap;
  color: var(--v9-input-text);
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
}

.v9-chip__key {
  cursor: default;
}

/* ── Operator ────────────────────────────────────────────────────────────── */

.v9-chip__operator {
  cursor: pointer;
  padding-left: var(--v9-space-xs);
  padding-right: var(--v9-space-xs);
  color: var(--v9-ui-dimmed);
  transition: background 0.1s;
  border-radius: 0;
}
.v9-chip__operator:hover { background: var(--v9-ui-hover); }
.v9-chip__operator:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; border-radius: 2px; }

/* ── Value ───────────────────────────────────────────────────────────────── */

.v9-chip__value {
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 0;
}
.v9-chip__value:hover { background: var(--v9-ui-hover); }
.v9-chip__value:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; border-radius: 2px; }


/* ── Divider ─────────────────────────────────────────────────────────────── */

.v9-chip__divider {
  width: 1px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
  align-self: stretch;
}

/* ── Delete ──────────────────────────────────────────────────────────────── */

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
  position: relative;
}
.v9-chip__delete:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-chip__delete:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; border-radius: 2px; }

/* Tooltip on delete */
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
  padding: 3px 8px;
  border-radius: var(--v9-radius-s);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s 0.4s;
  z-index: 1100;
}
[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after { opacity: 1; }

/* ── Click-outside overlay ───────────────────────────────────────────────── */

.v9-chip-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* ── Teleported dropdown ─────────────────────────────────────────────────── */

.v9-chip-dropdown {
  position: fixed;
  z-index: 1000;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: var(--v9-elevation-m);
  padding: var(--v9-space-xxs);
  max-height: 280px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.v9-chip-dropdown__item {
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-m);
  background: none;
  border: none;
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: background 0.1s;
}
.v9-chip-dropdown__item:hover { background: var(--v9-ui-hover); }
.v9-chip-dropdown__item--selected { color: var(--v9-ui-selected); font-weight: var(--v9-font-weight-strong); }

.v9-chip-dropdown__op-symbol {
  min-width: 16px;
  flex-shrink: 0;
}
.v9-chip-dropdown__op-desc {
  color: var(--v9-ui-dimmed);
  font-weight: var(--v9-font-weight-regular);
}
.v9-chip-dropdown__item--selected .v9-chip-dropdown__op-desc {
  color: var(--v9-ui-selected);
  opacity: 0.7;
}
.v9-chip-dropdown__item--disabled,
.v9-chip-dropdown__item:disabled { color: var(--v9-ui-dimmed); opacity: 0.5; cursor: not-allowed; }
.v9-chip-dropdown__item--disabled:hover,
.v9-chip-dropdown__item:disabled:hover { background: none; }
.v9-chip-dropdown__item:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

/* Loading spinner */
.v9-chip-dropdown__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  color: var(--v9-ui-dimmed);
}
.v9-chip-dropdown__spinner {
  width: 20px;
  height: 20px;
  animation: v9-spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes v9-spin { to { transform: rotate(360deg); } }

/* No presets message */
.v9-chip-dropdown__empty {
  padding: var(--v9-space-s) var(--v9-space-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
}

/* Number input form */
.v9-chip-dropdown--number { min-width: 200px; }

.v9-chip-dropdown__number-form {
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-xs);
  padding: var(--v9-space-xs);
}

.v9-chip-dropdown__number-input {
  width: 100%;
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
  box-shadow: var(--v9-elevation-input);
  outline: none;
  box-sizing: border-box;
}
.v9-chip-dropdown__number-input:focus {
  border-color: var(--v9-ui-focus);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--v9-ui-focus) 20%, transparent);
}
.v9-chip-dropdown__number-input--error {
  border-color: var(--v9-ui-danger, #d32f2f);
}

/* hide browser spin buttons */
.v9-chip-dropdown__number-input::-webkit-inner-spin-button,
.v9-chip-dropdown__number-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.v9-chip-dropdown__number-input[type=number] { -moz-appearance: textfield; }

.v9-chip-dropdown__number-apply {
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-m);
  background: var(--v9-ui-selected);
  border: none;
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.1s;
}
.v9-chip-dropdown__number-apply:disabled { opacity: 0.4; cursor: not-allowed; }
.v9-chip-dropdown__number-apply:not(:disabled):hover { opacity: 0.88; }
.v9-chip-dropdown__number-apply:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 2px; }

.v9-chip-dropdown__number-error {
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-danger, #d32f2f);
}
</style>
