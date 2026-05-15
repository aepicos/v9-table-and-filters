<script setup lang="ts">
type MetricKey =
  | 'total_assets'
  | 'high_risk'
  | 'unmonitored'
  | 'packages'

interface Metric {
  key: MetricKey
  label: string
  value: string
  delta: string
  deltaPositive: boolean | null
}

const METRICS: Metric[] = [
  { key: 'total_assets', label: 'Total Assets',  value: '1,842', delta: '+24 this week',    deltaPositive: false },
  { key: 'high_risk',    label: 'High Risk',     value: '137',   delta: '+8 since last scan', deltaPositive: false },
  { key: 'unmonitored',  label: 'Unmonitored',   value: '58',    delta: '-12 resolved',       deltaPositive: true  },
  { key: 'packages',     label: 'Packages',      value: '4,291', delta: 'Across all repos',   deltaPositive: null  },
]
</script>

<template>
  <div
    class="flex"
    style="background: var(--v9-ui-bg); border: 1px solid var(--v9-ui-border); border-radius: var(--v9-radius-m); overflow: hidden;"
  >
    <div
      v-for="(metric, i) in METRICS"
      :key="metric.key"
      class="flex flex-col gap-3 px-5 py-4"
      style="flex: 1;"
      :style="i > 0 ? 'border-left: 1px solid var(--v9-ui-border-light);' : ''"
    >
      <div class="text-2xl font-semibold tabular-nums" style="color: var(--v9-ui-text);">{{ metric.value }}</div>
      <div>
        <div class="text-xs font-medium" style="color: var(--v9-ui-dimmed);">{{ metric.label }}</div>
        <div
          class="text-xs font-medium mt-0.5"
          :style="metric.deltaPositive === true ? 'color: #15803d;' : metric.deltaPositive === false ? 'color: #dc2626;' : `color: var(--v9-ui-dimmed);`"
        >{{ metric.delta }}</div>
      </div>
    </div>
  </div>
</template>
