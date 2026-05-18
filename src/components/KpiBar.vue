<script setup lang="ts">
import { ref } from 'vue'
import KpiCard from './KpiCard.vue'

export interface KpiDef {
  id: string
  label: string
  value: string
  delta?: string
  change?: 'good' | 'bad' | 'none' | 'hidden'
}

const props = defineProps<{
  kpis: KpiDef[]
  canFilter?: boolean
  /** v-model: which KPI cell is active (null = none) */
  modelValue?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const hovered = ref<string | null>(null)

function handleClick(id: string) {
  emit('update:modelValue', props.modelValue === id ? null : id)
}
</script>

<template>
  <div class="kpi-bar" role="region" aria-label="Key metrics">
    <component
      v-for="kpi in kpis"
      :key="kpi.id"
      :is="canFilter ? 'button' : 'div'"
      :type="canFilter ? 'button' : undefined"
      class="kpi-cell"
      :class="{
        'kpi-cell--filterable': canFilter,
        'kpi-cell--active': modelValue === kpi.id,
        'kpi-cell--hovered': canFilter && hovered === kpi.id && modelValue !== kpi.id,
      }"
      :aria-pressed="canFilter ? (modelValue === kpi.id) : undefined"
      :aria-label="canFilter ? `Filter by ${kpi.label}` : undefined"
      @click="canFilter && handleClick(kpi.id)"
      @mouseenter="canFilter && (hovered = kpi.id)"
      @mouseleave="canFilter && (hovered = null)"
      @focus="canFilter && (hovered = kpi.id)"
      @blur="canFilter && (hovered = null)"
    >
      <!-- Active indicator: filter badge peeking from left edge -->
      <div v-if="canFilter" class="kpi-cell__left-badge" aria-hidden="true">
        <div class="kpi-cell__badge-circle">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true">
            <path d="M2 3.5A.5.5 0 0 1 2.5 3h11a.5.5 0 0 1 0 1H13v1.5a.5.5 0 0 1-.146.354L10 8.707V13.5a.5.5 0 0 1-.724.447l-3-1.5A.5.5 0 0 1 6 12V8.707L3.146 5.854A.5.5 0 0 1 3 5.5V4H2.5a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </div>
      </div>

      <!-- KPI content -->
      <KpiCard
        :label="kpi.label"
        :value="kpi.value"
        :delta="kpi.delta"
        :change="kpi.change"
      />

      <!-- Hover affordance: "Filter by this" badge (top-right, absolute) -->
      <div v-if="canFilter" class="kpi-cell__filter-hint" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="M2 3.5A.5.5 0 0 1 2.5 3h11a.5.5 0 0 1 0 1H13v1.5a.5.5 0 0 1-.146.354L10 8.707V13.5a.5.5 0 0 1-.724.447l-3-1.5A.5.5 0 0 1 6 12V8.707L3.146 5.854A.5.5 0 0 1 3 5.5V4H2.5a.5.5 0 0 1-.5-.5z"/>
        </svg>
        <span>Filter by this</span>
      </div>

      <!-- Active indicator: 4px selection bar along bottom edge -->
      <div v-if="canFilter" class="kpi-cell__bar" aria-hidden="true">
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
}

/* ── Cell ── */
.kpi-cell {
  position: relative;
  flex: 1;
  min-width: 160px;
  max-width: 320px;
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: var(--v9-space-l) var(--v9-space-xl);
  border-left: 1px solid var(--v9-ui-border-light);
  border-top: 1px solid var(--v9-ui-border-light);
  background: transparent;
  color: inherit;
  text-align: left;
  overflow: visible;
  /* reset button styles */
  font: inherit;
  cursor: default;
}

.kpi-cell--filterable {
  cursor: pointer;
  transition: background 0.12s ease;
}

.kpi-cell--filterable:hover,
.kpi-cell--hovered {
  background: var(--v9-ui-hover);
}

.kpi-cell--filterable:focus-visible {
  outline: 2px solid var(--v9-ui-selected);
  outline-offset: -2px;
}

/* ── Left-edge active badge ── */
.kpi-cell__left-badge {
  position: absolute;
  left: -10px;
  top: 14px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 1;
}

.kpi-cell--active .kpi-cell__left-badge {
  opacity: 1;
}

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
}

/* ── "Filter by this" hover hint (top-right absolute) ── */
.kpi-cell__filter-hint {
  position: absolute;
  top: 14px;
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
  transition: opacity 0.12s ease;
}

/* Show hint on hover, hide when active */
.kpi-cell--hovered .kpi-cell__filter-hint {
  opacity: 1;
}

.kpi-cell--active .kpi-cell__filter-hint {
  opacity: 0 !important;
}

/* ── Bottom selection bar ── */
.kpi-cell__bar {
  position: absolute;
  left: -1px;
  right: 0;
  bottom: -8px;
  height: 4px;
  padding: 0 var(--v9-space-xl);
  display: flex;
  align-items: flex-start;
  opacity: 0;
  transition: opacity 0.15s ease, bottom 0.15s ease;
  pointer-events: none;
}

.kpi-cell__bar-inner {
  width: 100%;
  height: 4px;
  background: var(--v9-ui-selected);
  border-radius: 3px 3px 0 0;
}

/* Show bar on hover and when active */
.kpi-cell--hovered .kpi-cell__bar,
.kpi-cell--active .kpi-cell__bar {
  bottom: 0;
  opacity: 1;
}
</style>
