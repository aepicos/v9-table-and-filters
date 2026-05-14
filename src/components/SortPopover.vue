<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import RadioBar from './RadioBar.vue'
import type { RadioBarOption } from './RadioBar.vue'

export interface SortColDef {
  id: string
  label: string
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

const DIR_OPTIONS: RadioBarOption[] = [
  { label: 'Ascending',  value: 'asc',  icon: 'M10 16V4M6 8l4-4 4 4',  iconOnly: true },
  { label: 'Descending', value: 'desc', icon: 'M10 4v12M6 12l4 4 4-4', iconOnly: true },
]

const GROUP_OPTIONS = [
  { id: 'follow', label: 'Follow asset sorting' },
  { id: 'name',      label: 'Name' },
  { id: 'riskScore', label: 'Risk score' },
]

const popRef = ref<HTMLElement | null>(null)
const popStyle = ref({ top: '0px', left: '0px' })

onMounted(async () => {
  await nextTick()
  if (props.triggerEl) {
    const r = props.triggerEl.getBoundingClientRect()
    popStyle.value = { top: `${r.bottom + 4}px`, left: `${r.left}px` }
  }
  setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
})

onUnmounted(() => document.removeEventListener('mousedown', onOutside))

function onOutside(e: MouseEvent) {
  if (
    !popRef.value?.contains(e.target as Node) &&
    !props.triggerEl?.contains(e.target as Node)
  ) emit('close')
}

function assetDir(colId: string): 'asc' | 'desc' {
  return colId === props.sortCol ? props.sortDir : 'asc'
}

function groupDir(colId: string): 'asc' | 'desc' {
  return colId === props.groupSortCol ? props.groupSortDir : 'asc'
}
</script>

<template>
  <Teleport to="body">
    <div ref="popRef" class="sp-pop" :style="popStyle" role="menu">

      <!-- Group sort section -->
      <template v-if="isGrouped">
        <div class="sp-section-hd">Groups</div>

        <!-- Follow asset sorting -->
        <div class="sp-row" :class="{ 'sp-row--on': groupSortCol === 'follow' }">
          <button
            class="sp-name"
            :class="{ 'sp-name--on': groupSortCol === 'follow' }"
            @click="emit('setGroupSort', 'follow', 'asc')"
          >Follow asset sorting</button>
        </div>

        <!-- Name + Risk score with direction -->
        <div
          v-for="opt in GROUP_OPTIONS.slice(1)"
          :key="opt.id"
          class="sp-row"
          :class="{ 'sp-row--on': groupSortCol === opt.id }"
        >
          <button
            class="sp-name"
            :class="{ 'sp-name--on': groupSortCol === opt.id }"
            @click="emit('setGroupSort', opt.id, groupDir(opt.id))"
          >{{ opt.label }}</button>
          <RadioBar
            size="s"
            :options="DIR_OPTIONS"
            :model-value="groupDir(opt.id)"
            @update:model-value="(d) => emit('setGroupSort', opt.id, d as 'asc' | 'desc')"
          />
        </div>

        <div class="sp-divider" />
        <div class="sp-section-hd">Assets</div>
      </template>

      <!-- Asset column sort -->
      <div
        v-for="col in columns"
        :key="col.id"
        class="sp-row"
        :class="{ 'sp-row--on': sortCol === col.id }"
      >
        <button
          class="sp-name"
          :class="{ 'sp-name--on': sortCol === col.id }"
          @click="emit('setSort', col.id, assetDir(col.id))"
        >{{ col.label }}</button>
        <RadioBar
          size="s"
          :options="DIR_OPTIONS"
          :model-value="assetDir(col.id)"
          @update:model-value="(d) => emit('setSort', col.id, d as 'asc' | 'desc')"
        />
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
  min-width: 260px;
  font-family: var(--v9-font);
}

.sp-section-hd {
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-dimmed);
  padding: var(--v9-space-xs) var(--v9-space-s);
}

.sp-divider {
  height: 1px;
  background: var(--v9-ui-border-light);
  margin: var(--v9-space-xs) 0;
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
}

.sp-name--on {
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-selected);
}
</style>
