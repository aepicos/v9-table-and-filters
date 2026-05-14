<script setup lang="ts">
defineProps<{
  value: 'AND' | 'OR'
  role?: 'Inside group' | 'Between groups'
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    class="v9-group-op"
    :class="role === 'Between groups' ? 'v9-group-op--between' : 'v9-group-op--inside'"
    :aria-label="`Operator: ${value} — click to change to ${value === 'AND' ? 'OR' : 'AND'}`"
    @click="$emit('toggle')"
  >{{ value }}</button>
</template>

<style scoped>
.v9-group-op {
  height: var(--v9-input-s);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--v9-space-adj-m) var(--v9-space-xs);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.1s, color 0.1s;
}
.v9-group-op--inside  { background: var(--v9-input-bg); }
.v9-group-op--between { background: var(--v9-ui-canvas); }
.v9-group-op:hover    { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-group-op:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }
</style>
