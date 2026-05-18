<script setup lang="ts">
defineProps<{
  label: string
  value: string
  /** '+31', '-8', '—', etc. — shown inside the badge */
  delta?: string
  /** Controls badge colour. 'hidden' = no badge rendered */
  change?: 'good' | 'bad' | 'none' | 'hidden'
}>()
</script>

<template>
  <div class="kpi-card">
    <!-- Header row: label + optional change badge -->
    <div class="kpi-card__header">
      <span class="kpi-card__label">{{ label }}</span>
      <span
        v-if="change && change !== 'hidden' && delta"
        class="kpi-card__badge"
        :class="`kpi-card__badge--${change}`"
      >{{ delta }}</span>
    </div>
    <!-- Large value -->
    <span class="kpi-card__value">{{ value }}</span>
  </div>
</template>

<style scoped>
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-s);
  align-items: flex-start;
  min-width: 0;
  flex: 1;
}

/* ── Header row ── */
.kpi-card__header {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  width: 100%;
}

.kpi-card__label {
  flex: 1;
  font-size: var(--v9-font-size-m);
  line-height: var(--v9-line-height-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Change badge ── */
.kpi-card__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 var(--v9-space-s);
  border-radius: var(--v9-radius-round);
  border: 1px solid;
  font-size: var(--v9-font-size-m);
  line-height: var(--v9-line-height-m);
  font-weight: var(--v9-font-weight-regular);
  white-space: nowrap;
}

.kpi-card__badge--good {
  background: var(--v9-success-bg);
  border-color: var(--v9-success-border);
  color: var(--v9-success-main);
}

.kpi-card__badge--bad {
  background: var(--v9-danger-bg);
  border-color: var(--v9-danger-border);
  color: var(--v9-danger-main);
}

.kpi-card__badge--none {
  background: var(--v9-ui-canvas);
  border-color: var(--v9-ui-border-light);
  color: var(--v9-ui-text);
}

/* ── Value ── */
.kpi-card__value {
  font-size: var(--v9-font-size-xxxl);
  line-height: var(--v9-line-height-l);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
  white-space: nowrap;
  tabular-nums: 1;
  font-variant-numeric: tabular-nums;
}
</style>
