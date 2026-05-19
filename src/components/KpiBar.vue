<script setup lang="ts">
import { ref } from 'vue'
import KpiCard from './KpiCard.vue'
import Tooltip from './Tooltip.vue'

export interface KpiDef {
  id: string
  label: string
  value: string
  delta?: string
  change?: 'good' | 'bad' | 'none' | 'hidden'
  /** When false, this cell is always static even if canFilter is true */
  filterable?: boolean
}

const props = defineProps<{
  kpis: KpiDef[]
  canFilter?: boolean
  /** v-model: set of active KPI ids (multiple can be active at once) */
  modelValue?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const hovered = ref<string | null>(null)

function handleClick(id: string) {
  const current = props.modelValue ?? []
  const next = current.includes(id)
    ? current.filter(v => v !== id)
    : [...current, id]
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="kpi-bar" role="region" aria-label="Key metrics">
    <component
      v-for="kpi in kpis"
      :key="kpi.id"
      :is="canFilter && kpi.filterable !== false ? 'button' : 'div'"
      :type="canFilter && kpi.filterable !== false ? 'button' : undefined"
      class="kpi-cell"
      :class="{
        'kpi-cell--filterable':      canFilter && kpi.filterable !== false,
        'kpi-cell--active':          modelValue?.includes(kpi.id),
        'kpi-cell--hovered':         canFilter && kpi.filterable !== false && hovered === kpi.id && !modelValue?.includes(kpi.id),
        'kpi-cell--hovered-active':  canFilter && kpi.filterable !== false && hovered === kpi.id && modelValue?.includes(kpi.id),
      }"
      :aria-pressed="canFilter && kpi.filterable !== false ? (modelValue?.includes(kpi.id) ?? false) : undefined"
      :aria-label="canFilter && kpi.filterable !== false ? `Filter by ${kpi.label}` : undefined"
      @click="canFilter && kpi.filterable !== false && handleClick(kpi.id)"
      @mouseenter="canFilter && kpi.filterable !== false && (hovered = kpi.id)"
      @mouseleave="canFilter && kpi.filterable !== false && (hovered = null)"
      @focus="canFilter && kpi.filterable !== false && (hovered = kpi.id)"
      @blur="canFilter && kpi.filterable !== false && (hovered = null)"
    >
      <!-- Active indicator: filter badge — in-flow so it pushes content right -->
      <div v-if="canFilter && kpi.filterable !== false" class="kpi-cell__left-badge" aria-hidden="true">
        <Tooltip label="Remove filter" position="right">
          <div class="kpi-cell__badge-circle">
            <!-- Filter icon — visible when active but not hovered -->
            <svg class="kpi-cell__badge-icon kpi-cell__badge-icon--filter" viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <!-- Close icon — visible when active and hovered -->
            <svg class="kpi-cell__badge-icon kpi-cell__badge-icon--close" viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        </Tooltip>
      </div>

      <!-- KPI content -->
      <KpiCard
        :label="kpi.label"
        :value="kpi.value"
        :delta="kpi.delta"
        :change="kpi.change"
      />

      <!-- Hover affordance: "Filter by this" badge, top-right, absolute -->
      <div v-if="canFilter && kpi.filterable !== false" class="kpi-cell__filter-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
        </svg>
        <span>Filter</span>
      </div>

      <!-- Active indicator: 4px selection bar flush with bottom edge -->
      <div v-if="canFilter && kpi.filterable !== false" class="kpi-cell__bar" aria-hidden="true">
        <div class="kpi-cell__bar-inner"></div>
      </div>

    </component>
  </div>
</template>

<style scoped>
/* ── Bar container ── */
.kpi-bar {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  overflow: hidden;
}

/* ── Cell ── */
.kpi-cell {
  position: relative;
  isolation: isolate; /* contains z-index: -1 on ::before within this cell */
  flex: 1;
  min-width: 160px;
  max-width: 400px;
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: calc(var(--v9-space-l) + 4px) calc(var(--v9-space-xl) + 4px);
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: default;
}

.kpi-cell + .kpi-cell {
  border-left: 1px solid var(--v9-ui-border-light);
}

.kpi-cell--filterable {
  cursor: pointer;
}

.kpi-cell--active {
  padding-left: calc(var(--v9-space-xl) - 4px);
}

/* Inset hover background via pseudo-element */
.kpi-cell--filterable::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: var(--v9-radius-m);
  background: var(--v9-ui-hover);
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none;
  z-index: -1;
}

.kpi-cell--hovered::before {
  opacity: 1;
}

.kpi-cell--filterable:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -2px;
}

/* ── Left badge — in-flow, collapses when inactive ── */
/* Outer wrapper controls layout space (width + gap) */
.kpi-cell__left-badge {
  flex-shrink: 0;
  width: 0;
  margin-right: 0;
  height: 20px;
  overflow: hidden;           /* hides circle while wrapper collapses */
  align-self: flex-start;
  margin-top: 0;              /* aligns with label baseline */
  transition: width 0.2s cubic-bezier(0.34, 1.3, 0.64, 1),
              margin-right 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.kpi-cell--active .kpi-cell__left-badge {
  width: 20px;
  margin-right: 8px;
}

/* Inner circle handles the visual fly-in */
.kpi-cell__badge-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--v9-ui-selected);
  color: var(--v9-ui-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.2s ease,
              transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.kpi-cell--active .kpi-cell__badge-circle {
  opacity: 1;
  transform: translateX(0);
}

/* On hover of an active cell, swap to danger close style */
.kpi-cell__badge-icon--close { display: none; }

/* Constrain the Tooltip wrapper to the badge circle dimensions */
.kpi-cell__left-badge :deep(.tt-wrap) {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Open overflow so the Tooltip can escape the collapsing wrapper */
.kpi-cell--hovered-active .kpi-cell__left-badge {
  overflow: visible;
}

.kpi-cell--hovered-active .kpi-cell__badge-circle {
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  color: var(--v9-danger-main);
}
.kpi-cell--hovered-active .kpi-cell__badge-icon--filter { display: none; }
.kpi-cell--hovered-active .kpi-cell__badge-icon--close  { display: block; }

/* ── "Filter by this" hint — flies in from the right on hover ── */
.kpi-cell__filter-hint {
  position: absolute;
  top: 19px;
  right: var(--v9-space-l);
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  height: 20px;
  padding: 0 var(--v9-space-s);
  border-radius: var(--v9-radius-round);
  border: 1px solid var(--v9-ui-border-light);
  background: var(--v9-ui-canvas);
  color: var(--v9-ui-text);
  font-size: var(--v9-font-size-m);
  line-height: var(--v9-line-height-m);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.kpi-cell--hovered .kpi-cell__filter-hint {
  opacity: 1;
  transform: translateX(0);
}

/* ── Bottom selection bar — slides up from below on click ── */
.kpi-cell__bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  padding: 0 var(--v9-space-xl);
  display: flex;
  align-items: flex-start;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.kpi-cell__bar-inner {
  width: 100%;
  height: 4px;
  background: var(--v9-ui-selected);
  border-radius: 3px 3px 0 0;
}

.kpi-cell--active .kpi-cell__bar {
  opacity: 1;
  transform: translateY(0);
}
</style>
