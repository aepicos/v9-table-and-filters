<script setup lang="ts">
defineProps<{
  label: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()
</script>

<template>
  <div class="tt-wrap">
    <slot />
    <div class="tt" :class="`tt--${position ?? 'top'}`" role="tooltip">{{ label }}</div>
  </div>
</template>

<style scoped>
.tt-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tt {
  position: absolute;
  z-index: 400;
  padding: var(--v9-space-xs) var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.10), 0px 4px 6px -2px rgba(0,0,0,0.06);
  opacity: 0;
  transition: opacity 0.1s ease 0.2s;
}

/* Positioning */
.tt--top    { bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); }
.tt--bottom { top:    calc(100% + 4px); left: 50%; transform: translateX(-50%); }
.tt--left   { right:  calc(100% + 4px); top:  50%; transform: translateY(-50%); }
.tt--right  { left:   calc(100% + 4px); top:  50%; transform: translateY(-50%); }

/* Show on trigger hover or focus-visible */
.tt-wrap:hover .tt,
.tt-wrap:focus-visible .tt {
  opacity: 1;
}
</style>
