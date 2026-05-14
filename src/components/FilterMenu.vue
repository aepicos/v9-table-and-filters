<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { FILTERS, type FilterDef, type FilterPreset } from '../data/filters'

const props = defineProps<{
  // map of filterId → already-applied values, so duplicates can be disabled
  activeValues?: Record<string, string[]>
}>()

const emit = defineEmits<{
  select:      [filterId: string, value: string, operator: string]
  'select-many': [chips: { filterId: string; value: string; operator: string }[]]
  close: []
}>()

// ── AI suggestion chip type ───────────────────────────────────────────────────

interface AiChip {
  id: string
  filterId: string
  key: string
  operator: string
  value: string
}

// ── State ─────────────────────────────────────────────────────────────────────

const search         = ref('')
const selectedKey    = ref<FilterDef | null>(null)
const loadingValues  = ref(false)

// Custom number entry (for number-type filters with presets, e.g. Risk score)
const showCustom     = ref(false)
const customValue    = ref('')
const customOperator = ref('>')

const searchRef   = ref<HTMLInputElement | null>(null)
const keyItemRefs = ref<HTMLElement[]>([])
const valItemRefs = ref<HTMLElement[]>([])

// AI state
const aiLoading     = ref(false)
const aiSuggestions = ref<AiChip[]>([])
let aiTimer:         ReturnType<typeof setTimeout> | null = null
let autoSelectTimer: ReturnType<typeof setTimeout> | null = null

let hoverTimer: ReturnType<typeof setTimeout> | null = null
let loadTimer:  ReturnType<typeof setTimeout> | null = null

// ── Modes ─────────────────────────────────────────────────────────────────────

// Text/number key is selected AND has no presets/values to pick from —
// the search bar becomes value entry rather than key search
const isTextEntry = computed(() =>
  selectedKey.value !== null &&
  (selectedKey.value.type === 'text' || selectedKey.value.type === 'number') &&
  !selectedKey.value.presets?.length &&
  !selectedKey.value.values?.length
)

// In text entry mode, never filter the keys list — the user is typing a value not searching
const filteredKeys = computed(() => {
  if (isTextEntry.value) return FILTERS
  const q = search.value.trim().toLowerCase()
  if (!q) return FILTERS
  return FILTERS.filter(f => f.label.toLowerCase().includes(q))
})

// AI card: search has text, no key matches, nothing selected
const showAiFilter = computed(() =>
  search.value.trim().length > 0 &&
  filteredKeys.value.length === 0 &&
  !selectedKey.value
)

const inputPlaceholder = computed(() =>
  isTextEntry.value
    ? `Enter a value for "${selectedKey.value!.label}"…`
    : 'Search for filters or describe…'
)

// ── Watch ─────────────────────────────────────────────────────────────────────

watch(filteredKeys, (keys) => {
  keyItemRefs.value = []
  // Don't clear a text/number key — the user is typing a value, not a new search
  if (selectedKey.value &&
      !keys.find(k => k.id === selectedKey.value!.id) &&
      !isTextEntry.value) {
    selectedKey.value = null
    loadingValues.value = false
  }
  // Auto-select when exactly one key matches (simulate AI narrowing)
  if (keys.length === 1 && !selectedKey.value && !isTextEntry.value && search.value.trim()) {
    if (autoSelectTimer) clearTimeout(autoSelectTimer)
    autoSelectTimer = setTimeout(() => {
      if (filteredKeys.value.length === 1 && !selectedKey.value) selectKey(filteredKeys.value[0])
    }, 150)
  } else {
    if (autoSelectTimer) { clearTimeout(autoSelectTimer); autoSelectTimer = null }
  }
})

watch(selectedKey, () => {
  valItemRefs.value = []
  showCustom.value    = false
  customValue.value   = ''
  customOperator.value = '>'
})
watch(loadingValues, () => { valItemRefs.value = [] })

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => { nextTick(() => searchRef.value?.focus()) })

// ── Key selection ─────────────────────────────────────────────────────────────

function onKeyMouseEnter(filter: FilterDef) {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => selectKey(filter), 150)
}

function onKeyMouseLeave() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
}

function selectKey(filter: FilterDef) {
  if (selectedKey.value?.id === filter.id) return
  // Leaving text entry mode — clear the search so it doesn't interfere with key filtering
  if (isTextEntry.value) search.value = ''
  selectedKey.value = filter
  // Entering true text entry (no presets, no values) — clear so the placeholder reads cleanly
  const enteringTextEntry = (filter.type === 'text' || filter.type === 'number')
    && !filter.presets?.length && !filter.values?.length
  if (enteringTextEntry) search.value = ''
  if (loadTimer) clearTimeout(loadTimer)
  if (filter.values?.length) {
    loadingValues.value = true
    loadTimer = setTimeout(() => { loadingValues.value = false }, 300)
  } else {
    loadingValues.value = false
  }
}

// ── Value / preset selection ──────────────────────────────────────────────────

function selectValue(value: string) {
  if (!selectedKey.value) return
  emit('select', selectedKey.value.id, value, selectedKey.value.operators[0])
}

function selectPreset(preset: FilterPreset) {
  if (!selectedKey.value) return
  emit('select', selectedKey.value.id, preset.value, preset.operator)
}

const customNumeric = computed(() => {
  const n = Number(customValue.value)
  return isNaN(n) ? null : n
})

const customError = computed(() => {
  if (customValue.value === '') return null
  const n = customNumeric.value
  if (n === null) return 'Enter a number'
  if (n < 0 || n > 1000) return 'Must be 0 – 1000'
  return null
})

function applyCustom() {
  if (customError.value !== null || customValue.value === '') return
  if (!selectedKey.value) return
  emit('select', selectedKey.value.id, customValue.value, customOperator.value)
}

function applyTextValue() {
  const val = search.value.trim()
  if (!selectedKey.value || !val) return
  emit('select', selectedKey.value.id, val, selectedKey.value.operators[0])
}

// ── Ghost suggestion ──────────────────────────────────────────────────────────

/**
 * Computes the ghost-text completion suffix for the current trailing token.
 * Returns '' when there's nothing useful to suggest.
 */
const ghostSuggestion = computed((): string => {
  const text = search.value
  if (!text || isTextEntry.value) return ''

  // Extract the trailing partial token (last run of non-space characters)
  const m = text.match(/(\S+)$/)
  if (!m) return ''
  const trailing = m[1]
  if (trailing.length < 2) return ''  // skip single-char prefixes — too ambiguous

  const lc = trailing.toLowerCase()

  // Gather candidates: filter labels + active-key values only.
  // Key aliases are intentionally excluded — they are abbreviations for the AI
  // parser and would produce ghost suggestions like "lang" instead of "Language".
  const candidates: string[] = [
    ...FILTERS.map(f => f.label),
    ...(selectedKey.value?.values ?? []),
  ]

  // Pick the shortest candidate whose lowercase form starts with the trailing prefix
  let best: string | null = null
  for (const c of candidates) {
    const clc = c.toLowerCase()
    if (clc.startsWith(lc) && clc !== lc) {
      if (!best || c.length < best.length) best = c
    }
  }

  if (!best) return ''
  return best.slice(trailing.length)  // return only the unseen suffix
})

// ── Disabled values ───────────────────────────────────────────────────────────

function isValueDisabled(val: string): boolean {
  if (!selectedKey.value || !props.activeValues) return false
  return (props.activeValues[selectedKey.value.id] ?? []).includes(val)
}

// ── AI filter ────────────────────────────────────────────────────────────────

// When AI mode becomes active, start the parse cycle
watch(showAiFilter, (isAi) => {
  if (!isAi) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null }
    aiLoading.value = false
    aiSuggestions.value = []
    return
  }
  startAiParse()
})

// Restart parse when the user keeps typing while already in AI mode
watch(search, () => {
  if (!showAiFilter.value) return
  startAiParse()
})

function startAiParse() {
  if (aiTimer) clearTimeout(aiTimer)
  aiLoading.value = true
  aiSuggestions.value = []
  aiTimer = setTimeout(() => {
    aiSuggestions.value = parseAiSuggestions(search.value)
    aiLoading.value = false
  }, 600)
}

// ── AI parser ─────────────────────────────────────────────────────────────────

// Key alias → filter ID. Sorted longest-first so greedy matching prefers
// "issue severity" over "severity", "risk score" over "score", etc.
const KEY_ALIAS_TABLE: [alias: string, filterId: string][] = ([
  ['asset type',     'asset-type'],
  ['asset class',    'asset-class'],
  ['issue severity', 'issue-severity'],
  ['issue type',     'issue-type'],
  ['lifecycle stage','lifecycle-stage'],
  ['license type',   'license-type'],
  ['risk score',     'risk-score'],
  ['type',           'asset-type'],
  ['class',          'asset-class'],
  ['environment',    'environment'],
  ['env',            'environment'],
  ['team',           'team'],
  ['owner',          'team'],
  ['severity',       'issue-severity'],
  ['sev',            'issue-severity'],
  ['language',       'language'],
  ['lang',           'language'],
  ['ecosystem',      'ecosystem'],
  ['exposure',       'exposure'],
  ['fixability',     'fixability'],
  ['exploitability', 'exploitability'],
  ['license',        'license'],
  ['lifecycle',      'lifecycle-stage'],
  ['risk',           'risk-score'],
  ['score',          'risk-score'],
  ['package manager','ecosystem'],
  ['pkg manager',    'ecosystem'],
  ['registry',       'ecosystem'],
  ['tooling',        'ecosystem'],
  ['tag',            'tag'],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length)

// Short-form / abbreviated value aliases (lower-case key → canonical label)
const VALUE_ALIAS_MAP: Record<string, string> = {
  'prod':    'Production',
  'dev':     'Development',
  'stag':    'Staging',
  'staging': 'Staging',
  'crit':    'Critical',
  'repo':    'Repository',
  'sbom':    'SBOM',
}

function makeAiChip(filter: FilterDef, val: string, operator: string): AiChip {
  return {
    id:       Math.random().toString(36).slice(2, 9),
    filterId: filter.id,
    key:      filter.label,
    operator,
    value:    val,
  }
}

/**
 * Locate all key-alias positions in lowercased text.
 * Uses word-boundary checking and longest-match precedence (via occupied set).
 */
function findKeyPositions(lc: string): Array<{ filterId: string; start: number; end: number }> {
  const occupied = new Set<number>()
  const hits: Array<{ filterId: string; start: number; end: number }> = []

  for (const [alias, filterId] of KEY_ALIAS_TABLE) {
    let pos = 0
    while (pos < lc.length) {
      const idx = lc.indexOf(alias, pos)
      if (idx === -1) break
      pos = idx + 1

      const before = idx === 0                  || /\W/.test(lc[idx - 1])
      const after  = idx + alias.length >= lc.length || /\W/.test(lc[idx + alias.length])
      if (!before || !after) continue

      const span = Array.from({ length: alias.length }, (_, i) => idx + i)
      if (span.some(p => occupied.has(p))) continue   // already claimed by longer alias

      span.forEach(p => occupied.add(p))
      hits.push({ filterId, start: idx, end: idx + alias.length })
    }
  }

  return hits.sort((a, b) => a.start - b.start)
}

/** Parse the leading operator out of the text immediately after a key alias. */
function parseOp(chunk: string): { op: string; rest: string } {
  const t  = chunk.trimStart()
  const lc = t.toLowerCase()

  // Symbolic operators — two-char variants must come before one-char
  const symMatch = t.match(/^(!=|>=|<=|[><=])(.*)$/s)
  if (symMatch) {
    const SYM: Record<string, string> = {
      '!=': 'is not', '>=': '≥', '<=': '≤',
      '>': '>', '<': '<', '=': 'is',
    }
    return { op: SYM[symMatch[1]] ?? 'is', rest: symMatch[2].trimStart() }
  }

  if (lc.startsWith('is not ')) return { op: 'is not', rest: t.slice(7).trimStart() }
  if (lc.startsWith('is '))     return { op: 'is',     rest: t.slice(3).trimStart() }
  if (lc.startsWith('not '))    return { op: 'is not', rest: t.slice(4).trimStart() }

  return { op: 'is', rest: t }   // no operator — default to 'is'
}

/**
 * Split a value string on " or ", stopping at " and " (which begins a new filter).
 * e.g. "a or b and ..." → ["a", "b"]
 */
function splitOnOr(rest: string): string[] {
  const andIdx = rest.search(/\band\b/i)
  const segment = andIdx !== -1 ? rest.slice(0, andIdx) : rest
  return segment.split(/\bor\b/i).map(s => s.trim()).filter(Boolean)
}

/** Resolve a raw string to a canonical filter value, or null if no match. */
function resolveValue(raw: string, filter: FilterDef): string | null {
  const r = raw.trim()
  if (!r) return null

  if (filter.type === 'number') {
    const n = Number(r)
    return isNaN(n) ? null : r
  }
  if (filter.type === 'text') return r

  // Short-form alias (e.g. "prod" → "Production") — only if in this filter's values
  const aliased = VALUE_ALIAS_MAP[r.toLowerCase()]
  if (aliased) {
    const found = filter.values?.find(v => v.toLowerCase() === aliased.toLowerCase())
    if (found) return found
  }

  // Exact case-insensitive match
  return filter.values?.find(v => v.toLowerCase() === r.toLowerCase()) ?? null
}

/**
 * Try to match the longest value from `filter` at the start of `text`.
 * Returns the canonical value and the unconsumed remainder, or null if no match.
 */
function greedyPrefixMatch(text: string, filter: FilterDef): { val: string; remaining: string } | null {
  if (!filter.values?.length) return null
  const t = text.trimStart()
  const sorted = [...filter.values].sort((a, b) => b.length - a.length)
  for (const v of sorted) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp(`^${escaped}(?=\\s|$)`, 'i').exec(t)
    if (m) return { val: v, remaining: t.slice(m[0].length) }
  }
  return null
}

/**
 * Structured parse: split the query at key-alias boundaries and extract chips.
 * When a value segment contains stray values for other filters (e.g. "maven critical"),
 * the unmatched remainder is collected and scanned with valueOnlyScan.
 * Returns [] when no key aliases are detected (caller falls back to value scan).
 */
function tryStructuredParse(text: string): AiChip[] {
  const lc   = text.toLowerCase()
  const keys = findKeyPositions(lc)
  if (!keys.length) return []

  const chips: AiChip[] = []
  const orphans: string[] = []

  for (let i = 0; i < keys.length; i++) {
    const kp     = keys[i]
    const filter = FILTERS.find(f => f.id === kp.filterId)
    if (!filter) continue

    const chunkEnd = keys[i + 1]?.start ?? text.length
    const { op, rest } = parseOp(text.slice(kp.end, chunkEnd))

    for (const vt of splitOnOr(rest)) {
      // Try exact match first
      const exact = resolveValue(vt, filter)
      if (exact !== null) {
        chips.push(makeAiChip(filter, exact, op))
        continue
      }
      // Fall back to greedy prefix match — e.g. "maven critical" → "maven" + orphan "critical"
      const prefix = greedyPrefixMatch(vt, filter)
      if (prefix) {
        chips.push(makeAiChip(filter, prefix.val, op))
        if (prefix.remaining.trim()) orphans.push(prefix.remaining)
      }
    }
  }

  // Scan any text that wasn't claimed by a key assignment
  for (const seg of orphans) {
    chips.push(...valueOnlyScan(seg))
  }

  return chips
}

/**
 * Value-only scan: greedy leftmost-then-longest match across all known filter values.
 * Picks the earliest match in the remaining text; ties broken by value length.
 * Used when the query contains no recognisable key aliases.
 * e.g. "the bad seeds critical high" → 3 chips
 */
function valueOnlyScan(text: string): AiChip[] {
  const chips: AiChip[] = []
  let remaining = text

  while (remaining.trim()) {
    let best: { filter: FilterDef; val: string; start: number; len: number } | null = null

    for (const filter of FILTERS) {
      if (!filter.values?.length) continue
      for (const val of filter.values) {
        const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const m = new RegExp(`\\b${escaped}\\b`, 'i').exec(remaining)
        if (!m) continue
        if (
          !best ||
          m.index < best.start ||
          (m.index === best.start && val.length > best.len)
        ) {
          best = { filter, val, start: m.index, len: val.length }
        }
      }
    }

    if (!best) break
    chips.push(makeAiChip(best.filter, best.val, best.filter.operators[0]))
    remaining = remaining.slice(best.start + best.len)
  }

  return chips
}

/** Main entry point: structured parse, falling back to value-only scan. */
function parseAiSuggestions(text: string): AiChip[] {
  const structured = tryStructuredParse(text)
  return structured.length ? structured : valueOnlyScan(text)
}

function removeAiSuggestion(id: string) {
  aiSuggestions.value = aiSuggestions.value.filter(c => c.id !== id)
}

function applyAiSuggestions() {
  if (!aiSuggestions.value.length) return
  emit('select-many', aiSuggestions.value.map(c => ({
    filterId: c.filterId,
    value:    c.value,
    operator: c.operator,
  })))
}


// ── Template ref helpers ──────────────────────────────────────────────────────

function setKeyRef(el: Element | null, idx: number) {
  if (el) keyItemRefs.value[idx] = el as HTMLElement
}

function setValRef(el: Element | null, idx: number) {
  if (el) valItemRefs.value[idx] = el as HTMLElement
}

// ── Keyboard navigation ───────────────────────────────────────────────────────

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { emit('close'); return }

  const target = e.target as HTMLElement

  // ── Search input ──
  if (target === searchRef.value) {
    // Tab accepts the ghost suggestion
    if (e.key === 'Tab' && ghostSuggestion.value) {
      e.preventDefault()
      search.value = search.value + ghostSuggestion.value
      return
    }
    if (e.key === 'ArrowDown' && !isTextEntry.value) {
      e.preventDefault()
      if (keyItemRefs.value[0]) {
        keyItemRefs.value[0].focus()
        onKeyMouseEnter(filteredKeys.value[0])
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isTextEntry.value && search.value.trim())            applyTextValue()
      else if (showAiFilter.value && !aiLoading.value)         applyAiSuggestions()
    }
    return
  }

  // ── Keys column ──
  const keyIdx = keyItemRefs.value.findIndex(el => el === target)
  if (keyIdx !== -1) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = keyItemRefs.value[keyIdx + 1]
      if (next) { next.focus(); onKeyMouseEnter(filteredKeys.value[keyIdx + 1]) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (keyIdx === 0) { onKeyMouseLeave(); searchRef.value?.focus() }
      else { keyItemRefs.value[keyIdx - 1]?.focus(); onKeyMouseEnter(filteredKeys.value[keyIdx - 1]) }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (!loadingValues.value) valItemRefs.value[0]?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectKey(filteredKeys.value[keyIdx])
    }
    return
  }

  // ── Values column ──
  const valIdx = valItemRefs.value.findIndex(el => el === target)
  if (valIdx !== -1) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      valItemRefs.value[valIdx + 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (valIdx === 0) {
        const selIdx = filteredKeys.value.findIndex(f => f.id === selectedKey.value?.id)
        selIdx !== -1 ? keyItemRefs.value[selIdx]?.focus() : searchRef.value?.focus()
      } else {
        valItemRefs.value[valIdx - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const selIdx = filteredKeys.value.findIndex(f => f.id === selectedKey.value?.id)
      selIdx !== -1 ? keyItemRefs.value[selIdx]?.focus() : keyItemRefs.value[0]?.focus()
    }
  }
}
</script>

<template>
  <div
    class="v9-filter-menu"
    role="dialog"
    aria-label="Add filter"
    aria-modal="true"
    @keydown="handleKeydown"
  >
    <!-- Header: search / value-entry input -->
    <div class="v9-filter-menu__header">
      <div class="v9-search-input" role="search">
        <span class="v9-search-input__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 10L19.25 7.25L22 6L19.25 4.75L18 2L16.75 4.75L14 6L16.75 7.25L18 10ZM12.5 11.5L10 6L7.5 11.5L2 14L7.5 16.5L10 22L12.5 16.5L18 14L12.5 11.5Z" fill="url(#ai-grad-input)"/>
            <defs>
              <linearGradient id="ai-grad-input" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#145DEB"/>
                <stop offset="100%" stop-color="#9043C6"/>
              </linearGradient>
            </defs>
          </svg>
        </span>
        <!-- Ghost text + input wrapper -->
        <div class="v9-search-input__field-wrap">
          <!-- Ghost overlay: invisible typed text (for spacing) + visible completion suffix -->
          <div
            v-if="ghostSuggestion"
            class="v9-search-input__ghost"
            aria-hidden="true"
          ><span class="v9-search-input__ghost-typed">{{ search }}</span><span class="v9-search-input__ghost-suffix">{{ ghostSuggestion }}</span></div>
          <input
            ref="searchRef"
            v-model="search"
            class="v9-search-input__field"
            type="text"
            :placeholder="inputPlaceholder"
            :aria-label="isTextEntry ? `Value for ${selectedKey!.label}` : 'Search for filters'"
            autocomplete="off"
            spellcheck="false"
            role="combobox"
            :aria-expanded="filteredKeys.length > 0"
            aria-controls="v9-filter-keys"
            aria-autocomplete="list"
          />
        </div>
      </div>
    </div>

    <!-- Body: keys + values (or full-width AI area) -->
    <div class="v9-filter-menu__body">

      <!-- ══ AI mode: no key matches — full-width layout ══ -->
      <template v-if="showAiFilter">

        <!-- Spinner while AI is "thinking" -->
        <div v-if="aiLoading" class="v9-filter-menu__loading" role="status" aria-label="Analysing…">
          <div class="v9-spinner" />
        </div>

        <!-- Suggestions ready -->
        <div v-else class="v9-filter-menu__ai-area">
          <!-- Dashed suggestion container -->
          <div class="v9-filter-menu__ai-suggestion-box" aria-label="Suggested filters" role="list">

            <div
              v-for="chip in aiSuggestions"
              :key="chip.id"
              class="v9-ai-chip"
              role="listitem"
            >
              <span class="v9-ai-chip__key">{{ chip.key }}</span>
              <span class="v9-ai-chip__divider" aria-hidden="true" />
              <span class="v9-ai-chip__op">{{ chip.operator }}</span>
              <span class="v9-ai-chip__divider" aria-hidden="true" />
              <span class="v9-ai-chip__val">{{ chip.value }}</span>
              <span class="v9-ai-chip__divider" aria-hidden="true" />
              <button
                class="v9-ai-chip__delete"
                :aria-label="`Remove ${chip.key} suggestion`"
                @click="removeAiSuggestion(chip.id)"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <!-- Fallback when AI found nothing -->
            <p v-if="!aiSuggestions.length" class="v9-filter-menu__ai-no-match">
              No filters recognised — try different wording, or press Enter to search as-is
            </p>
          </div>

          <!-- Footer: Apply button -->
          <div class="v9-filter-menu__ai-footer">
            <button
              class="v9-filter-menu__ai-apply"
              :disabled="!aiSuggestions.length"
              @click="applyAiSuggestions"
            >
              Apply
              <span class="v9-filter-menu__ai-kbd" aria-hidden="true">↵</span>
            </button>
          </div>
        </div>

      </template>

      <!-- ══ Normal mode: 2-column layout ══ -->
      <template v-else>

        <!-- Keys column -->
        <div
          id="v9-filter-keys"
          class="v9-filter-menu__keys"
          role="listbox"
          aria-label="Filter keys"
          aria-orientation="vertical"
        >
          <button
            v-for="(filter, idx) in filteredKeys"
            :key="filter.id"
            :ref="(el) => setKeyRef(el as Element | null, idx)"
            class="v9-filter-menu__key-item"
            :class="{ 'v9-filter-menu__key-item--selected': selectedKey?.id === filter.id }"
            role="option"
            :aria-selected="selectedKey?.id === filter.id"
            @mouseenter="onKeyMouseEnter(filter)"
            @mouseleave="onKeyMouseLeave"
            @click="selectKey(filter)"
          >{{ filter.label }}</button>
        </div>

        <!-- Column divider -->
        <div class="v9-filter-menu__col-divider" />

        <!-- Values column -->
        <div
          class="v9-filter-menu__values"
          role="listbox"
          :aria-label="selectedKey ? `Values for ${selectedKey.label}` : 'Filter values'"
          aria-live="polite"
          :aria-busy="loadingValues"
        >

          <!-- ① Initial empty state: nothing selected, no search -->
          <div v-if="!selectedKey" class="v9-filter-menu__empty-state">
            <div class="v9-filter-menu__empty-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 2 4 6h3v15h2V6h3zM16 22l4-4h-3V3h-2v15h-3z"/>
              </svg>
            </div>
            <p class="v9-filter-menu__empty-text">Use arrow keys or mouse to select a filter, or type to search…</p>
          </div>

          <!-- ② Text / number entry mode -->
          <template v-else-if="isTextEntry">
            <!-- No value typed yet -->
            <div v-if="!search.trim()" class="v9-filter-menu__empty-state">
              <p class="v9-filter-menu__empty-text">Type a value in the search bar above</p>
            </div>
            <!-- Value typed — show apply card -->
            <div
              v-else
              :ref="(el) => setValRef(el as Element | null, 0)"
              class="v9-filter-menu__text-card"
              role="option"
              tabindex="0"
              :aria-label="`Apply value ${search.trim()}`"
              @click="applyTextValue"
              @keydown.enter.prevent="applyTextValue"
              @keydown.space.prevent="applyTextValue"
            >
              <div class="v9-filter-menu__text-card-body">
                <span class="v9-filter-menu__text-card-label">Apply</span>
                <span class="v9-filter-menu__text-card-value">"{{ search.trim() }}"</span>
              </div>
              <span class="v9-filter-menu__text-card-hint" aria-hidden="true">↵ Enter</span>
            </div>
          </template>

          <!-- ③ Loading -->
          <div v-else-if="loadingValues" class="v9-filter-menu__loading" role="status" aria-label="Loading values">
            <div class="v9-spinner" />
          </div>

          <!-- ④ Preset values (e.g. Risk score) -->
          <template v-else-if="selectedKey?.presets?.length">
            <button
              v-for="(preset, idx) in selectedKey.presets"
              :key="`${preset.operator}${preset.value}`"
              :ref="(el) => setValRef(el as Element | null, idx)"
              class="v9-filter-menu__value-item"
              role="option"
              :aria-selected="false"
              @click="selectPreset(preset)"
            >
              <span class="v9-filter-menu__preset-op">{{ preset.operator }}</span>
              {{ preset.value }}
            </button>

            <!-- Custom number entry -->
            <template v-if="!showCustom">
              <div class="v9-filter-menu__col-rule" />
              <button
                class="v9-filter-menu__value-item v9-filter-menu__value-item--custom"
                role="option"
                :aria-selected="false"
                @click="showCustom = true"
              >
                Custom
              </button>
            </template>

            <template v-else>
              <div class="v9-filter-menu__col-rule" />
              <div class="v9-filter-menu__custom-form">
                <select
                  v-model="customOperator"
                  class="v9-filter-menu__custom-op"
                  aria-label="Operator"
                >
                  <option v-for="op in selectedKey.operators" :key="op" :value="op">{{ op }}</option>
                </select>
                <input
                  v-model="customValue"
                  class="v9-filter-menu__custom-input"
                  :class="{ 'v9-filter-menu__custom-input--error': customError }"
                  type="number"
                  min="0"
                  max="1000"
                  placeholder="0 – 1000"
                  aria-label="Custom value"
                  @keydown.enter.prevent="applyCustom"
                  @keydown.escape.prevent="showCustom = false"
                />
                <button
                  class="v9-filter-menu__custom-apply"
                  :disabled="!!customError || customValue === ''"
                  @click="applyCustom"
                >Apply</button>
              </div>
              <p v-if="customError" class="v9-filter-menu__custom-error">{{ customError }}</p>
            </template>
          </template>

          <!-- ⑤ Enum values list -->
          <template v-else-if="selectedKey?.values?.length">
            <button
              v-for="(val, idx) in selectedKey.values"
              :key="val"
              :ref="(el) => setValRef(el as Element | null, idx)"
              class="v9-filter-menu__value-item"
              :class="{ 'v9-filter-menu__value-item--disabled': isValueDisabled(val) }"
              role="option"
              :aria-selected="false"
              :aria-disabled="isValueDisabled(val) || undefined"
              :disabled="isValueDisabled(val)"
              @click="selectValue(val)"
            >{{ val }}</button>
          </template>

        </div>

      </template>

    </div>
  </div>
</template>

<style scoped>
.v9-filter-menu {
  width: 496px;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: var(--v9-elevation-m);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--v9-font);
}

/* ── Header ─────────────────────────────────────────────────────────────────── */

.v9-filter-menu__header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: var(--v9-space-s) var(--v9-space-m);
  flex-shrink: 0;
  border-bottom: 1px solid var(--v9-ui-border-light);
}

.v9-search-input {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  flex: 1;
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-s) 0 var(--v9-space-m);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: var(--v9-elevation-input-inner);
}

.v9-search-input__icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: var(--v9-icon-m);
  height: var(--v9-icon-m);
}

/* Ghost text wrapper — sits in the flex row after the icon */
.v9-search-input__field-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

/* Ghost overlay: invisible typed text (pushes suffix to the right position)
   followed by the visible completion hint */
.v9-search-input__ghost {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-style: normal;
  white-space: pre;
  overflow: hidden;
}

/* Typed portion — invisible but reserves horizontal space */
.v9-search-input__ghost-typed {
  visibility: hidden;
  flex-shrink: 0;
}

/* Completion suffix — shown in placeholder colour */
.v9-search-input__ghost-suffix {
  color: var(--v9-input-placeholder);
  flex-shrink: 0;
}

.v9-search-input__field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-style: italic;
  color: var(--v9-input-text);
  min-width: 0;
  position: relative; /* sits above the ghost overlay */
}
.v9-search-input__field::placeholder { color: var(--v9-input-placeholder); }
.v9-search-input__field:not(:placeholder-shown) { font-style: normal; }

/* ── Body ───────────────────────────────────────────────────────────────────── */

.v9-filter-menu__body {
  display: flex;
  min-height: 0;
  max-height: 380px;
  flex: 1;
}

/* ── Keys column ────────────────────────────────────────────────────────────── */

.v9-filter-menu__keys {
  width: 160px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: var(--v9-space-s);
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--v9-ui-border) transparent;
}

.v9-filter-menu__key-item {
  height: var(--v9-input-m);
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.1s;
}
.v9-filter-menu__key-item:hover { background: var(--v9-ui-hover); }
.v9-filter-menu__key-item--selected {
  background: var(--v9-ui-hover);
  color: var(--v9-ui-selected);
  font-weight: var(--v9-font-weight-strong);
}
.v9-filter-menu__key-item:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -2px;
}

.v9-filter-menu__no-keys {
  padding: var(--v9-space-m) var(--v9-space-s);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
}

.v9-filter-menu__no-keys--ai {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs);
  background: linear-gradient(90deg, #145DEB, #9043C6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Column divider ─────────────────────────────────────────────────────────── */

.v9-filter-menu__col-divider {
  width: 1px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
  align-self: stretch;
}

/* ── Values column ──────────────────────────────────────────────────────────── */

.v9-filter-menu__values {
  flex: 1;
  overflow-y: auto;
  padding: var(--v9-space-s);
  display: flex;
  flex-direction: column;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--v9-ui-border) transparent;
}

.v9-filter-menu__value-item {
  height: var(--v9-input-m);
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  padding: 0 var(--v9-space-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.1s;
}
.v9-filter-menu__value-item:hover { background: var(--v9-ui-hover); }
.v9-filter-menu__value-item:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.v9-filter-menu__value-item--disabled,
.v9-filter-menu__value-item:disabled { color: var(--v9-ui-dimmed); opacity: 0.5; cursor: not-allowed; }
.v9-filter-menu__value-item--disabled:hover,
.v9-filter-menu__value-item:disabled:hover { background: none; }

/* Preset operator prefix (e.g. ">") */
.v9-filter-menu__preset-op {
  color: var(--v9-ui-dimmed);
  font-size: var(--v9-font-size-s);
  min-width: 16px;
}

/* Thin rule separating presets from custom row */
.v9-filter-menu__col-rule {
  height: 1px;
  background: var(--v9-ui-border-light);
  margin: var(--v9-space-xxs) var(--v9-space-s);
}

/* Custom option label */
.v9-filter-menu__value-item--custom {
  color: var(--v9-ui-dimmed);
}

/* Custom form row */
.v9-filter-menu__custom-form {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  padding: var(--v9-space-xs) var(--v9-space-s);
}

.v9-filter-menu__custom-op {
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-xs);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
  cursor: pointer;
  flex-shrink: 0;
}
.v9-filter-menu__custom-op:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

.v9-filter-menu__custom-input {
  flex: 1;
  min-width: 0;
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-input-text);
}
.v9-filter-menu__custom-input:focus { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; border-color: transparent; }
.v9-filter-menu__custom-input--error { border-color: #E53E3E; }
/* Hide browser number spinners */
.v9-filter-menu__custom-input::-webkit-inner-spin-button,
.v9-filter-menu__custom-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.v9-filter-menu__custom-input[type=number] { -moz-appearance: textfield; }

.v9-filter-menu__custom-apply {
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-s);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-text);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
  flex-shrink: 0;
}
.v9-filter-menu__custom-apply:hover:not(:disabled) { background: var(--v9-ui-hover); }
.v9-filter-menu__custom-apply:disabled { opacity: 0.4; cursor: not-allowed; }
.v9-filter-menu__custom-apply:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

.v9-filter-menu__custom-error {
  margin: 0;
  padding: 0 var(--v9-space-m) var(--v9-space-xs);
  font-size: var(--v9-font-size-s);
  color: #E53E3E;
}

/* ── Empty state ────────────────────────────────────────────────────────────── */

.v9-filter-menu__empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--v9-space-m);
  padding: var(--v9-space-xxl);
  text-align: center;
}

.v9-filter-menu__empty-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-l);
  color: var(--v9-ui-icon);
}

.v9-filter-menu__empty-text {
  margin: 0;
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-dimmed);
  line-height: var(--v9-line-height-m);
}

/* ── Text entry apply card ──────────────────────────────────────────────────── */

.v9-filter-menu__text-card {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  margin: var(--v9-space-s);
  padding: var(--v9-space-s) var(--v9-space-m);
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
  flex-shrink: 0;
}
.v9-filter-menu__text-card:hover { background: var(--v9-ui-hover); border-color: var(--v9-input-border); }
.v9-filter-menu__text-card:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

.v9-filter-menu__text-card-body {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  flex: 1;
  min-width: 0;
}

.v9-filter-menu__text-card-label {
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  flex-shrink: 0;
}

.v9-filter-menu__text-card-value {
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v9-filter-menu__text-card-hint {
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── AI body area ───────────────────────────────────────────────────────────── */

/* Full-width flex column that replaces the 2-column body in AI mode */
.v9-filter-menu__ai-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: var(--v9-space-s);
  gap: var(--v9-space-m);
}

/* Dashed suggestion container */
.v9-filter-menu__ai-suggestion-box {
  display: flex;
  flex-wrap: wrap;
  gap: var(--v9-space-s);
  padding: var(--v9-space-s);
  background: var(--v9-ui-canvas);
  border: 1px dashed var(--v9-ui-border);
  border-radius: 14px;
  min-height: 48px;
  align-content: flex-start;
}

/* "Nothing found" message inside the suggestion box */
.v9-filter-menu__ai-no-match {
  margin: 0;
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  line-height: var(--v9-line-height-m);
}

/* Footer row — Apply button right-aligned */
.v9-filter-menu__ai-footer {
  display: flex;
  justify-content: flex-end;
}

.v9-filter-menu__ai-apply {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xs);
  height: var(--v9-input-m);
  padding: 0 var(--v9-space-m);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  cursor: pointer;
  box-shadow: var(--v9-elevation-input);
  transition: background 0.1s;
  white-space: nowrap;
}
.v9-filter-menu__ai-apply:not(:disabled):hover { background: var(--v9-ui-hover); }
.v9-filter-menu__ai-apply:disabled { opacity: 0.4; cursor: not-allowed; }
.v9-filter-menu__ai-apply:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 1px; }

/* Keyboard shortcut badge inside the Apply button */
.v9-filter-menu__ai-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  padding: 0 var(--v9-space-xxs);
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-s);
  font-size: var(--v9-font-size-xs, 12px);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
}

/* ── AI suggestion chips ─────────────────────────────────────────────────────── */

.v9-ai-chip {
  display: inline-flex;
  align-items: stretch;
  height: var(--v9-input-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  overflow: hidden;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  flex-shrink: 0;
}

.v9-ai-chip__key,
.v9-ai-chip__val {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-s);
  color: var(--v9-input-text);
  white-space: nowrap;
}

.v9-ai-chip__op {
  display: flex;
  align-items: center;
  padding: 0 var(--v9-space-xs);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
}

.v9-ai-chip__divider {
  width: 1px;
  background: var(--v9-ui-border-light);
  flex-shrink: 0;
  align-self: stretch;
}

.v9-ai-chip__delete {
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
.v9-ai-chip__delete:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.v9-ai-chip__delete:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -1px; }

/* ── Loading ────────────────────────────────────────────────────────────────── */

.v9-filter-menu__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v9-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--v9-ui-border);
  border-top-color: var(--v9-ui-dimmed);
  border-radius: 50%;
  animation: v9-spin 0.6s linear infinite;
}

@keyframes v9-spin { to { transform: rotate(360deg); } }
</style>
