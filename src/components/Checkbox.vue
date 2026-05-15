<script setup lang="ts">
import { watch, useTemplateRef } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean | 'indeterminate'
  ariaLabel?: string
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const inputRef = useTemplateRef<HTMLInputElement>('input')

// Keep the native indeterminate DOM property in sync
watch(
  () => props.modelValue,
  (val) => {
    if (inputRef.value) inputRef.value.indeterminate = val === 'indeterminate'
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <span class="v9-cb-touch">
    <input
      ref="input"
      class="v9-cb"
      type="checkbox"
      :checked="modelValue === true"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
  </span>
</template>

<style scoped>
/* Touch target wrapper — 2px padding around 20×20 box = 24×24 hit area */
.v9-cb-touch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.v9-cb {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: var(--v9-radius-m);
  border: 1px solid var(--v9-input-border);
  background: var(--v9-input-bg);
  /* Inner + drop shadow always in list so they can cross-fade without snapping */
  box-shadow: inset 0 4px 2px -2px rgba(28,28,33,.2), 0 3px 2px -2px rgba(28,28,33,0), 0 0 0 0 transparent;
  flex-shrink: 0;
  cursor: pointer;
  /* Uncheck: slower fade back to unchecked state */
  transition: background 250ms ease-out, border-color 250ms ease-out, box-shadow 200ms ease-out;
}

/* Hover */
.v9-cb:not(:checked):not(:indeterminate):not(:disabled):hover {
  border-color: var(--v9-ui-selected);
  background: color-mix(in srgb, var(--v9-ui-selected) 8%, var(--v9-input-bg));
}

/* Focus */
.v9-cb:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -1px;
}

/* ── Checked ─────────────────────────────── */

/*
 * Three-phase check animation (each phase ~150ms, total 450ms):
 *   Phase 1 (0–33%):  halo expands around the still-unchecked box
 *   Phase 2 (33–66%): halo contracts, shadow flips inner→drop (box colour transitioning in parallel)
 *   Phase 3 (66–100%): checkmark draws in (box-shadow stays at drop)
 */
@keyframes v9-cb-pop {
  0%   { box-shadow: inset 0 4px 2px -2px rgba(28,28,33,.2),  0 3px 2px -2px rgba(28,28,33,0),   0 0 0 0px transparent; }
  33%  { box-shadow: inset 0 4px 2px -2px rgba(28,28,33,.2),  0 3px 2px -2px rgba(28,28,33,0),   0 0 0 8px color-mix(in srgb, var(--v9-ui-selected) 20%, transparent); }
  66%  { box-shadow: inset 0 4px 2px -2px rgba(28,28,33,0),   0 3px 2px -2px rgba(28,28,33,.2),  0 0 0 0px transparent; }
  100% { box-shadow: inset 0 4px 2px -2px rgba(28,28,33,0),   0 3px 2px -2px rgba(28,28,33,.2),  0 0 0 0px transparent; }
}

@keyframes v9-cb-check-in {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0);   }
}

.v9-cb:checked {
  background: var(--v9-ui-selected);
  border-color: var(--v9-ui-selected);
  /* Matches animation 100% keyframe so there's no snap when animation ends */
  box-shadow: inset 0 4px 2px -2px rgba(28,28,33,0), 0 3px 2px -2px rgba(28,28,33,.2), 0 0 0 0 transparent;
  /* Delay background/border so box stays unchecked colour during Phase 1 halo */
  transition: background 150ms ease-out 150ms, border-color 150ms ease-out 150ms;
  animation: v9-cb-pop 450ms ease-out;
}

/* Checkmark — design SVG 14×11px, wipes in left→right during Phase 3 */
.v9-cb:checked::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  width: 14px;
  height: 11px;
  background-image: url("data:image/svg+xml,%3Csvg width='14' height='11' viewBox='0 0 14 11' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='white' d='M14 1.53686L5 11L0 5.88421L1.48137 4.34736L5 7.92628L12.5186 0L14 1.53686Z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  /* Starts at 300ms — after box colour has fully settled */
  animation: v9-cb-check-in 150ms ease-out 300ms both;
}

/* ── Indeterminate (indeterminate + group-checked) ── */

.v9-cb:indeterminate {
  background: var(--v9-input-bg);
  border-color: var(--v9-input-border);
  box-shadow: inset 0 4px 2px -2px rgba(28,28,33,.2), 0 3px 2px -2px rgba(28,28,33,0), 0 0 0 0 transparent;
}

/* Dash */
.v9-cb:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 8px;
  width: 12px;
  height: 2px;
  background: var(--v9-ui-selected);
  border-radius: 1px;
}

/* ── Disabled ────────────────────────────── */

.v9-cb:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.v9-cb-touch:has(.v9-cb:disabled) {
  cursor: not-allowed;
}
</style>
