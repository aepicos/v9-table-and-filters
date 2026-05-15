<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

export interface RadioBarOption {
  label: string
  value: string
  icon?: string          // SVG path d attribute
  iconViewBox?: string   // defaults to "0 0 20 20"
  iconFilled?: boolean   // true = fill="currentColor", false = stroke-based
  iconFillRule?: 'nonzero' | 'evenodd' | 'inherit'
  iconClipRule?: 'nonzero' | 'evenodd' | 'inherit'
  iconOnly?: boolean     // hide text label; label becomes aria-label only
}

const props = withDefaults(defineProps<{
  options: RadioBarOption[]
  modelValue: string
  label?: string
  size?: 's' | 'm' | 'l'
  stretch?: boolean
  showClear?: boolean
  clearTooltip?: string
}>(), {
  size: 'm',
  stretch: false,
  showClear: false,
  clearTooltip: 'Clear',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  emit('update:modelValue', value)
}

function clear() {
  emit('update:modelValue', '')
}

// ── Keyboard: roving tabindex + arrow-key navigation ─────────────
const btnRefs = ref<(HTMLButtonElement | null)[]>([])

function setBtnRef(el: unknown, i: number) {
  btnRefs.value[i] = el as HTMLButtonElement | null
}

function tabindexFor(i: number): 0 | -1 {
  const selectedIdx = props.options.findIndex(o => o.value === props.modelValue)
  const active = selectedIdx >= 0 ? selectedIdx : 0
  return i === active ? 0 : -1
}

function onKeydown(e: KeyboardEvent) {
  const btns = btnRefs.value.filter((b): b is HTMLButtonElement => b !== null)
  const idx = btns.indexOf(e.currentTarget as HTMLButtonElement)
  if (idx === -1) return

  let next = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    next = (idx + 1) % btns.length
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    next = (idx - 1 + btns.length) % btns.length
  } else if (e.key === 'Home') {
    next = 0
  } else if (e.key === 'End') {
    next = btns.length - 1
  } else {
    return
  }

  e.preventDefault()
  e.stopPropagation()   // don't let parent widgets (e.g. SortPopover) also handle this
  btns[next].focus()
  emit('update:modelValue', props.options[next].value)
}

// Sliding indicator
const wrapRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref<{ left: string; width: string } | null>(null)

async function updateIndicator() {
  if (!wrapRef.value || !props.modelValue) {
    indicatorStyle.value = null
    return
  }
  await nextTick()
  const btn = wrapRef.value.querySelector('.rb-btn--selected') as HTMLElement | null
  if (!btn) { indicatorStyle.value = null; return }
  const wrapRect = wrapRef.value.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  indicatorStyle.value = {
    left: `${btnRect.left - wrapRect.left}px`,
    width: `${btnRect.width}px`,
  }
}

watch(() => props.modelValue, updateIndicator)
onMounted(updateIndicator)

// Teleported tooltip positioning
const ibRef = ref<HTMLElement | null>(null)
const tooltipVisible = ref(false)
const tooltipStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

function showTooltip() {
  if (!ibRef.value) return
  const rect = ibRef.value.getBoundingClientRect()
  tooltipStyle.value = {
    top: `${rect.top - 4}px`,
    left: `${rect.left + rect.width / 2}px`,
  }
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}
</script>

<template>
  <div
    ref="wrapRef"
    class="rb-wrap"
    :class="[`rb-wrap--${size}`, { 'rb-wrap--stretch': stretch }]"
    role="radiogroup"
    :aria-label="label ?? 'Options'"
  >
    <!-- Track background -->
    <div class="rb-track" aria-hidden="true" />

    <!-- Sliding selected indicator -->
    <div
      v-if="indicatorStyle"
      class="rb-indicator"
      :style="indicatorStyle"
      aria-hidden="true"
    />

    <!-- Optional label -->
    <span v-if="label" class="rb-label">{{ label }}</span>

    <!-- Option buttons -->
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      :ref="(el) => setBtnRef(el, i)"
      class="rb-btn"
      :class="{ 'rb-btn--selected': modelValue === opt.value, 'rb-btn--icon-only': opt.iconOnly }"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :aria-label="opt.iconOnly ? opt.label : undefined"
      :tabindex="tabindexFor(i)"
      @click="select(opt.value)"
      @keydown="onKeydown"
    >
      <svg
        v-if="opt.icon"
        :viewBox="opt.iconViewBox ?? '0 0 20 20'"
        :fill="opt.iconFilled ? 'currentColor' : 'none'"
        :stroke="opt.iconFilled ? 'none' : 'currentColor'"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="opt.icon" :fill-rule="opt.iconFillRule" :clip-rule="opt.iconClipRule" />
      </svg>
      <span v-if="!opt.iconOnly">{{ opt.label }}</span>
    </button>

    <!-- Clear — icon button (subtle) with teleported tooltip -->
    <div v-if="showClear && !!modelValue" class="rb-ib-wrap">
      <button
        ref="ibRef"
        class="rb-ib"
        :aria-label="clearTooltip"
        @click="clear"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
        @focus="showTooltip"
        @blur="hideTooltip"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <Teleport to="body">
        <div
          v-if="tooltipVisible"
          class="v9-rb-tooltip"
          role="tooltip"
          :style="tooltipStyle"
        >
          {{ clearTooltip }}
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────── */

.rb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-adj-m);
  font-family: var(--v9-font);
}

/* ── Track ───────────────────────────────────────────────────────── */

.rb-track {
  position: absolute;
  inset: -2px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: calc(var(--v9-radius-m) + 2px);
  pointer-events: none;
}

/* ── Sliding indicator ───────────────────────────────────────────── */

.rb-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  pointer-events: none;
  transition: left 0.18s cubic-bezier(0.4, 0, 0.2, 1), width 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Label ───────────────────────────────────────────────────────── */

.rb-label {
  position: relative;
  color: var(--v9-ui-dimmed);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  white-space: nowrap;
  user-select: none;
}

/* ── Option button base ──────────────────────────────────────────── */

.rb-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.1s;
}

.rb-btn:hover { background: var(--v9-ui-hover); }
.rb-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }

/* ── Selected option ─────────────────────────────────────────────── */

.rb-btn--selected {
  color: var(--v9-ui-selected);
  font-weight: var(--v9-font-weight-strong);
  cursor: default;
}
.rb-btn--selected:hover { background: none; }

/* ── Sizes ───────────────────────────────────────────────────────── */

.rb-wrap--s .rb-btn            { height: var(--v9-input-s); padding: 0 var(--v9-space-s); gap: var(--v9-space-xxs); }
.rb-wrap--s .rb-btn--icon-only { width: var(--v9-input-s); padding: 0; }
.rb-wrap--s .rb-btn svg        { width: var(--v9-icon-s); height: var(--v9-icon-s); }
.rb-wrap--s .rb-label          { padding: 0 var(--v9-space-xs); }
.rb-wrap--s .rb-ib             { width: var(--v9-input-s); height: var(--v9-input-s); padding: var(--v9-space-adj-m); }
.rb-wrap--s .rb-ib svg         { width: var(--v9-icon-s); height: var(--v9-icon-s); }

.rb-wrap--m .rb-btn            { height: var(--v9-input-m); padding: 0 var(--v9-space-m); gap: var(--v9-space-xs); }
.rb-wrap--m .rb-btn--icon-only { width: var(--v9-input-m); padding: 0; }
.rb-wrap--m .rb-btn svg        { width: var(--v9-icon-m); height: var(--v9-icon-m); }
.rb-wrap--m .rb-label          { padding: 0 var(--v9-space-xs); }
.rb-wrap--m .rb-ib             { width: var(--v9-input-m); height: var(--v9-input-m); padding: var(--v9-space-xs); }
.rb-wrap--m .rb-ib svg         { width: var(--v9-icon-m); height: var(--v9-icon-m); }

.rb-wrap--l .rb-btn            { height: var(--v9-input-l); padding: 0 var(--v9-space-l); gap: var(--v9-space-xs); }
.rb-wrap--l .rb-btn--icon-only { width: var(--v9-input-l); padding: 0; }
.rb-wrap--l .rb-btn svg        { width: var(--v9-icon-m); height: var(--v9-icon-m); }

/* ── Stretch (full-width, equal buttons) ─────────────────────────── */

.rb-wrap--stretch              { width: 100%; }
.rb-wrap--stretch .rb-btn      { flex: 1; }

/* ── Icon button wrapper ─────────────────────────────────────────── */

.rb-ib-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* ── Icon button (subtle variant) ───────────────────────────────── */

.rb-ib {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  color: var(--v9-ui-icon);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.1s;
}

.rb-ib:hover { background: var(--v9-ui-hover); }
.rb-ib:active { box-shadow: inset 0px 4px 2px -2px rgba(28, 28, 33, 0.12); }
.rb-ib:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }
</style>

<!-- Unscoped: tooltip is teleported to <body> outside this component's scope -->
<style>
.v9-rb-tooltip {
  position: fixed;
  transform: translateX(-50%) translateY(-100%);
  width: max-content;
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  padding: var(--v9-space-xs) var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.10), 0px 4px 6px -2px rgba(0,0,0,0.06);
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
}
</style>
