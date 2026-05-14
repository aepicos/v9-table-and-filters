<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import type { AssetItem } from '../data/assets'
import { assetPath } from '../data/assets'

import RadioBar from './RadioBar.vue'
import type { RadioBarOption } from './RadioBar.vue'

const props = defineProps<{
  asset: AssetItem | null
  assets?: AssetItem[]
}>()
const emit = defineEmits<{
  close: []
  navigate: [asset: AssetItem]
}>()

const activeTab = ref('overview')
const viewMode = ref('detail')

const VIEW_OPTIONS: RadioBarOption[] = [
  {
    label: 'Detail view',
    value: 'detail',
    icon: 'M3 3h14v14H3V3zm9 0v14',
    iconOnly: true,
  },
  {
    label: 'Split view',
    value: 'split',
    icon: 'M3 3h14v14H3V3zm7 0v14',
    iconOnly: true,
  },
  {
    label: 'Wide view',
    value: 'wide',
    icon: 'M2 4h16v12H2V4zm0 0v12',
    iconOnly: true,
  },
  {
    label: 'List view',
    value: 'list',
    icon: 'M3 5h14M3 9h14M3 13h14M3 17h14',
    iconOnly: true,
  },
]

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'issues',   label: 'Issues' },
  { id: 'fixes',    label: 'Fixes' },
  { id: 'related',  label: 'Related projects' },
]

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.asset, (a) => {
  if (a) {
    activeTab.value = 'overview'
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const path = computed(() => props.asset ? assetPath(props.asset) : '')

const currentIndex = computed(() => {
  if (!props.asset || !props.assets) return -1
  return props.assets.findIndex(a => a.id === props.asset!.id)
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => props.assets ? currentIndex.value < props.assets.length - 1 : false)

function navigatePrev() {
  if (hasPrev.value) emit('navigate', props.assets![currentIndex.value - 1])
}

function navigateNext() {
  if (hasNext.value) emit('navigate', props.assets![currentIndex.value + 1])
}

const totalIssues = computed(() => {
  if (!props.asset) return 0
  const { critical, high, medium, low } = props.asset.issues
  return critical + high + medium + low
})

// Proportional severity bar widths
const sevBarTotal = computed(() => {
  if (!props.asset) return 1
  return (props.asset.issues.critical + props.asset.issues.high) || 1
})

const typeRightTitle = computed(() => {
  switch (props.asset?.type) {
    case 'Container image': return 'Container image details'
    case 'Repository':      return 'Repository details'
    case 'Package':         return 'Package details'
    case 'API':             return 'API details'
    default:                return 'Additional details'
  }
})

const typeRows = computed((): { key: string; value: string }[] => {
  const a = props.asset
  if (!a) return []
  switch (a.type) {
    case 'Container image': return [
      { key: 'Ecosystem',      value: a.ecosystem || '—' },
      { key: 'Language',       value: a.language },
      { key: 'License',        value: a.license || '—' },
      { key: 'Visibility',     value: a.visibility },
      { key: 'Activity',       value: a.activityStatus },
      { key: 'Lifecycle',      value: a.lifecycleStage },
      { key: 'Issue type',     value: a.issueType },
      { key: 'Exploitability', value: a.exploitability },
      { key: 'Fixability',     value: a.fixability },
    ]
    case 'Repository': return [
      { key: 'Language',       value: a.language },
      { key: 'Ecosystem',      value: a.ecosystem || '—' },
      { key: 'License',        value: a.license || '—' },
      { key: 'License type',   value: a.licenseType || '—' },
      { key: 'Visibility',     value: a.visibility },
      { key: 'Activity',       value: a.activityStatus },
      { key: 'Issue type',     value: a.issueType },
      { key: 'Exploitability', value: a.exploitability },
      { key: 'Fixability',     value: a.fixability },
    ]
    case 'Package': return [
      { key: 'Ecosystem',      value: a.ecosystem || '—' },
      { key: 'Language',       value: a.language },
      { key: 'License',        value: a.license || '—' },
      { key: 'License type',   value: a.licenseType || '—' },
      { key: 'Issue type',     value: a.issueType },
      { key: 'Exploitability', value: a.exploitability },
      { key: 'Fixability',     value: a.fixability },
    ]
    default: return [
      { key: 'Ecosystem',      value: a.ecosystem || '—' },
      { key: 'Language',       value: a.language },
      { key: 'Visibility',     value: a.visibility },
      { key: 'Lifecycle',      value: a.lifecycleStage },
      { key: 'Activity',       value: a.activityStatus },
      { key: 'Issue type',     value: a.issueType },
      { key: 'Exploitability', value: a.exploitability },
      { key: 'Fixability',     value: a.fixability },
    ]
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dr-bg">
      <div v-if="asset" class="dr-backdrop" aria-hidden="true" />
    </Transition>

    <Transition name="dr">
      <aside
        v-if="asset"
        class="dr-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="asset.name"
      >

        <!-- ── Header ─────────────────────────────────────────── -->
        <header class="dr-header">
          <!-- Row 1: icon + title + controls -->
          <div class="dr-header__top">
            <div class="dr-header__icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="6" width="16" height="11" rx="1.5"/>
                <path d="M6 6V4.5a4 4 0 018 0V6"/>
                <circle cx="10" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div class="dr-header__identity">
              <span class="dr-header__name">{{ asset.name }}</span>
              <span class="dr-header__path">{{ path }}</span>
            </div>
            <div class="dr-header__controls">
              <RadioBar
                :options="VIEW_OPTIONS"
                v-model="viewMode"
                size="s"
                aria-label="View mode"
              />
              <div class="dr-controls-sep" aria-hidden="true" />
              <div class="dr-ib-wrap">
                <button class="dr-ib dr-ib--s" aria-label="Close" @click="emit('close')">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M15.25 4.75L10 10m0 0L4.75 4.75M10 10l5.25 5.25M10 10l-5.25 5.25" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <div class="dr-tooltip" role="tooltip">Close</div>
              </div>
            </div>
          </div>

          <!-- Row 2: severity bar + meta -->
          <div class="dr-header__meta">
            <div class="dr-sev-bar" :aria-label="`${asset.issues.critical} critical, ${asset.issues.high} high`">
              <div
                class="dr-sev-bar__c"
                :style="{ flex: asset.issues.critical / sevBarTotal }"
              >
                <span class="dr-sev-bar__letter">C</span>
                <span>{{ asset.issues.critical }}</span>
              </div>
              <div
                class="dr-sev-bar__h"
                :style="{ flex: asset.issues.high / sevBarTotal }"
              >
                <span class="dr-sev-bar__letter">H</span>
                <span>{{ asset.issues.high }}</span>
              </div>
            </div>
            <span class="dr-header__sep">·</span>
            <span class="dr-header__meta-text">Last scan: {{ asset.lastScan }}</span>
            <span class="dr-header__sep">·</span>
            <span class="dr-header__meta-text">{{ asset.environment }}</span>
            <span class="dr-header__sep">·</span>
            <span class="dr-header__meta-text">{{ asset.team }}</span>
          </div>

          <!-- Row 3: tabs -->
          <nav class="dr-tabs" role="tablist">
            <div class="dr-tabs__left">
              <button
                v-for="tab in TABS"
                :key="tab.id"
                class="dr-tab"
                :class="{ 'dr-tab--active': activeTab === tab.id }"
                role="tab"
                :aria-selected="activeTab === tab.id"
                @click="activeTab = tab.id"
              >{{ tab.label }}</button>
            </div>
            <button class="dr-tab dr-tab--settings">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <circle cx="10" cy="10" r="2.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/>
              </svg>
              Settings
            </button>
          </nav>
        </header>

        <!-- ── Scrollable content ─────────────────────────────── -->
        <div class="dr-content">
          <div v-if="activeTab === 'overview'" class="dr-content__inner">

            <!-- Asset details section -->
            <div class="dr-section">
              <h2 class="dr-section__title">Asset details</h2>
              <div class="dr-detail-card">
                <!-- Left: General details -->
                <div class="dr-detail-col">
                  <h3 class="dr-detail-col__title">General details</h3>
                  <div class="dr-row">
                    <span class="dr-row__key">Asset ID</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val dr-row__val--mono">{{ asset.id.slice(0, 18) }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Type</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.type }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Asset class</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">
                      <span class="dr-class-badge">{{ asset.assetClass }}</span>
                    </span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Source</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.source.join(', ') }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">First seen</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.firstSeen }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Last scan</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.lastScan }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Environment</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.environment }}</span>
                  </div>
                  <div class="dr-row">
                    <span class="dr-row__key">Team</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ asset.team }}</span>
                  </div>
                  <div class="dr-row" v-if="asset.tags.length">
                    <span class="dr-row__key">Tags</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val dr-row__val--tags">
                      <span v-for="tag in asset.tags" :key="tag" class="dr-pill">{{ tag }}</span>
                    </span>
                  </div>
                </div>

                <!-- Right: type-specific details -->
                <div class="dr-detail-col dr-detail-col--right">
                  <h3 class="dr-detail-col__title">{{ typeRightTitle }}</h3>
                  <div v-for="row in typeRows" :key="row.key" class="dr-row">
                    <span class="dr-row__key">{{ row.key }}</span>
                    <span class="dr-row__dots" aria-hidden="true"></span>
                    <span class="dr-row__val">{{ row.value }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security section -->
            <div class="dr-section">
              <h2 class="dr-section__title">Security testing and coverage</h2>
              <div class="dr-scan-card">
                <div class="dr-scan-card__header">Scan engines</div>
                <div class="dr-scan-row">
                  <span class="dr-scan-row__type">{{ asset.type }}</span>
                  <span class="dr-scan-row__engine">Snyk {{ asset.type }}</span>
                  <span class="dr-scan-row__meta">
                    Last scan: {{ asset.lastScan }}
                    <span class="dr-scan-row__sep">·</span>
                    results:
                    <span class="dr-sev-inline dr-sev-inline--c">C {{ asset.issues.critical }}</span>
                    <span class="dr-sev-inline dr-sev-inline--h">H {{ asset.issues.high }}</span>
                    <span class="dr-sev-inline dr-sev-inline--m">M {{ asset.issues.medium }}</span>
                    <span class="dr-sev-inline dr-sev-inline--l">L {{ asset.issues.low }}</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          <!-- Issues tab -->
          <div v-else-if="activeTab === 'issues'" class="dr-content__inner">
            <div class="dr-section">
              <h2 class="dr-section__title">Issues ({{ totalIssues }})</h2>
              <div class="dr-placeholder-card dr-placeholder-card--tall">
                <span class="dr-placeholder-label">Issues list</span>
              </div>
            </div>
          </div>

          <!-- Fixes tab -->
          <div v-else-if="activeTab === 'fixes'" class="dr-content__inner">
            <div class="dr-section">
              <h2 class="dr-section__title">Fix recommendations</h2>
              <div class="dr-placeholder-card">
                <span class="dr-placeholder-label">Fix recommendations</span>
              </div>
            </div>
          </div>

          <!-- Related tab -->
          <div v-else-if="activeTab === 'related'" class="dr-content__inner">
            <div class="dr-section">
              <h2 class="dr-section__title">Related projects</h2>
              <div class="dr-placeholder-card">
                <span class="dr-placeholder-label">Related projects</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Footer ─────────────────────────────────────────── -->
        <footer class="dr-footer">
          <div class="dr-footer__actions">
            <button class="dr-footer-btn">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <rect x="3" y="5" width="14" height="12" rx="1.5"/>
                <path d="M7 5V4a3 3 0 016 0v1"/>
                <line x1="10" y1="9" x2="10" y2="13"/>
                <line x1="8" y1="11" x2="12" y2="11"/>
              </svg>
              Open ticket
            </button>
            <button class="dr-footer-btn">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              Retest
            </button>
            <button class="dr-footer-btn">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M10 2v12M6 10l4 4 4-4"/>
                <path d="M3 16h14"/>
              </svg>
              Export as SBOM
            </button>
            <button class="dr-footer-btn dr-footer-btn--icon" aria-label="More actions">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
              </svg>
            </button>
          </div>
          <div class="dr-footer__nav">
            <button
              class="dr-footer-btn dr-footer-btn--icon"
              aria-label="Previous asset"
              :disabled="!hasPrev"
              @click="navigatePrev"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <polyline points="10 5 10 15"/>
                <polyline points="6 9 10 5 14 9"/>
              </svg>
            </button>
            <button
              class="dr-footer-btn dr-footer-btn--icon"
              aria-label="Next asset"
              :disabled="!hasNext"
              @click="navigateNext"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <polyline points="10 5 10 15"/>
                <polyline points="6 11 10 15 14 11"/>
              </svg>
            </button>
          </div>
        </footer>

      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────── */

.dr-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.05);
  z-index: 200;
  pointer-events: none;
}

/* ── Panel ───────────────────────────────────────────────────── */

.dr-panel {
  position: fixed;
  top: 8px;
  right: 8px;
  bottom: 8px;
  width: min(960px, calc(100vw - 16px));
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 201;
  overflow: hidden;
  transform-origin: right center;
}

/* ── Header ──────────────────────────────────────────────────── */

.dr-header {
  flex-shrink: 0;
  background: var(--v9-input-bg);
  border-bottom: 1px solid var(--v9-ui-border-light);
}

/* Row 1 */
.dr-header__top {
  display: flex;
  align-items: center;
  gap: var(--v9-space-m);
  padding: var(--v9-space-m) var(--v9-space-l);
  border-bottom: 1px solid var(--v9-ui-border-light);
}

.dr-header__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--v9-radius-m);
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--v9-ui-icon);
}

.dr-header__icon svg { width: 20px; height: 20px; }

.dr-header__identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dr-header__name {
  font-family: var(--v9-font);
  font-size: 15px;
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dr-header__path {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  font-weight: var(--v9-font-weight-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Controls */
.dr-header__controls {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  flex-shrink: 0;
}

.dr-controls-sep {
  width: 1px;
  height: 16px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
}

.dr-ib-wrap {
  position: relative;
  display: inline-flex;
}

.dr-ib {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--v9-input-m);
  height: var(--v9-input-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  color: var(--v9-ui-icon);
  cursor: pointer;
  transition: background 0.1s;
}

.dr-ib svg { width: var(--v9-icon-m); height: var(--v9-icon-m); }
.dr-ib--s { width: var(--v9-input-s); height: var(--v9-input-s); }
.dr-ib--s svg { width: var(--v9-icon-s); height: var(--v9-icon-s); }
.dr-ib:hover { background: var(--v9-ui-hover); }
.dr-ib:active { box-shadow: inset 0px 4px 2px -2px rgba(28, 28, 33, 0.12); }
.dr-ib:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }

.dr-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  padding: var(--v9-space-xs) var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.10), 0px 4px 6px -2px rgba(0,0,0,0.06);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.3s;
  z-index: 100;
}

.dr-ib-wrap:hover .dr-tooltip,
.dr-ib:focus-visible ~ .dr-tooltip { opacity: 1; }

/* Row 2: meta bar */
.dr-header__meta {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  padding: var(--v9-space-s) var(--v9-space-l);
  border-bottom: 1px solid var(--v9-ui-border-light);
}

.dr-header__sep {
  color: var(--v9-ui-dimmed);
  font-size: var(--v9-font-size-m);
  flex-shrink: 0;
}

.dr-header__meta-text {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
}

/* Severity bar */
.dr-sev-bar {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  min-width: 120px;
  max-width: 200px;
}

.dr-sev-bar__c,
.dr-sev-bar__h {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 10px;
  font-family: var(--v9-font);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  min-width: 0;
}

.dr-sev-bar__c { background: #B91C1C; }
.dr-sev-bar__h { background: #C2410C; }

.dr-sev-bar__letter {
  font-weight: 700;
  opacity: 0.8;
}

/* Row 3: tabs */
.dr-tabs {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--v9-space-l);
}

.dr-tabs__left {
  display: flex;
  align-items: stretch;
}

.dr-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0 var(--v9-space-m);
  border: none;
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.1s;
}

.dr-tab:hover { color: var(--v9-ui-text); }
.dr-tab:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

.dr-tab--active {
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-strong);
}

.dr-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--v9-ui-text);
  border-radius: 2px 2px 0 0;
}

.dr-tab--settings {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  color: var(--v9-ui-dimmed);
}

.dr-tab--settings svg { width: 16px; height: 16px; }

/* ── Content ─────────────────────────────────────────────────── */

.dr-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--v9-ui-canvas);
}

.dr-content__inner {
  padding: var(--v9-space-l);
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-l);
}

/* Sections */
.dr-section__title {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
  margin: 0 0 var(--v9-space-s);
}

/* Detail card */
.dr-detail-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  overflow: hidden;
}

.dr-detail-col {
  padding: var(--v9-space-l);
}

.dr-detail-col--right {
  border-left: 1px solid var(--v9-ui-border-light);
}

.dr-detail-col__title {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
  margin: 0 0 var(--v9-space-s);
}

/* Detail rows */
.dr-row {
  display: flex;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--v9-ui-border-light);
}

.dr-row:last-child { border-bottom: none; }

.dr-row__key {
  flex-shrink: 0;
  width: 120px;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  font-weight: var(--v9-font-weight-regular);
}

.dr-row__dots {
  flex: 1;
  border-bottom: 1px dotted var(--v9-ui-border);
  margin: 0 var(--v9-space-s);
  margin-bottom: 3px;
  min-width: 8px;
}

.dr-row__val {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-regular);
  text-align: left;
  min-width: 140px;
}

.dr-row__val--mono {
  font-family: monospace;
  font-size: 12px;
  color: var(--v9-ui-dimmed);
}

.dr-row__val--tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
}

.dr-class-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #DBEAFE;
  color: #1D4ED8;
  font-size: 11px;
  font-weight: 700;
}

.dr-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 var(--v9-space-s);
  border: 1px solid var(--v9-ui-border);
  border-radius: 999px;
  font-family: var(--v9-font);
  font-size: 11px;
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
}

/* Scan card */
.dr-scan-card {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  overflow: hidden;
}

.dr-scan-card__header {
  padding: var(--v9-space-s) var(--v9-space-l);
  border-bottom: 1px solid var(--v9-ui-border-light);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
}

.dr-scan-row {
  display: flex;
  align-items: center;
  gap: var(--v9-space-l);
  padding: var(--v9-space-m) var(--v9-space-l);
}

.dr-scan-row__type {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  flex-shrink: 0;
}

.dr-scan-row__engine {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-strong);
  flex-shrink: 0;
}

.dr-scan-row__meta {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  flex: 1;
}

.dr-scan-row__sep { color: var(--v9-ui-dimmed); }

.dr-sev-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  min-width: 28px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.dr-sev-inline--c { background: #B91C1C; }
.dr-sev-inline--h { background: #C2410C; }
.dr-sev-inline--m { background: #B45309; }
.dr-sev-inline--l { background: #71717A; }

/* Placeholder cards */
.dr-placeholder-card {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  padding: var(--v9-space-l);
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dr-placeholder-card--tall { min-height: 200px; }

.dr-placeholder-label {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
}

/* ── Footer ──────────────────────────────────────────────────── */

.dr-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--v9-space-s) var(--v9-space-l);
  border-top: 1px solid var(--v9-ui-border-light);
  background: var(--v9-input-bg);
}

.dr-footer__actions,
.dr-footer__nav {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
}

.dr-footer-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xs);
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-m);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  background: var(--v9-input-bg);
  box-shadow: 0px 1px 2px rgba(28, 28, 33, 0.08);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-text);
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}

.dr-footer-btn svg { width: var(--v9-icon-s); height: var(--v9-icon-s); color: var(--v9-ui-icon); }
.dr-footer-btn:hover:not(:disabled) { background: var(--v9-ui-hover); }
.dr-footer-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }
.dr-footer-btn:disabled {
  opacity: 0.4;
  cursor: default;
  box-shadow: none;
}

.dr-footer-btn--icon {
  padding: 0;
  width: var(--v9-input-m);
  justify-content: center;
}

/* ── Transitions ─────────────────────────────────────────────── */

.dr-enter-active { animation: dr-slide-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.dr-leave-active { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.dr-leave-to { transform: translateX(calc(100% + 8px)); }

@keyframes dr-slide-in {
  0%   { transform: translateX(calc(100% + 8px)); }
  58%  { transform: translateX(0) scale(1.05, 0.97); }
  100% { transform: translateX(0) scale(1, 1); }
}

.dr-bg-enter-from,
.dr-bg-leave-to { opacity: 0; }
.dr-bg-enter-active { transition: opacity 0.3s ease; }
.dr-bg-leave-active { transition: opacity 0.25s ease; }
</style>
