<script setup lang="ts">
import { watch, useTemplateRef } from 'vue'

/**
 * ParentCheckbox — for group-header and select-all (thead) rows.
 *
 * All three states keep the unchecked-style box (input.bg, input.border,
 * inner shadow). There is no filled dark state. The native <input> is
 * never set to :checked so the leaf Checkbox animation never fires here.
 *
 * States:
 *   false           — empty box (nothing selected in group)
 *   'indeterminate' — box + brand dash (some children selected)
 *   'group-checked' — box + brand checkmark (all children selected)
 */

const props = withDefaults(defineProps<{
  modelValue: false | 'indeterminate' | 'group-checked'
  ariaLabel?: string
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const inputRef = useTemplateRef<HTMLInputElement>('input')

watch(
  () => props.modelValue,
  (val) => {
    if (inputRef.value) inputRef.value.indeterminate = val === 'indeterminate'
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <span class="v9-pcb-touch">
    <input
      ref="input"
      class="v9-pcb"
      type="checkbox"
      :checked="false"
      :data-group-checked="modelValue === 'group-checked' ? '' : undefined"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-checked="modelValue === 'group-checked' ? 'true' : modelValue === 'indeterminate' ? 'mixed' : 'false'"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
  </span>
</template>

<style scoped>
/* Touch target — 2px padding around 20×20 box = 24×24 hit area */
.v9-pcb-touch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

/* ── Box ─────────────────────────────────── */
/* Always the unchecked style — no :checked rule intentionally. */

.v9-pcb {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: var(--v9-radius-m);
  border: 1px solid var(--v9-input-border);
  background: var(--v9-input-bg);
  box-shadow: inset 0 4px 2px -2px rgba(28, 28, 33, 0.2);
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 150ms ease-out, background 150ms ease-out;
}

/* Hover */
.v9-pcb:not(:disabled):hover {
  border-color: var(--v9-ui-selected);
  background: color-mix(in srgb, var(--v9-ui-selected) 8%, var(--v9-input-bg));
}

/* Focus */
.v9-pcb:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -1px;
}

/* ── Indeterminate — brand dash ──────────── */

.v9-pcb:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 8px;
  width: 12px;
  height: 2px;
  background: var(--v9-ui-selected);
  border-radius: 1px;
}

/* ── Group checked — brand checkmark ────── */
/* Uses CSS mask so the colour is driven by ui.selected (light + dark mode). */

.v9-pcb[data-group-checked]::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  width: 14px;
  height: 11px;
  background-color: var(--v9-ui-selected);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='14' height='11' viewBox='0 0 14 11' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='white' d='M14 1.53686L5 11L0 5.88421L1.48137 4.34736L5 7.92628L12.5186 0L14 1.53686Z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg width='14' height='11' viewBox='0 0 14 11' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='white' d='M14 1.53686L5 11L0 5.88421L1.48137 4.34736L5 7.92628L12.5186 0L14 1.53686Z'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

/* ── Disabled ────────────────────────────── */

.v9-pcb:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.v9-pcb-touch:has(.v9-pcb:disabled) {
  cursor: not-allowed;
}
</style>
