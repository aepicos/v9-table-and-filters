<script setup lang="ts">
import type { FilterGroup, FilterDef } from '../data/filters'
import FilterGroupOperator from './FilterGroupOperator.vue'

const props = defineProps<{
  group: FilterGroup
  filterDefs: FilterDef[]
}>()

const emit = defineEmits<{
  toggleOperator: []
  removeCondition: [conditionId: string]
}>()

</script>

<template>
  <div class="v9-group" :aria-label="`Filter group with ${group.operator} operator`" role="group">
    <template v-for="(condition, idx) in group.conditions" :key="condition.id">
      <!-- Operator between conditions — needs position:relative so it paints above ::before -->
      <div v-if="idx > 0" class="v9-group__op">
        <FilterGroupOperator
          :value="group.operator"
          role="Inside group"
          @toggle="$emit('toggleOperator')"
        />
      </div>

      <!-- Condition chip -->
      <div class="v9-group__condition">
        <div class="v9-chip v9-chip--in-group">
          <div class="v9-chip__section v9-chip__key">
            <span>{{ condition.key }}</span>
          </div>
          <div class="v9-chip__divider" />
          <div class="v9-chip__section v9-chip__operator-static">
            <span>{{ condition.operator }}</span>
          </div>
          <div class="v9-chip__divider" />
          <div class="v9-chip__section">
            <span>{{ condition.value }}</span>
          </div>
          <div class="v9-chip__divider" />
          <button
            class="v9-chip__delete"
            :aria-label="`Remove ${condition.key} condition`"
            @click="$emit('removeCondition', condition.id)"
          >
            <svg viewBox="0 0 24 24" :width="16" :height="16" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.v9-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xs);
}

/* Group background bracket — absolutely positioned, does not affect layout */
.v9-group::before {
  content: '';
  position: absolute;
  inset: -4px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: calc(var(--v9-radius-m) + 4px);
  pointer-events: none;
}

.v9-group__condition,
.v9-group__op {
  position: relative;
  z-index: 1;
}

/* Shared chip styles used inline here */
.v9-chip {
  display: inline-flex;
  align-items: stretch;
  height: var(--v9-input-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  line-height: var(--v9-line-height-m);
}

.v9-chip__section {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-s);
  white-space: nowrap;
  color: var(--v9-input-text);
}

.v9-chip__key {
  border-left: 1px solid var(--v9-ui-border-light);
}

.v9-chip__operator-static {
  color: var(--v9-ui-dimmed);
  padding-left: var(--v9-space-xs);
  padding-right: var(--v9-space-xs);
}

.v9-chip__divider {
  width: 1px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
  align-self: stretch;
}

.v9-chip__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--v9-input-s);
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--v9-ui-icon);
  flex-shrink: 0;
  transition: background 0.1s, color 0.1s;
}
.v9-chip__delete:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-chip__delete:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; border-radius: 2px; }
</style>
