<script setup lang="ts">
withDefaults(defineProps<{
  text: string
  type?: 'default' | 'dimmed' | 'info' | 'success' | 'danger' | 'warning'
}>(), {
  type: 'default',
})
</script>

<template>
  <span class="v9-badge" :class="`v9-badge--${type}`">
    <slot name="icon" />
    {{ text }}
  </span>
</template>

<style scoped>
.v9-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  height: 20px;
  padding-inline: var(--v9-space-s);
  border: 1px solid;
  border-radius: var(--v9-radius-round);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
}

/* Icon passed via named slot */
.v9-badge :slotted(svg) {
  width: var(--v9-icon-s);
  height: var(--v9-icon-s);
  flex-shrink: 0;
}

/* ── Type variants ─────────────────────────────────── */

.v9-badge--default {
  background: var(--v9-ui-canvas);
  border-color: var(--v9-ui-border-light);
  color: var(--v9-ui-text);
}

.v9-badge--dimmed {
  background: var(--v9-ui-canvas);
  border-color: var(--v9-ui-border-light);
  color: var(--v9-ui-dimmed);
}

.v9-badge--info {
  background: var(--v9-info-bg);
  border-color: var(--v9-info-border);
  color: var(--v9-info-main);
}

.v9-badge--success {
  background: var(--v9-success-bg);
  border-color: var(--v9-success-border);
  color: var(--v9-success-main);
}

.v9-badge--danger {
  background: var(--v9-danger-bg);
  border-color: var(--v9-danger-border);
  color: var(--v9-danger-main);
}

.v9-badge--warning {
  background: var(--v9-warning-bg);
  border-color: var(--v9-warning-border);
  color: var(--v9-warning-main);
}
</style>
