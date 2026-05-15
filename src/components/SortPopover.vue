<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import RadioBar from './RadioBar.vue'
import type { RadioBarOption } from './RadioBar.vue'

export interface SortColDef {
  id: string
  label: string
  defaultDesc?: boolean
}

const props = defineProps<{
  sortCol: string | null
  sortDir: 'asc' | 'desc'
  groupSortCol: string
  groupSortDir: 'asc' | 'desc'
  columns: SortColDef[]
  isGrouped: boolean
  triggerEl: HTMLElement | null
}>()

const emit = defineEmits<{
  setSort: [col: string, dir: 'asc' | 'desc']
  setGroupSort: [col: string, dir: 'asc' | 'desc']
  close: []
}>()

// Text columns: ↓ = a→z (asc), ↑ = z→a (desc)
const DIR_OPTIONS_TEXT: RadioBarOption[] = [
  { label: 'A → Z', value: 'asc',  icon: 'M10 4v12M6 12l4 4 4-4', iconOnly: true },
  { label: 'Z → A', value: 'desc', icon: 'M10 16V4M6 8l4-4 4 4',  iconOnly: true },
]

// Numeric/date columns: ↓ = 9→0 / now→past (desc), ↑ = 0→9 / past→now (asc)
const DIR_OPTIONS_NUMERIC: RadioBarOption[] = [
  { label: '9 → 0', value: 'desc', icon: 'M10 4v12M6 12l4 4 4-4', iconOnly: true },
  { label: '0 → 9', value: 'asc',  icon: 'M10 16V4M6 8l4-4 4 4',  iconOnly: true },
]

const GROUP_OPTIONS = [
  { id: 'follow',    label: 'Follow asset sorting', hasDir: false, defaultDesc: false },
  { id: 'name',      label: 'Name',                 hasDir: true,  defaultDesc: false },
  { id: 'riskScore', label: 'Risk score',           hasDir: true,  defaultDesc: true  },
]

// ── Local direction state ────────────────────────────────────────
// Tracks the displayed direction per column independently from the active sort.
// Arrow keys update this without applying the sort; RadioBar clicks apply immediately.
const localDirs = ref<Record<string, 'asc' | 'desc'>>({})

function localDir(id: string, activeId: string | null, activeDir: 'asc' | 'desc', defaultDir: 'asc' | 'desc' = 'asc'): 'asc' | 'desc' {
  return localDirs.value[id] ?? (id === activeId ? activeDir : defaultDir)
}

// ── Flat navigation list ─────────────────────────────────────────
interface NavItem {
  key: string
  hasDir: boolean
  activate: () => void  // select this column + close
  getDir: () => 'asc' | 'desc'
  applyDir: (d: 'asc' | 'desc') => void  // RadioBar click: apply immediately, no close
  isActive: () => boolean
  dirOptions: RadioBarOption[]
}

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = []
  if (props.isGrouped) {
    items.push({
      key: 'follow', hasDir: false,
      activate: () => { emit('setGroupSort', 'follow', 'asc'); close() },
      getDir: () => 'asc',
      applyDir: () => {},
      isActive: () => props.groupSortCol === 'follow',
      dirOptions: DIR_OPTIONS_TEXT,
    })
    for (const opt of GROUP_OPTIONS.slice(1)) {
      const id = opt.id
      const defaultDir = opt.defaultDesc ? 'desc' : 'asc'
      const dirOptions = opt.defaultDesc ? DIR_OPTIONS_NUMERIC : DIR_OPTIONS_TEXT
      items.push({
        key: id, hasDir: true,
        activate: () => {
          emit('setGroupSort', id, localDir(id, props.groupSortCol, props.groupSortDir, defaultDir))
          close()
        },
        getDir: () => localDir(id, props.groupSortCol, props.groupSortDir, defaultDir),
        applyDir: (d) => {
          localDirs.value = { ...localDirs.value, [id]: d }
          emit('setGroupSort', id, d)
        },
        isActive: () => props.groupSortCol === id,
        dirOptions,
      })
    }
  }
  for (const col of props.columns) {
    const id = col.id
    const defaultDir = col.defaultDesc ? 'desc' : 'asc'
    const dirOptions = col.defaultDesc ? DIR_OPTIONS_NUMERIC : DIR_OPTIONS_TEXT
    items.push({
      key: id, hasDir: true,
      activate: () => {
        emit('setSort', id, localDir(id, props.sortCol, props.sortDir, defaultDir))
        close()
      },
      getDir: () => localDir(id, props.sortCol, props.sortDir, defaultDir),
      applyDir: (d) => {
        localDirs.value = { ...localDirs.value, [id]: d }
        emit('setSort', id, d)
      },
      isActive: () => props.sortCol === id,
      dirOptions,
    })
  }
  return items
})

const assetStartIdx = computed(() => props.isGrouped ? GROUP_OPTIONS.length : 0)

// ── Roving tabindex ──────────────────────────────────────────────
const focusedIdx = ref(0)
const nameBtnRefs = ref<(HTMLButtonElement | null)[]>([])
const rowRefs = ref<(HTMLElement | null)[]>([])

function setNameRef(el: unknown, idx: number) {
  nameBtnRefs.value[idx] = el as HTMLButtonElement | null
}

function setRowRef(el: unknown, idx: number) {
  rowRefs.value[idx] = el as HTMLElement | null
}

function focusDirBtn(rowIdx: number, btnIdx: 0 | 1) {
  nextTick(() => {
    const btns = rowRefs.value[rowIdx]?.querySelectorAll<HTMLButtonElement>('.rb-btn')
    btns?.[btnIdx]?.focus()
  })
}

function moveFocus(idx: number) {
  focusedIdx.value = idx
  nextTick(() => nameBtnRefs.value[idx]?.focus())
}

// Track focus from any element in the pop (e.g. RadioBar button clicked)
function onFocusin(e: FocusEvent) {
  const idx = nameBtnRefs.value.findIndex(b => b === e.target)
  if (idx >= 0) focusedIdx.value = idx
}

// ── Keyboard handler ─────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  const items = navItems.value
  const cur = items[focusedIdx.value]

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      moveFocus(Math.min(focusedIdx.value + 1, items.length - 1))
      break
    case 'ArrowUp':
      e.preventDefault()
      moveFocus(Math.max(focusedIdx.value - 1, 0))
      break
    case 'ArrowRight':
      e.preventDefault()
      if (cur?.hasDir) {
        const d = cur.dirOptions[1].value as 'asc' | 'desc'
        localDirs.value = { ...localDirs.value, [cur.key]: d }
        focusDirBtn(focusedIdx.value, 1)
      }
      break
    case 'ArrowLeft':
      e.preventDefault()
      if (cur?.hasDir) {
        const d = cur.dirOptions[0].value as 'asc' | 'desc'
        localDirs.value = { ...localDirs.value, [cur.key]: d }
        focusDirBtn(focusedIdx.value, 0)
      }
      break
    case 'Home':
      e.preventDefault()
      moveFocus(0)
      break
    case 'End':
      e.preventDefault()
      moveFocus(items.length - 1)
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      cur?.activate()
      break
    case 'Escape':
    case 'Tab':
      e.preventDefault()
      close()
      break
  }
}

function close() {
  emit('close')
  nextTick(() => props.triggerEl?.focus())
}

// ── Positioning ──────────────────────────────────────────────────
const popRef = ref<HTMLElement | null>(null)
const popStyle = ref<{ top: string; right: string }>({ top: '0px', right: '0px' })

onMounted(async () => {
  await nextTick()
  if (props.triggerEl) {
    const r = props.triggerEl.getBoundingClientRect()
    popStyle.value = {
      top: `${r.bottom + 4}px`,
      right: `${window.innerWidth - r.right}px`,
    }
  }

  // Focus the active item, or the first item
  const activeIdx = navItems.value.findIndex(i => i.isActive())
  focusedIdx.value = activeIdx >= 0 ? activeIdx : 0
  await nextTick()
  nameBtnRefs.value[focusedIdx.value]?.focus()

  setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
})

onUnmounted(() => document.removeEventListener('mousedown', onOutside))

function onOutside(e: MouseEvent) {
  if (
    !popRef.value?.contains(e.target as Node) &&
    !props.triggerEl?.contains(e.target as Node)
  ) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="popRef"
      class="sp-pop"
      :class="{ 'sp-pop--single': !isGrouped }"
      :style="popStyle"
      role="menu"
      aria-label="Sort options"
      @keydown="onKeydown"
      @focusin="onFocusin"
    >
      <div :class="isGrouped ? 'sp-cols' : 'sp-single'">

        <!-- Group sort section -->
        <div v-if="isGrouped" class="sp-col" role="group" aria-label="Groups">
          <div class="sp-section-hd" aria-hidden="true">Groups</div>

          <!-- Follow asset sorting -->
          <div :ref="(el) => setRowRef(el, 0)" class="sp-row" :class="{ 'sp-row--on': groupSortCol === 'follow' }">
            <button
              :ref="(el) => setNameRef(el, 0)"
              class="sp-name"
              :class="{ 'sp-name--on': groupSortCol === 'follow' }"
              role="menuitemradio"
              :aria-checked="groupSortCol === 'follow'"
              :tabindex="focusedIdx === 0 ? 0 : -1"
              @click="navItems[0].activate()"
            ><em>Follow asset sorting</em></button>
          </div>

          <!-- Name + Risk score with direction -->
          <div
            v-for="(opt, i) in GROUP_OPTIONS.slice(1)"
            :key="opt.id"
            :ref="(el) => setRowRef(el, i + 1)"
            class="sp-row"
            :class="{ 'sp-row--on': groupSortCol === opt.id }"
          >
            <button
              :ref="(el) => setNameRef(el, i + 1)"
              class="sp-name"
              :class="{ 'sp-name--on': groupSortCol === opt.id }"
              role="menuitemradio"
              :aria-checked="groupSortCol === opt.id"
              :tabindex="focusedIdx === i + 1 ? 0 : -1"
              @click="navItems[i + 1].activate()"
            >{{ opt.label }}</button>
            <RadioBar
              size="s"
              :options="navItems[i + 1]?.dirOptions ?? DIR_OPTIONS_TEXT"
              :model-value="navItems[i + 1]?.getDir() ?? 'asc'"
              :aria-label="`${opt.label} sort direction`"
              @update:model-value="(d) => navItems[i + 1]?.applyDir(d as 'asc' | 'desc')"
            />
          </div>
        </div>

        <!-- Vertical divider between sections -->
        <div v-if="isGrouped" class="sp-col-divider" aria-hidden="true" />

        <!-- Asset column sort -->
        <div :class="isGrouped ? 'sp-col' : ''" role="group" :aria-label="isGrouped ? 'Assets' : undefined">
          <div v-if="isGrouped" class="sp-section-hd" aria-hidden="true">Assets</div>
          <div
            v-for="(col, i) in columns"
            :key="col.id"
            :ref="(el) => setRowRef(el, assetStartIdx + i)"
            class="sp-row"
            :class="{ 'sp-row--on': sortCol === col.id }"
          >
            <button
              :ref="(el) => setNameRef(el, assetStartIdx + i)"
              class="sp-name"
              :class="{ 'sp-name--on': sortCol === col.id }"
              role="menuitemradio"
              :aria-checked="sortCol === col.id"
              :tabindex="focusedIdx === assetStartIdx + i ? 0 : -1"
              @click="navItems[assetStartIdx + i].activate()"
            >{{ col.label }}</button>
            <RadioBar
              size="s"
              :options="navItems[assetStartIdx + i]?.dirOptions ?? DIR_OPTIONS_TEXT"
              :model-value="navItems[assetStartIdx + i]?.getDir() ?? 'asc'"
              :aria-label="`${col.label} sort direction`"
              @update:model-value="(d) => navItems[assetStartIdx + i]?.applyDir(d as 'asc' | 'desc')"
            />
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sp-pop {
  position: fixed;
  z-index: 300;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
  padding: var(--v9-space-xs);
  min-width: 508px;
}

.sp-pop--single {
  min-width: 254px;
  font-family: var(--v9-font);
}

.sp-section-hd {
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-dimmed);
  padding: var(--v9-space-xs) var(--v9-space-s);
}

.sp-cols {
  display: flex;
  align-items: stretch;
  margin: calc(-1 * var(--v9-space-xs));
}

.sp-col {
  flex: 1;
  min-width: 0;
  padding: var(--v9-space-xs) 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Non-grouped single column — keep the gap too */
.sp-single {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-col-divider {
  width: 1px;
  flex-shrink: 0;
  background: var(--v9-ui-border-light);
  align-self: stretch;
}

.sp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--v9-space-m);
  padding: 0 var(--v9-space-s);
  height: var(--v9-input-m);
  border-radius: var(--v9-radius-m);
}

.sp-row:hover { background: var(--v9-ui-hover); }
.sp-row--on   { background: var(--v9-ui-hover); }

/* Hide direction RadioBar; reveal on hover or keyboard focus within the row */
.sp-row :deep(.rb-wrap) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s;
}
.sp-row:hover :deep(.rb-wrap),
.sp-row:focus-within :deep(.rb-wrap),
.sp-row--on :deep(.rb-wrap) {
  opacity: 1;
  pointer-events: auto;
}

.sp-name {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-text);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--v9-radius-s);
  outline: none;
}

.sp-name:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: 1px;
}

.sp-name--on {
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-selected);
}
</style>
