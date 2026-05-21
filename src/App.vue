<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import AssetManagementPage from './components/AssetManagementPage.vue'
import SavedViewsPage from './components/SavedViewsPage.vue'
import { useSavedViews, type SavedView, type ViewState } from './data/savedViews'

const { views, pinnedViews, togglePin, saveView, getViewByNameAndPath } = useSavedViews()

const ampRef = ref<InstanceType<typeof AssetManagementPage> | null>(null)

const navItems = [
  {
    label: 'Analytics', active: false, viewBox: '0 0 20 20',
    svg: `<path d="M15.833 2.5H4.167C3.25 2.5 2.5 3.25 2.5 4.167v11.666c0 .917.75 1.667 1.667 1.667h11.666c.917 0 1.667-.75 1.667-1.667V4.167c0-.917-.75-1.667-1.667-1.667m0 13.333H4.167V4.167h11.666zm-10-7.5H7.5v5.834H5.833zm3.334-2.5h1.666v8.334H9.167zm3.333 5h1.667v3.334H12.5z"/>`,
  },
  {
    label: 'Inventory', active: true, viewBox: '0 0 20 20',
    svg: `<path d="m13.883 3.767 2.359 2.358-2.359 2.358-2.358-2.358zm-6.383.4V7.5H4.167V4.167zm8.333 8.333v3.333H12.5V12.5zm-8.333 0v3.333H4.167V12.5zm6.383-11.092L9.167 6.117l4.716 4.716L18.6 6.117zM9.167 2.5H2.5v6.667h6.667zm8.333 8.333h-6.667V17.5H17.5zm-8.333 0H2.5V17.5h6.667z"/>`,
  },
  {
    label: 'Projects', active: false, viewBox: '0 0 20 20',
    svg: `<path d="M4.165 4.167c.46 0 .834.373.834.833v10.834c0 .46.373.833.833.833h7.5a.833.833 0 1 1 0 1.667h-7.5a2.5 2.5 0 0 1-2.5-2.5V5c0-.46.373-.833.833-.833"/><path fill-rule="evenodd" d="M16.665 5.834V15a.834.834 0 0 1-.747.83l-.086.004H6.665l-.085-.004a.834.834 0 0 1-.744-.744L5.832 15V2.5c0-.46.373-.833.833-.833H12.5zM7.5 14.167h7.5V6.524h-3.19v-3.19h-4.31z" clip-rule="evenodd"/>`,
  },
  {
    label: 'Issues', active: false, viewBox: '0 0 20 20',
    svg: `<path d="M9.168 12.5h1.667v1.667H9.168zm0-6.666h1.667v5H9.168zm.825-4.167c-4.6 0-8.325 3.733-8.325 8.333s3.725 8.334 8.325 8.334c4.608 0 8.342-3.734 8.342-8.334S14.6 1.667 9.993 1.667m.008 15A6.665 6.665 0 0 1 3.335 10 6.665 6.665 0 0 1 10 3.334 6.665 6.665 0 0 1 16.668 10a6.665 6.665 0 0 1-6.667 6.667"/>`,
  },
  {
    label: 'Policies', active: false, viewBox: '0 0 20 20',
    svg: `<path d="m12.083 10.491.75 3.234L10 12.016l-2.833 1.709.75-3.225-2.5-2.159 3.3-.283L10 5.016l1.283 3.034 3.3.283zM10 2.658l5.833 2.592v3.916c0 3.767-2.483 7.242-5.833 8.275-3.35-1.033-5.833-4.508-5.833-8.275V5.25zm0-1.825L2.5 4.166v5c0 4.625 3.2 8.95 7.5 10 4.3-1.05 7.5-5.375 7.5-10v-5z"/>`,
  },
]

const bottomNavItems = [
  {
    label: 'Settings', viewBox: '0 0 24 24',
    svg: `<path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1q-.09-.03-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1q.09.03.18.03c.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64zm-1.98-1.71c.04.31.05.52.05.73s-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2"/>`,
  },
  {
    label: 'Help', viewBox: '0 0 20 20',
    svg: `<path d="M15.833 1.667H4.167c-.925 0-1.667.75-1.667 1.667V15c0 .917.742 1.667 1.667 1.667H7.5l2.5 2.5 2.5-2.5h3.333c.917 0 1.667-.75 1.667-1.667V3.334c0-.917-.75-1.667-1.667-1.667m0 13.333h-4.025l-.491.492L10 16.809l-1.325-1.325L8.192 15H4.167V3.334h11.666zm-6.666-2.5h1.666v1.667H9.167zM10 5.834c.917 0 1.667.75 1.667 1.666 0 1.667-2.5 1.459-2.5 4.167h1.666c0-1.875 2.5-2.083 2.5-4.167a3.332 3.332 0 1 0-6.667 0h1.667c0-.916.75-1.666 1.667-1.666"/>`,
  },
  {
    label: 'More', viewBox: '0 0 20 20',
    svg: `<path d="M4.999 8.333c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666.916 0 1.666-.75 1.666-1.666 0-.917-.75-1.667-1.666-1.667m10 0c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666.916 0 1.666-.75 1.666-1.666 0-.917-.75-1.667-1.666-1.667m-5 0c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666.916 0 1.666-.75 1.666-1.666 0-.917-.75-1.667-1.666-1.667"/>`,
  },
]

const moreMenuItems = [
  {
    label: 'Snyk Learn', viewBox: '0 0 20 20',
    svg: `<path d="m10 2.5-9.167 5 3.334 1.817v5L10 17.5l5.833-3.183v-5l1.667-.909v5.759h1.667V7.5zm5.683 5L10 10.6 4.317 7.5 10 4.4zm-1.516 5.825L10 15.6l-4.167-2.275v-3.1L10 12.5l4.167-2.275z"/>`,
  },
  {
    label: 'Snyk API and Web', viewBox: '0 0 20 20',
    svg: `<path d="m9.167 4.644-.126.865A4.73 4.73 0 0 0 6.446 6.99l-2.064-.866-.643 1.084L5.546 8.5a4.5 4.5 0 0 0 0 3l-1.815 1.3.642 1.083 2.082-.866a4.7 4.7 0 0 0 2.578 1.466l.134.926v2.924h-.88a.43.43 0 0 1-.428-.35l-.317-2.208a6 6 0 0 1-1.447-.825l-2.133.842a.44.44 0 0 1-.523-.183l-1.713-2.884a.403.403 0 0 1 .103-.534l1.807-1.383-.06-.808.06-.833L1.83 7.808a.403.403 0 0 1-.103-.533L3.44 4.391a.43.43 0 0 1 .523-.183l2.133.833a6.3 6.3 0 0 1 1.447-.816l.317-2.208a.43.43 0 0 1 .428-.35h.88z"/><path fill-rule="evenodd" d="M10.834 1.708c4.212.422 7.5 3.976 7.5 8.292s-3.288 7.87-7.5 8.291v-3.064c.304-.603.56-1.235.758-1.894h-.758v-1.666h1.116c.075-.55.134-1.1.134-1.667s-.059-1.125-.134-1.667h-1.116V6.667h.758a11.7 11.7 0 0 0-.758-1.895zm2.474 11.625a13 13 0 0 1-1.15 2.967 6.7 6.7 0 0 0 3.609-2.967zm.326-5c.066.55.116 1.1.116 1.667s-.05 1.117-.116 1.667h2.817A7 7 0 0 0 16.667 10a7 7 0 0 0-.216-1.667zM12.158 3.7c.5.925.884 1.925 1.15 2.967h2.459A6.7 6.7 0 0 0 12.159 3.7" clip-rule="evenodd"/><path d="M9.167 8.545a1.7 1.7 0 0 0-.378.277A1.64 1.64 0 0 0 8.287 10a1.64 1.64 0 0 0 .88 1.454v1.778a3.45 3.45 0 0 1-1.59-.875A3.29 3.29 0 0 1 6.575 10c0-.884.361-1.732 1.004-2.357.442-.43.992-.73 1.589-.876z"/>`,
  },
  {
    label: 'Snyk EVO', viewBox: '0 0 20 20',
    svg: `<path d="M6.892 12.7a.825.825 0 0 1 1.442 0l1.423 2.513c.206.364.588.589 1 .589h2.847c.64-.002 1.042.706.721 1.272a.83.83 0 0 1-.72.424l-3.807.002c-.414 0-.797-.225-1.004-.59l-1.902-3.36a.87.87 0 0 1 0-.85"/><path d="M6.135 8.639c.636 0 1.033.702.715 1.264l-1.412 2.493a1.2 1.2 0 0 0 0 1.178l1.41 2.493c.318.561-.08 1.264-.715 1.264a.82.82 0 0 1-.716-.422L3.53 13.574a1.2 1.2 0 0 1 0-1.178h.001l1.89-3.336a.82.82 0 0 1 .714-.421M16.758 9.666a.843.843 0 0 1 1.463 0c.15.263.15.585 0 .847l-1.931 3.36c-.21.365-.598.59-1.018.59h-3.858a.848.848 0 0 1 0-1.696h2.884c.42 0 .807-.225 1.018-.59z"/><path d="M13.842 2.626c.295 0 .57.162.717.423l1.9 3.352v.001c.207.364.207.813 0 1.179l-1.896 3.348a.83.83 0 0 1-.719.423c-.639 0-1.038-.705-.718-1.27l1.417-2.502a1.2 1.2 0 0 0 0-1.179l-1.42-2.505c-.32-.564.08-1.27.719-1.27M8.505 5.446c.552 0 1.026.559.757 1.285a.625.625 0 0 1-.583.411H5.484a.85.85 0 0 0-.739.435l-1.51 2.666c-.38.671-1.435.546-1.563-.374a.64.64 0 0 1 .083-.402l2.03-3.586a.85.85 0 0 1 .739-.435z"/><path d="M10.183 2.5c.414 0 .799.226 1.006.593l1.902 3.36a.86.86 0 0 1 0 .847.824.824 0 0 1-1.44 0l-1.424-2.514a1.15 1.15 0 0 0-1-.59H6.383c-.657 0-1.061-.746-.692-1.318a.84.84 0 0 1 .712-.378z"/>`,
  },
]

const secNavPages = [
  { label: 'Coverage', children: [] },
  {
    label: 'Asset Management',
    children: [
      { label: 'Repositories', active: false },
      { label: 'Container images', active: false },
      { label: 'Packages', active: false },
      { label: 'API', active: false },
      { label: 'Web applications', active: false },
    ],
  },
  { label: 'Dependencies', children: [] },
  { label: 'Components', children: [] },
]

// ── Temp view — an unpinned view that's temporarily visible in the sec-nav
// while it's selected. Disappears on deselect/state-change unless pinned first.
const tempViewId = ref<string | null>(null)

// Views shown in the sec-nav: pinned views for current page + temp view (if any)
const secNavViews = computed(() => {
  const target = selectedItem.value.toLowerCase()
  const pinned = pinnedViews.value.filter(
    v => v.path[v.path.length - 1]?.toLowerCase() === target
  )
  if (tempViewId.value) {
    const temp = views.value.find(v => v.id === tempViewId.value)
    if (temp && !temp.pinned) return [...pinned, temp]
  }
  return pinned
})

// ── Active view (selected in sec-nav) ─────────────────────────
const activeViewId = ref<string | null>(null)

// Apply a view from the sec-nav button
function applyView(view: SavedView) {
  navigateToView(view)
}

// Toggle pin and clear tempViewId if the view just became pinned
function handlePinToggle(viewId: string) {
  togglePin(viewId)
  if (viewId === tempViewId.value) {
    const v = views.value.find(v => v.id === viewId)
    // After toggle: if now pinned, it's a permanent entry — clear temp slot
    if (v?.pinned) tempViewId.value = null
  }
}

// ── View indicator (sliding background for selected view) ─────
const viewListRef = ref<HTMLElement | null>(null)
const viewButtonRefs: Record<string, HTMLElement> = {}
const viewIndicatorY = ref(0)
const viewIndicatorH = ref(36)
const viewIndicatorReady = ref(false)
const viewIndicatorAnimate = ref(false)

const viewIndicatorStyle = computed(() => ({
  top:    `${viewIndicatorY.value}px`,
  height: `${viewIndicatorH.value}px`,
  opacity: viewIndicatorReady.value && activeViewId.value ? '1' : '0',
  transition: viewIndicatorAnimate.value
    ? 'top 0.18s cubic-bezier(0.4,0,0.2,1), height 0.18s cubic-bezier(0.4,0,0.2,1), opacity 0.1s'
    : 'opacity 0.1s',
}))

function updateViewIndicator(animate: boolean) {
  if (!activeViewId.value) return
  const btn = viewButtonRefs[activeViewId.value]
  const list = viewListRef.value
  if (!btn || !list) return
  const listRect = list.getBoundingClientRect()
  const btnRect  = btn.getBoundingClientRect()
  viewIndicatorAnimate.value = animate
  viewIndicatorY.value = btnRect.top - listRect.top
  viewIndicatorH.value = btnRect.height
  viewIndicatorReady.value = true
}

// Single selection across all pages + children
const selectedItem = ref('Asset Management')
const previousPage = ref('Asset Management')
const activeViewState = ref<ViewState | null>(null)
const viewStateKey = ref(0)

function pathToSelectedItem(path: string[]): string {
  if (path.length === 0) return 'Asset Management'
  const last = path[path.length - 1].toLowerCase()
  for (const page of secNavPages) {
    if (page.label.toLowerCase() === last) return page.label
    for (const child of (page.children as any[])) {
      if (child.label.toLowerCase() === last) return child.label
    }
  }
  return 'Asset Management'
}

function navigateToView(view: SavedView) {
  changeCount.value = 0
  // Set view IDs before changing selectedItem so the selectedItem watch
  // sees them already set and doesn't clear them.
  activeViewId.value = view.id
  tempViewId.value = view.pinned ? null : view.id
  activeViewState.value = view.state ?? null
  viewStateKey.value++
  selectedItem.value = pathToSelectedItem(view.path)
}
const previousPageLabel = computed(() =>
  previousPage.value === 'Asset Management' ? 'Inventory' : previousPage.value
)
const secNavCollapsed = ref(false)

// ── Save new view dialog ───────────────────────────────────────
const saveViewDialogOpen = ref(false)
const saveViewDialogRef = ref<HTMLElement | null>(null)
const saveViewTriggerRef = ref<HTMLElement | null>(null)

// Change tracking
const changeCount = ref(0)

// Dialog form state
const snvName = ref('')
const snvSummary = ref('')
const snvScope = ref<'everyone' | 'admin' | 'only-me'>('only-me')
const snvPinned = ref(false)
const snvOverwriteTarget = ref<SavedView | null>(null)

// View name combobox
const snvNameFocused = ref(false)
const snvNameHighlighted = ref(-1)

const snvNameSuggestions = computed(() => {
  if (!snvNameFocused.value) return []
  const val = snvName.value.trim().toLowerCase()
  const current = currentPageLabel.value.toLowerCase()
  const matched = val
    ? views.value.filter(v => v.name.toLowerCase().includes(val))
    : views.value
  const thisPage = matched.filter(v => v.path.join(' / ').toLowerCase() === current)
  const others   = matched.filter(v => v.path.join(' / ').toLowerCase() !== current)
  return [...thisPage, ...others].slice(0, 8)
})

// Index after which to insert the divider (-1 = no divider)
const snvNameDividerAfter = computed(() => {
  if (!snvNameFocused.value) return -1
  const val = snvName.value.trim().toLowerCase()
  const current = currentPageLabel.value.toLowerCase()
  const matched = val
    ? views.value.filter(v => v.name.toLowerCase().includes(val))
    : views.value
  const thisPageCount = matched.filter(v => v.path.join(' / ').toLowerCase() === current).length
  const othersCount   = matched.filter(v => v.path.join(' / ').toLowerCase() !== current).length
  return (thisPageCount > 0 && othersCount > 0) ? Math.min(thisPageCount, 8) : -1
})

function selectSnvNameSuggestion(view: SavedView) {
  snvName.value = view.name
  if (view.summary) snvSummary.value = view.summary
  snvNameFocused.value = false
  snvNameHighlighted.value = -1
}

function handleSnvNameKeydown(e: KeyboardEvent) {
  const suggestions = snvNameSuggestions.value
  if (!suggestions.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    snvNameHighlighted.value = (snvNameHighlighted.value + 1) % suggestions.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    snvNameHighlighted.value = snvNameHighlighted.value <= 0 ? suggestions.length - 1 : snvNameHighlighted.value - 1
  } else if (e.key === 'Enter') {
    const idx = snvNameHighlighted.value >= 0 ? snvNameHighlighted.value : 0
    if (suggestions[idx]) { e.preventDefault(); selectSnvNameSuggestion(suggestions[idx]) }
  } else if (e.key === 'Escape') {
    snvNameFocused.value = false
    snvNameHighlighted.value = -1
  }
}

function handleSnvNameBlur() {
  // Delay so mousedown on a suggestion fires before blur hides the list
  setTimeout(() => { snvNameFocused.value = false; snvNameHighlighted.value = -1 }, 150)
}

// Toast
const toastMessage = ref<string | null>(null)
const toastType = ref<'info' | 'success' | 'warning' | 'danger'>('success')
function showToast(msg: string, type: 'info' | 'success' | 'warning' | 'danger' = 'success') {
  toastMessage.value = msg
  toastType.value = type
}

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

watch(saveViewDialogOpen, async (open) => {
  if (open) {
    await nextTick()
    // Focus the dismiss button (first focusable element)
    const first = saveViewDialogRef.value?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  } else {
    // Return focus to the trigger that opened the dialog
    saveViewTriggerRef.value?.focus()
  }
})

function handleDialogKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const dialog = saveViewDialogRef.value
  if (!dialog) return
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => !el.closest('[hidden]') && el.offsetParent !== null
  )
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

const currentPageLabel = computed(() => {
  const p = pageTitle.value
  return [...p.crumbs, p.current].filter(Boolean).join(' / ')
})

// Path array for the currently active page — used when saving views
const currentPath = computed<string[]>(() => {
  const p = pageTitle.value
  return [...p.crumbs, p.current].filter(Boolean)
})

function generateStateSummary(): string {
  const state = ampRef.value?.getCurrentState()
  if (!state) return ''
  const parts: string[] = []
  if (state.filters && (state.filters as any[]).length > 0) {
    const filterStr = (state.filters as any[]).map(f => `${f.key} ${f.operator} ${f.value}`).join(', ')
    parts.push(`Filters: ${filterStr}`)
  }
  if (state.groupBy) parts.push(`Grouped by: ${state.groupBy}`)
  if (state.sortCol) parts.push(`Sorted by: ${state.sortCol} (${state.sortDir ?? 'desc'})`)
  if (state.density === 'compact') parts.push('Density: Compact')
  return parts.join(' · ') || 'No filters or customisations applied.'
}

function openSaveViewDialog() {
  const baseView = activeViewId.value ? views.value.find(v => v.id === activeViewId.value) : null
  const fewChanges = changeCount.value <= 3
  if (baseView && fewChanges) {
    snvName.value = baseView.name
    snvSummary.value = baseView.summary
  } else {
    snvName.value = ''
    snvSummary.value = generateStateSummary()
  }
  snvScope.value = 'only-me'
  snvPinned.value = false
  snvOverwriteTarget.value = null
  saveViewDialogOpen.value = true
}

function handleSaveView() {
  const name = snvName.value.trim()
  if (!name) return
  const existing = getViewByNameAndPath(name, currentPath.value)
  // If collision with a DIFFERENT view on the same page (not the one we're currently editing)
  if (existing && existing.id !== (activeViewId.value ?? '__none__')) {
    snvOverwriteTarget.value = existing
    return
  }
  commitSave()
}

function commitSave() {
  const name = snvName.value.trim()
  const state = ampRef.value?.getCurrentState()
  // Reuse the active view's id only when explicitly overwriting it (same name, few changes)
  const activeView = activeViewId.value ? views.value.find(v => v.id === activeViewId.value) : null
  const nameUnchanged = activeView && activeView.name.trim().toLowerCase() === name.toLowerCase()
  const id = snvOverwriteTarget.value?.id
    ?? (activeView && nameUnchanged && changeCount.value <= 3 ? activeView.id : `view-${Date.now()}`)
  const existing = views.value.find(v => v.id === id)

  const savedView: SavedView = {
    id,
    name,
    page: currentPath.value[0] ?? 'Inventory',
    path: currentPath.value,
    scope: snvScope.value,
    createdBy: 'Jakob Buhl',
    createdAt: existing?.createdAt ?? new Date(),
    pinned: snvPinned.value,
    summary: snvSummary.value.trim() || generateStateSummary(),
    state: state ? {
      filters: state.filters,
      sortCol: state.sortCol,
      sortDir: state.sortDir,
      groupBy: state.groupBy,
      density: state.density,
      visibleColumns: state.visibleColumns,
    } : undefined,
  }

  saveView(savedView)
  activeViewId.value = savedView.id
  tempViewId.value = savedView.pinned ? null : savedView.id
  changeCount.value = 0
  saveViewDialogOpen.value = false
  snvOverwriteTarget.value = null
  showToast(`View "${name}" has been saved.`)
}

// Which parent section stays open — AM stays open when a child of AM is selected
const openSection = computed(() => {
  for (const page of secNavPages) {
    if (page.label === selectedItem.value) return page.label
    if (page.children.some((c: any) => c.label === selectedItem.value)) return page.label
  }
  return null
})

// ── Page title (driven by selected nav item) ──────────────────
const pageTitle = computed(() => {
  if (selectedItem.value === 'all-views') {
    return { crumbs: [] as string[], current: 'Views', sub: null as string | null }
  }
  for (const page of secNavPages) {
    if (page.label === selectedItem.value) {
      // Special case: Asset Management at top level → show sub-label
      if (page.label === 'Asset Management') {
        return { crumbs: ['Inventory'], current: 'Asset management', sub: '(all assets)' as string | null }
      }
      return { crumbs: ['Inventory'], current: page.label, sub: null as string | null }
    }
    const child = page.children.find((c: any) => c.label === selectedItem.value)
    if (child) {
      return { crumbs: ['Inventory', 'Asset management'], current: child.label, sub: null as string | null }
    }
  }
  return { crumbs: ['Inventory'], current: selectedItem.value, sub: null as string | null }
})

// ── Sliding indicator (radio-bar pattern) ─────────────────────
const pageListRef = ref<HTMLElement | null>(null)
const allButtonRefs: Record<string, HTMLElement> = {}

const indicatorY = ref(0)
const indicatorH = ref(32)
const indicatorReady = ref(false)
const indicatorAnimate = ref(false)

const indicatorStyle = computed(() => ({
  top: `${indicatorY.value}px`,
  height: `${indicatorH.value}px`,
  opacity: indicatorReady.value ? '1' : '0',
  transition: indicatorAnimate.value
    ? 'top 0.18s cubic-bezier(0.4,0,0.2,1), height 0.18s cubic-bezier(0.4,0,0.2,1)'
    : 'none',
}))

function updateIndicator(animate: boolean) {
  const btn = allButtonRefs[selectedItem.value]
  const list = pageListRef.value
  if (!btn || !list) return
  const listRect = list.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  indicatorAnimate.value = animate
  indicatorY.value = btnRect.top - listRect.top
  indicatorH.value = btnRect.height
  indicatorReady.value = true
}

watch(selectedItem, async (newVal, oldVal) => {
  if (newVal === 'all-views') previousPage.value = oldVal

  // If the user clicked a nav item (not a view), clear active/temp view state.
  // We check against all views (not just pinned) since temp views are unpinned.
  if (activeViewId.value) {
    const av = views.value.find(v => v.id === activeViewId.value)
    if (!av || pathToSelectedItem(av.path) !== newVal) {
      activeViewId.value = null
      // Also evict the temp slot — it belongs to the old page context
      if (tempViewId.value) {
        const tv = views.value.find(v => v.id === tempViewId.value)
        if (!tv || pathToSelectedItem(tv.path) !== newVal) tempViewId.value = null
      }
    }
  }

  await nextTick()
  updateIndicator(true)
  // Re-sync after children collapse so indicator lands correctly
  // for items below the collapsing AM children
  setTimeout(async () => {
    await nextTick()
    updateIndicator(false)
  }, 220)
})

watch(activeViewId, async () => {
  await nextTick()
  updateViewIndicator(true)
})

function onStateChanged() {
  changeCount.value++
  activeViewId.value = null
  // Evict the temp view if it's still unpinned (user edited it away)
  if (tempViewId.value) {
    const tv = views.value.find(v => v.id === tempViewId.value)
    if (!tv || !tv.pinned) tempViewId.value = null
  }
}

function onChildrenEnter(el: Element) {
  const e = el as HTMLElement
  e.style.height = '0'
  e.style.opacity = '0'
  e.offsetHeight // force reflow
  e.style.height = e.scrollHeight + 'px'
  e.style.opacity = '1'
}
function onChildrenAfterEnter(el: Element) {
  (el as HTMLElement).style.height = 'auto'
}
function onChildrenLeave(el: Element) {
  const e = el as HTMLElement
  e.style.height = e.scrollHeight + 'px'
  e.offsetHeight // force reflow
  e.style.height = '0'
  e.style.opacity = '0'
}

// ── Theme toggle ─────────────────────────────────────────────────

const isDark = ref(false)
const themeMenuOpen = ref(false)
const avatarRef = ref<HTMLElement | null>(null)

function setTheme(dark: boolean) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  themeMenuOpen.value = false
}

// ── Nav dropdown menus ───────────────────────────────────────────
const helpOpen = ref(false)
const moreOpen = ref(false)
const navRef   = ref<HTMLElement | null>(null)

function onOutsideClick(e: MouseEvent) {
  if (!avatarRef.value?.contains(e.target as Node)) {
    themeMenuOpen.value = false
  }
  if (!navRef.value?.contains(e.target as Node)) {
    helpOpen.value = false
    moreOpen.value = false
  }
}

onMounted(async () => {
  await nextTick()
  updateIndicator(false)
  document.addEventListener('mousedown', onOutsideClick)
})
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))

</script>

<template>
  <div class="app-shell" style="background: var(--v9-ui-bg); font-family: var(--v9-font);">

    <!-- ── Primary nav (AppNav) ───────────────────────────────── -->
    <aside ref="navRef" class="app-nav" :class="{ 'app-nav--sec-open': !secNavCollapsed && selectedItem !== 'all-views' }" aria-label="Primary navigation">

      <!-- Top: logo + main nav items -->
      <div class="app-nav__top">

        <!-- Snyk home button -->
        <button class="app-nav__home" aria-label="Home">
          <span class="app-nav__snyk">snyk</span>
          <div class="app-nav__tt" role="tooltip">Home</div>
        </button>

        <!-- Skip link (keyboard only) -->
        <a href="#main" class="app-nav__skip">Skip to main content</a>

        <!-- Main nav -->
        <nav class="app-nav__items">
          <button
            v-for="item in navItems"
            :key="item.label"
            class="app-nav__item"
            :class="{ 'app-nav__item--active': item.active && selectedItem !== 'all-views' }"
            :aria-label="item.label"
            :aria-current="item.active ? 'page' : undefined"
          >
            <div class="app-nav__icon">
              <svg :viewBox="item.viewBox" fill="currentColor" width="20" height="20" aria-hidden="true" v-html="item.svg" />
            </div>
            <span class="app-nav__label">{{ item.label }}</span>
            <div class="app-nav__tt" role="tooltip">{{ item.label }}</div>
          </button>
        </nav>
      </div>

      <!-- Bottom: settings / help / more -->
      <div class="app-nav__bottom">

        <!-- Settings -->
        <button class="app-nav__item app-nav__item--util" aria-label="Settings">
          <div class="app-nav__icon">
            <svg :viewBox="bottomNavItems[0].viewBox" fill="currentColor" width="20" height="20" aria-hidden="true" v-html="bottomNavItems[0].svg" />
          </div>
          <div class="app-nav__tt" role="tooltip">Settings</div>
        </button>

        <!-- Help + dropdown -->
        <div class="app-nav__pop-anchor">
          <button
            class="app-nav__item app-nav__item--util"
            :class="{ 'app-nav__item--active': helpOpen }"
            aria-label="Help"
            :aria-expanded="helpOpen"
            @click="helpOpen = !helpOpen; moreOpen = false"
          >
            <div class="app-nav__icon">
              <svg :viewBox="bottomNavItems[1].viewBox" fill="currentColor" width="20" height="20" aria-hidden="true" v-html="bottomNavItems[1].svg" />
            </div>
            <div v-if="!helpOpen" class="app-nav__tt" role="tooltip">Help</div>
          </button>
          <Transition name="nav-pop">
            <div v-if="helpOpen" class="app-nav__menu app-nav__menu--up">
              <div class="app-nav__mg">
                <div class="app-nav__mg-header">Help</div>
                <button class="app-nav__mg-item">Documentation</button>
                <button class="app-nav__mg-item">Product training</button>
              </div>
              <div class="app-nav__mg">
                <button class="app-nav__mg-item">Snyk Support Community</button>
                <button class="app-nav__mg-item">Snyk Vulnerability Database</button>
              </div>
              <div class="app-nav__mg">
                <button class="app-nav__mg-item">Snyk Status report</button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- More + dropdown -->
        <div class="app-nav__pop-anchor">
          <button
            class="app-nav__item app-nav__item--util"
            :class="{ 'app-nav__item--active': moreOpen }"
            aria-label="More from Snyk"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen; helpOpen = false"
          >
            <div class="app-nav__icon">
              <svg :viewBox="bottomNavItems[2].viewBox" fill="currentColor" width="20" height="20" aria-hidden="true" v-html="bottomNavItems[2].svg" />
            </div>
            <div v-if="!moreOpen" class="app-nav__tt" role="tooltip">More from Snyk</div>
          </button>
          <Transition name="nav-pop">
            <div v-if="moreOpen" class="app-nav__menu">
              <div class="app-nav__mg">
                <div class="app-nav__mg-header">More from Snyk</div>
                <button v-for="item in moreMenuItems" :key="item.label" class="app-nav__mg-item">
                  <svg :viewBox="item.viewBox" fill="currentColor" width="16" height="16" aria-hidden="true" class="app-nav__mg-icon" v-html="item.svg" />
                  {{ item.label }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </aside>

    <!-- ── Secondary nav ─────────────────────────────────────── -->
    <aside v-show="selectedItem !== 'all-views'" class="sec-nav" :class="{ 'sec-nav--collapsed': secNavCollapsed }" aria-label="Secondary navigation">

      <!-- Toggle button — hangs 12px outside the right border, centred with the Pages header -->
      <div class="sec-nav__toggle-wrap">
        <button
          class="sec-nav__toggle-btn"
          @click="secNavCollapsed = !secNavCollapsed"
          :aria-label="secNavCollapsed ? 'Show menu' : 'Hide menu'"
        >
          <!-- push_left when expanded -->
          <svg v-if="!secNavCollapsed" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path d="M3 18H16V16H3V18ZM3 13H13V11H3V13ZM3 6V8H16V6H3ZM21 15.59L17.42 12L21 8.41L19.59 7L14.59 12L19.59 17L21 15.59Z"/>
          </svg>
          <!-- push_right when collapsed -->
          <svg v-else viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path d="M21 6H8V8H21V6ZM21 11H11V13H21V11ZM21 18V16H8V18H21ZM3 8.41L6.58 12L3 15.59L4.41 17L9.41 12L4.41 7L3 8.41Z"/>
          </svg>
        </button>
        <div class="sec-nav__toggle-tt" role="tooltip">
          {{ secNavCollapsed ? 'Show menu' : 'Hide menu' }}
        </div>
      </div>

      <!-- Pages section -->
      <div v-show="!secNavCollapsed" class="sec-nav__section">
        <div class="sec-nav__section-hdr">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" width="20" height="20" class="sec-nav__section-icon" aria-hidden="true"><path d="M6.665 13.334h6.667V15H6.665zm0-3.334h6.667v1.667H6.665zm5-8.333H5c-.917 0-1.667.75-1.667 1.667v13.333c0 .917.742 1.667 1.658 1.667H15c.916 0 1.666-.75 1.666-1.667v-10zm3.334 15h-10V3.334h5.833V7.5h4.167z"/></svg>
          <span class="sec-nav__section-label">Pages</span>
        </div>

        <div class="sec-nav__page-list" ref="pageListRef">
          <!-- Sliding selected indicator (radio-bar pattern) -->
          <div class="sec-nav__page-indicator" :style="indicatorStyle" aria-hidden="true" />

          <div
            v-for="page in secNavPages"
            :key="page.label"
            class="sec-nav__page-group"
            :class="{ 'sec-nav__page-group--open': openSection === page.label }"
          >
            <button
              class="sec-nav__page"
              :class="{ 'sec-nav__page--active': selectedItem === page.label }"
              @click="selectedItem = page.label"
              :ref="(el: any) => { if (el) allButtonRefs[page.label] = el }"
            >
              <span class="sec-nav__page-label">{{ page.label }}</span>
            </button>
            <!-- Expanded children with hierarchy tree — animated -->
            <Transition
              name="sec-nav-children"
              @enter="onChildrenEnter"
              @after-enter="onChildrenAfterEnter"
              @leave="onChildrenLeave"
            >
              <div
                v-if="page.children.length && openSection === page.label"
                class="sec-nav__children"
              >
                <button
                  v-for="child in page.children"
                  :key="child.label"
                  class="sec-nav__child"
                  :class="{ 'sec-nav__child--active': selectedItem === child.label }"
                  @click="selectedItem = child.label"
                  :ref="(el: any) => { if (el) allButtonRefs[child.label] = el }"
                >
                  <span class="sec-nav__child-label">{{ child.label }}</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Views section -->
      <div v-show="!secNavCollapsed" class="sec-nav__section sec-nav__section--sep">
        <div class="sec-nav__section-hdr sec-nav__section-hdr--views">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" width="20" height="20" class="sec-nav__section-icon" aria-hidden="true"><path d="M14.168 2.5H5.835c-.917 0-1.667.75-1.667 1.667V17.5l5.833-2.5 5.834 2.5V4.167c0-.917-.75-1.667-1.667-1.667m0 12.5-4.167-1.817L5.835 15V4.167h8.333z"/></svg>
          <span class="sec-nav__section-label">Views</span>
          <!-- Save new view button -->
          <div class="sec-nav__hdr-ibtn" style="margin-left: auto;">
            <button
              ref="saveViewTriggerRef"
              class="sec-nav__hdr-ibtn-base"
              aria-label="Save new view"
              @click="openSaveViewDialog()"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>
              </svg>
            </button>
            <div class="sec-nav__hdr-tt" role="tooltip">Save new view</div>
          </div>
        </div>

        <div class="sec-nav__view-list" ref="viewListRef">
          <!-- Sliding selected-view indicator -->
          <div class="sec-nav__view-indicator" :style="viewIndicatorStyle" aria-hidden="true" />

          <div
            v-for="view in secNavViews"
            :key="view.id"
            class="sec-nav__view"
            :class="{ 'sec-nav__view--active': activeViewId === view.id }"
            :ref="(el: any) => { if (el) viewButtonRefs[view.id] = el }"
            role="button"
            tabindex="0"
            @click="applyView(view)"
            @keydown.enter.prevent="applyView(view)"
            @keydown.space.prevent="applyView(view)"
          >
            <!-- Pin toggle — outline when unpinned, filled when pinned -->
            <button
              class="sec-nav__pin-btn"
              :class="{ 'sec-nav__pin-btn--pinned': view.pinned }"
              :aria-label="view.pinned ? 'Unpin view' : 'Pin view'"
              :aria-pressed="view.pinned"
              @click.stop="handlePinToggle(view.id)"
            >
              <svg v-if="!view.pinned" fill="currentColor" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M11.668 3.333V7.5c0 .933.308 1.8.833 2.5h-5a4.12 4.12 0 0 0 .834-2.5V3.333zm2.5-1.666H5.835A.836.836 0 0 0 5 2.5c0 .458.375.833.834.833h.833V7.5c0 1.383-1.117 2.5-2.5 2.5v1.667h4.975V17.5l.833.833.834-.833v-5.833h5.025V10a2.497 2.497 0 0 1-2.5-2.5V3.333h.833a.836.836 0 0 0 .833-.833.836.836 0 0 0-.833-.833"/>
              </svg>
              <svg v-else fill="currentColor" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="m8.863 1.792-7.071 7.07a1.003 1.003 0 0 0 0 1.415 1.003 1.003 0 0 0 1.414 0l.707-.707 3.536 3.535a2.996 2.996 0 0 1 0 4.243l1.414 1.414 4.221-4.221 4.95 4.95h1.414v-1.415l-4.95-4.95 4.264-4.263-1.414-1.414a2.996 2.996 0 0 1-4.243 0L9.57 3.913l.707-.707a1.003 1.003 0 0 0 0-1.414 1.003 1.003 0 0 0-1.414 0"/>
              </svg>
            </button>
            <div class="sec-nav__view-text">
              <span class="sec-nav__view-name">{{ view.name }}</span>
            </div>
          </div>
          <button
            class="sec-nav__all-views"
            :class="{ 'sec-nav__all-views--active': selectedItem === 'all-views' }"
            @click="selectedItem = 'all-views'"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <circle cx="5" cy="10" r="1.5"/>
              <circle cx="10" cy="10" r="1.5"/>
              <circle cx="15" cy="10" r="1.5"/>
            </svg>
            <span>All views</span>
          </button>
        </div>
      </div>

    </aside>

    <!-- ── Right column ──────────────────────────────────────── -->
    <div class="app-content">
      <!-- Scope selector bar -->
      <div class="scope-bar">
        <!-- ScopeSelector -->
        <div class="scope-sel">
          <div class="scope-sel__pill-bg" aria-hidden="true" />
          <div class="scope-sel__active-bg" aria-hidden="true" />

          <!-- Tenant (selected, non-interactive) -->
          <div class="scope-sel__item scope-sel__item--active" role="status" aria-label="Tenant: Snyk">
            <span class="scope-sel__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                <path d="m7.999 3.793 3.333 3V12H9.999V8h-4v4H4.665V6.793zm0-1.793L1.332 8h2v5.333h4v-4h1.333v4h4V8h2z"/>
              </svg>
            </span>
            <span class="scope-sel__label scope-sel__label--active">Snyk</span>
          </div>

          <span class="scope-sel__sep" aria-hidden="true">/</span>

          <!-- Group -->
          <button class="scope-sel__item" aria-label="Group: All groups">
            <span class="scope-sel__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                <path d="M11.333 7.333V2H4.667v2.667H2V14h5.333v-2.667h1.334V14H14V7.333zm-6.666 5.334H3.333v-1.334h1.334zm0-2.667H3.333V8.667h1.334zm0-2.667H3.333V6h1.334zM7.333 10H6V8.667h1.333zm0-2.667H6V6h1.333zm0-2.666H6V3.333h1.333zM10 10H8.667V8.667H10zm0-2.667H8.667V6H10zm0-2.666H8.667V3.333H10zm2.667 8h-1.334v-1.334h1.334zm0-2.667h-1.334V8.667h1.334z"/>
              </svg>
            </span>
            <span class="scope-sel__label">All groups</span>
          </button>

          <span class="scope-sel__sep" aria-hidden="true">/</span>

          <!-- Organisation -->
          <button class="scope-sel__item" aria-label="Organisation: All organizations">
            <span class="scope-sel__icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                <path d="M2.667 8.667C3.4 8.667 4 8.067 4 7.333 4 6.6 3.4 6 2.667 6c-.734 0-1.334.6-1.334 1.333 0 .734.6 1.334 1.334 1.334m.753.733a4.7 4.7 0 0 0-.753-.067c-.66 0-1.287.14-1.854.387A1.34 1.34 0 0 0 0 10.953V12h3v-1.073c0-.554.153-1.074.42-1.527m9.913-.733c.734 0 1.334-.6 1.334-1.334 0-.733-.6-1.333-1.334-1.333C12.6 6 12 6.6 12 7.333c0 .734.6 1.334 1.333 1.334M16 10.953c0-.54-.32-1.02-.813-1.233a4.6 4.6 0 0 0-1.854-.387c-.26 0-.506.027-.753.067.267.453.42.973.42 1.527V12h3zM10.827 9.1c-.78-.347-1.74-.6-2.827-.6s-2.047.26-2.827.6A1.99 1.99 0 0 0 4 10.927V12h8v-1.073c0-.787-.453-1.507-1.173-1.827M5.38 10.667c.06-.154.087-.26.607-.46A5.5 5.5 0 0 1 8 9.833c.687 0 1.367.12 2.013.374.514.2.54.306.607.46zM8 5.333c.367 0 .667.3.667.667s-.3.667-.667.667A.67.67 0 0 1 7.333 6c0-.367.3-.667.667-.667M8 4c-1.107 0-2 .893-2 2s.893 2 2 2 2-.893 2-2-.893-2-2-2"/>
              </svg>
            </span>
            <span class="scope-sel__label">All organizations</span>
          </button>
        </div>
        <!-- UserNav -->
        <div class="user-nav">

          <!-- Search icon button -->
          <div class="user-nav__ibtn">
            <button class="user-nav__ibtn-base" aria-label="Search">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20" aria-hidden="true">
                <path d="M10.333 9.333h-.526l-.187-.18a4.3 4.3 0 0 0 1.047-2.82 4.333 4.333 0 1 0-4.334 4.334c1.074 0 2.06-.394 2.82-1.047l.18.187v.526l3.334 3.327.993-.993zm-4 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3"/>
              </svg>
            </button>
            <div class="user-nav__tt" role="tooltip">
              <span>Search</span>
              <kbd class="user-nav__kbd">/</kbd>
            </div>
          </div>

          <!-- Notifications icon button -->
          <div class="user-nav__ibtn">
            <button class="user-nav__ibtn-base" aria-label="Notifications">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20" aria-hidden="true">
                <path d="M8.001 14.667c.734 0 1.334-.6 1.334-1.333H6.668c0 .733.6 1.333 1.333 1.333m4-4V7.334c0-2.047-1.086-3.76-3-4.214v-.453c0-.553-.446-1-1-1-.553 0-1 .447-1 1v.453c-1.906.454-3 2.16-3 4.214v3.333L2.668 12v.667h10.667V12zm-1.333.667H5.335v-4c0-1.654 1.006-3 2.666-3s2.667 1.346 2.667 3z"/>
              </svg>
            </button>
            <div class="user-nav__tt" role="tooltip">Notifications</div>
            <div class="user-nav__badge" aria-hidden="true" />
          </div>

          <!-- AccountSelect (size s = 24px) -->
          <div class="acct-sel" ref="avatarRef">
            <!-- Dropdown chevron (hidden behind avatar at rest, peeks on hover) -->
            <div class="acct-sel__dropdown" aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"
                   stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                <path d="M3 4.5L6 7.5L9 4.5"/>
              </svg>
            </div>
            <!-- Avatar button -->
            <button
              class="acct-sel__avatar"
              :aria-expanded="themeMenuOpen"
              aria-haspopup="menu"
              aria-label="Account options"
              @click="themeMenuOpen = !themeMenuOpen"
            >
              <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%">
                <rect width="128" height="128" fill="black"/>
                <path d="M97.4824 66.3416C101.214 66.3416 104.238 69.3552 104.238 73.0732C104.24 74.4536 103.814 75.8008 103.019 76.9312C104.791 77.8624 106 79.7176 106 81.8536C106 84.9248 103.502 87.4148 100.42 87.4148C98.09 87.4148 96.0932 85.9928 95.2576 83.972L74.39 93.3764L82.3804 96.9764C83.5796 95.0992 85.6856 93.8536 88.084 93.8536C91.8148 93.8536 94.8392 96.8672 94.8392 100.585C94.8392 103.373 93.1392 105.764 90.7164 106.786C90.5364 109.696 88.1116 112 85.1468 112C82.0648 112 79.5664 109.51 79.5664 106.439C79.566 106.002 79.6172 105.567 79.7188 105.142L64 98.0592L48.2812 105.144C48.3029 105.235 48.3226 105.328 48.34 105.42C48.385 105.663 48.4139 105.912 48.4262 106.165C48.4306 106.256 48.4336 106.347 48.4336 106.439C48.4336 109.51 45.935 112 42.8532 112C39.8884 112 37.4637 109.696 37.2838 106.786C34.861 105.764 33.1608 103.373 33.1608 100.585C33.1608 96.8672 36.1851 93.8536 39.9161 93.8536C42.3144 93.8536 44.4214 95.0992 45.6195 96.9764L53.6101 93.3764L32.7423 83.972C31.9065 85.9928 29.9099 87.4148 27.5804 87.4148C24.4985 87.4148 22 84.9248 22 81.8536C22 80.0508 22.8609 78.4484 24.1955 77.4324C23.1927 76.258 22.5874 74.736 22.5874 73.0732C22.5874 69.3552 25.6117 66.3416 29.3426 66.3416C33.0736 66.3416 36.0979 69.3552 36.0979 73.0732C36.0979 74.0628 35.8842 75.002 35.4995 75.848L64 88.6932L91.5424 76.28C91.0232 75.3264 90.7272 74.2348 90.7272 73.0732C90.7272 69.3552 93.7516 66.3416 97.4824 66.3416ZM84.2656 16C91.0796 16 91.3084 46.9308 91.3148 52.5652V52.878C91.3148 65.68 79.3284 76.082 64.4516 76.2892L64 76.2928C49.0658 76.2928 36.9307 66.0188 36.689 53.2658L36.6853 52.878V52.5652C36.6918 46.9305 36.9206 16 43.7343 16C47.6775 16 52.517 20.6614 58.2544 29.9829C60.1068 29.6431 62.0292 29.4634 64 29.4634C65.9268 29.4623 67.8504 29.6365 69.7456 29.9829C75.4828 20.6614 80.3224 16 84.2656 16ZM69.3088 58.0676C67.9516 56.556 59.9192 56.6676 58.6619 58.0676C57.405 59.4684 61.3238 64 63.9852 64C66.6472 63.9996 70.6648 59.5792 69.3088 58.0676ZM53.1329 43.5122C49.2398 43.5122 46.0839 46.6571 46.0839 50.5366C46.0839 54.4161 49.2398 57.5608 53.1329 57.5608C57.0259 57.5608 60.1818 54.4161 60.1818 50.5366C60.1818 46.6571 57.0259 43.5122 53.1329 43.5122ZM74.8672 43.5122C70.974 43.5122 67.818 46.6571 67.818 50.5366C67.818 54.4161 70.974 57.5608 74.8672 57.5608C78.76 57.5608 81.916 54.4161 81.916 50.5366C81.916 46.6571 78.76 43.5122 74.8672 43.5122Z" fill="white"/>
              </svg>
            </button>
            <!-- Tooltip (suppressed when menu open) -->
            <div v-if="!themeMenuOpen" class="acct-sel__tooltip" role="tooltip">Account options</div>
            <!-- Theme menu -->
            <div
              v-if="themeMenuOpen"
              role="menu"
              class="acct-sel__menu"
            >
              <div class="acct-sel__menu-heading">Theme</div>
              <button
                v-for="opt in [{ label: '☀️  Light', dark: false }, { label: '🌙  Dark', dark: true }]"
                :key="opt.label"
                role="menuitemradio"
                :aria-checked="isDark === opt.dark"
                class="acct-sel__menu-item"
                :class="{ 'acct-sel__menu-item--active': isDark === opt.dark }"
                @click="setTheme(opt.dark)"
              >
                {{ opt.label }}
                <svg v-if="isDark === opt.dark" viewBox="0 0 16 16" fill="currentColor"
                     style="width:12px;height:12px;color:var(--v9-ui-selected);flex-shrink:0;">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Main content -->
      <main id="main" tabindex="-1" class="app-page" :class="{ 'app-page--views': selectedItem === 'all-views' }">
        <SavedViewsPage v-if="selectedItem === 'all-views'" :previous-page-label="previousPageLabel" @back="selectedItem = previousPage" @navigate-to-view="navigateToView" />
        <AssetManagementPage ref="ampRef" v-else :key="viewStateKey" :title="pageTitle" :initial-state="activeViewState ?? undefined" @state-changed="onStateChanged" />
      </main>
    </div>
  </div>

  <!-- ── Save new view dialog ─────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="saveViewDialogOpen" class="snv-overlay" @click="saveViewDialogOpen = false" />
    </Transition>
    <Transition name="dialog">
      <div
        v-if="saveViewDialogOpen"
        ref="saveViewDialogRef"
        class="snv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snv-title"
        @keydown.escape.stop="saveViewDialogOpen = false"
        @keydown.tab="handleDialogKeydown"
        @click.stop
      >
        <!-- Top bar -->
        <div class="snv-dialog__top-bar">
          <button class="snv-dialog__dismiss" aria-label="Dismiss" @click="saveViewDialogOpen = false">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="snv-dialog__content snv-dialog__content--form">
          <h2 id="snv-title" class="snv-dialog__title">Save new view</h2>
          <!-- View name -->
          <div class="snv-field">
            <label class="snv-label" for="snv-name">View name</label>
            <span class="snv-info">Make it concise and descriptive, so it is easy to find.</span>
            <div class="snv-combobox">
              <input
                id="snv-name"
                v-model="snvName"
                class="snv-input"
                type="text"
                placeholder="e.g. Critical repos — no SCA"
                autocomplete="off"
                role="combobox"
                :aria-expanded="snvNameSuggestions.length > 0"
                aria-autocomplete="list"
                aria-controls="snv-name-listbox"
                @focus="snvNameFocused = true"
                @blur="handleSnvNameBlur"
                @keydown="handleSnvNameKeydown"
                @input="snvNameHighlighted = -1"
              />
              <div
                v-if="snvNameSuggestions.length"
                id="snv-name-listbox"
                class="snv-combobox__dropdown"
                role="listbox"
              >
                <template v-for="(view, i) in snvNameSuggestions" :key="view.id">
                  <div v-if="i === snvNameDividerAfter" class="snv-combobox__divider" aria-hidden="true" />
                  <div
                    class="snv-combobox__option"
                    :class="{ 'snv-combobox__option--active': i === snvNameHighlighted }"
                    role="option"
                    :aria-selected="i === snvNameHighlighted"
                    @mousedown.prevent="selectSnvNameSuggestion(view)"
                  >
                    <span class="snv-combobox__name">{{ view.name }}</span>
                    <span class="snv-combobox__page">{{ view.path.join(' / ') }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <!-- Summary -->
          <div class="snv-field">
            <label class="snv-label" for="snv-summary">View summary</label>
            <span class="snv-info">Describe the use and purpose of the view.</span>
            <textarea
              id="snv-summary"
              v-model="snvSummary"
              class="snv-input snv-input--textarea"
              rows="3"
              placeholder="Describe the use and purpose of this view."
            />
          </div>
          <!-- Page (disabled) -->
          <div class="snv-field">
            <label class="snv-label" for="snv-page">Page</label>
            <input
              id="snv-page"
              class="snv-input snv-input--disabled"
              type="text"
              :value="currentPageLabel"
              disabled
            />
          </div>
          <!-- Scope -->
          <div class="snv-field">
            <label class="snv-label" for="snv-scope">Scope</label>
            <div class="snv-select-wrap">
              <select id="snv-scope" v-model="snvScope" class="snv-select">
                <option value="only-me">Only me</option>
                <option value="everyone">Everyone</option>
                <option value="admin">Admin</option>
              </select>
              <svg class="snv-select-chevron" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
          <!-- Pin checkbox -->
          <label class="snv-checkbox-row">
            <span class="snv-checkbox-box" :class="{ 'snv-checkbox-box--checked': snvPinned }" aria-hidden="true">
              <svg v-if="snvPinned" viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
              </svg>
            </span>
            <input type="checkbox" v-model="snvPinned" class="snv-checkbox-input" />
            <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" class="snv-pin-icon">
              <path d="M11.668 3.333V7.5c0 .933.308 1.8.833 2.5h-5a4.12 4.12 0 0 0 .834-2.5V3.333zm2.5-1.666H5.835A.836.836 0 0 0 5 2.5c0 .458.375.833.834.833h.833V7.5c0 1.383-1.117 2.5-2.5 2.5v1.667h4.975V17.5l.833.833.834-.833v-5.833h5.025V10a2.497 2.497 0 0 1-2.5-2.5V3.333h.833a.836.836 0 0 0 .833-.833.836.836 0 0 0-.833-.833"/>
            </svg>
            <span class="snv-checkbox-label">Pin view</span>
          </label>
        </div>

        <div class="snv-dialog__footer">
          <div class="snv-dialog__footer-right">
            <button class="snv-dialog__btn snv-dialog__btn--secondary" @click="saveViewDialogOpen = false">Cancel</button>
            <button class="snv-dialog__btn snv-dialog__btn--primary" :disabled="!snvName.trim()" @click="handleSaveView">Save view</button>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="snv-toast" :class="`snv-toast--${toastType}`" role="status" aria-live="polite">
        <!-- Left status border -->
        <div class="snv-toast__border" aria-hidden="true" />
        <!-- Message -->
        <p class="snv-toast__msg">{{ toastMessage }}</p>
        <!-- Dismiss button -->
        <button class="snv-toast__dismiss" aria-label="Dismiss notification" @click="toastMessage = null">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ── Overwrite confirm alert ──────────────────────────────── -->
    <Transition name="overlay">
      <div v-if="snvOverwriteTarget" class="snv-alert-overlay" @click="snvOverwriteTarget = null" />
    </Transition>
    <Transition name="dialog">
      <div
        v-if="snvOverwriteTarget"
        class="snv-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="snv-alert-title"
        aria-describedby="snv-alert-desc"
        @keydown.escape.stop="snvOverwriteTarget = null"
        @click.stop
      >
        <!-- Icon box -->
        <div class="snv-alert__icon-box">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clip-rule="evenodd"/>
          </svg>
        </div>
        <h2 id="snv-alert-title" class="snv-alert__title">View already exists</h2>
        <p id="snv-alert-desc" class="snv-alert__desc">
          A view named <strong>{{ snvOverwriteTarget?.name }}</strong> already exists.
          Do you want to overwrite it, or save as a new view with a different name?
        </p>
        <div class="snv-alert__footer">
          <button class="snv-dialog__btn snv-dialog__btn--secondary" @click="snvOverwriteTarget = null">Cancel</button>
          <button class="snv-dialog__btn snv-dialog__btn--danger" @click="commitSave">Overwrite</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── App shell ────────────────────────────────────────────────── */
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Primary nav (AppNav) ─────────────────────────────────────── */
.app-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  width: 64px;
  margin: 8px 0 8px 8px;
  padding: var(--v9-space-m); /* 12px */
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  overflow: visible; /* tooltips + menus escape */
  z-index: 10;
  transition: border-radius 0.15s ease;
}
.app-nav--sec-open {
  border-radius: var(--v9-radius-m) 0 0 var(--v9-radius-m);
}

.app-nav__top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--v9-space-xl); /* 24px */
  width: 100%;
}

/* ── Snyk home button ─────────────────────────────────────────── */
.app-nav__home {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s;
}
.app-nav__home:hover { background: var(--v9-ui-hover); }
.app-nav__home:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

.app-nav__snyk {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--v9-ui-dimmed);
  font-family: var(--v9-font);
}

/* ── Skip link ────────────────────────────────────────────────── */
.app-nav__skip {
  /* Visually hidden but in DOM flow — takes no space, can receive focus */
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  text-decoration: none;
}
.app-nav__skip:focus-visible {
  /* Absolutely positioned so it doesn't shift nav layout */
  position: absolute;
  /* below home button: nav padding-top (12px) + home button (40px) + 4px gap */
  top: 56px;
  left: 0;
  display: flex;
  align-items: center;
  width: max-content;
  height: 32px;
  clip: auto;
  clip-path: none;
  margin: 0;
  padding: var(--v9-space-xs) var(--v9-space-m);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  color: var(--v9-input-text);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  white-space: nowrap;
  /* Focus ring: 2px solid, 3px outward, border-radius = 6px + 3px = 9px */
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: 3px;
  z-index: 600;
}

/* ── Nav items list ───────────────────────────────────────────── */
.app-nav__items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--v9-space-s); /* 8px */
  width: 100%;
  padding: var(--v9-space-xl) 0; /* 24px top/bottom */
}

/* ── Single nav item ──────────────────────────────────────────── */
.app-nav__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px; /* adjust/m */
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--v9-font);
}
.app-nav__item--util {
  width: 40px; /* utility items have no label */
}
.app-nav__item:focus-visible { outline: none; }
.app-nav__item:focus-visible .app-nav__icon {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -2px;
}

/* ── Icon container ───────────────────────────────────────────── */
.app-nav__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid transparent;
  border-radius: var(--v9-radius-m);
  flex-shrink: 0;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s, color 0.1s;
}

.app-nav__item--active .app-nav__icon {
  background: var(--v9-input-bg);
  border-color: var(--v9-input-border);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  color: var(--v9-ui-selected);
}

.app-nav__item:not(.app-nav__item--active):hover .app-nav__icon {
  background: var(--v9-ui-hover);
  color: var(--v9-ui-text);
}

/* ── Label ────────────────────────────────────────────────────── */
.app-nav__label {
  font-size: 11px;
  line-height: 12px;
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
  text-align: center;
  white-space: nowrap;
}
.app-nav__item--active .app-nav__label {
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-selected);
}

/* ── Tooltip ──────────────────────────────────────────────────── */
.app-nav__tt {
  position: absolute;
  /* 4px right of .app-nav__icon right edge (~39px from item left) */
  left: 43px;
  /* vertically centered on the 40px icon */
  top: 20px;
  transform: translateY(-50%);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  padding: 4px var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 4px 6px -2px rgba(0,0,0,0.12), 0px 2px 4px -1px rgba(0,0,0,0.08);
  font-size: var(--v9-font-size-s);
  font-weight: var(--v9-font-weight-regular);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.25s;
  z-index: 500;
}
.app-nav__home:hover .app-nav__tt,
.app-nav__item:hover .app-nav__tt {
  opacity: 1;
}

/* ── Bottom section ───────────────────────────────────────────── */
.app-nav__bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--v9-space-s); /* 8px */
  padding-top: var(--v9-space-xl); /* 24px */
  width: 40px;
}

/* ── Popover anchors ──────────────────────────────────────────── */
.app-nav__pop-anchor {
  position: relative;
  width: 40px;
}

/* ── Dropdown menus ───────────────────────────────────────────── */
.app-nav__menu {
  position: absolute;
  left: 60px; /* right edge of panel + 8px */
  bottom: 0;
  width: 240px;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  overflow: hidden;
  z-index: 500;
}
.app-nav__menu--up {
  bottom: 0;
  top: auto;
}

.app-nav__mg {
  padding: var(--v9-space-xs);
  border-top: 1px solid var(--v9-ui-border-light);
}
.app-nav__mg:first-child { border-top: none; }

.app-nav__mg-header {
  display: flex;
  align-items: center;
  padding: var(--v9-space-xxs) var(--v9-space-xxs);
  height: 28px;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-nav__mg-item {
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  width: 100%;
  height: 32px;
  padding: var(--v9-space-xs) var(--v9-space-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-text);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s;
}
.app-nav__mg-item:hover { background: var(--v9-ui-hover); }
.app-nav__mg-item:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

.app-nav__mg-icon {
  flex-shrink: 0;
  color: var(--v9-ui-icon);
}

/* Popover transition */
.nav-pop-enter-active,
.nav-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.nav-pop-enter-from,
.nav-pop-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

/* ── Secondary nav ────────────────────────────────────────────── */
/* ── Secondary nav panel ──────────────────────────────────────── */
.sec-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 220px;
  margin: 8px 0 8px 0;
  background: var(--v9-ui-canvas);
  border-top: 1px solid var(--v9-ui-border-light);
  border-right: 1px solid var(--v9-ui-border-light);
  border-bottom: 1px solid var(--v9-ui-border-light);
  border-radius: 0 var(--v9-radius-m) var(--v9-radius-m) 0;
  overflow: visible; /* allow toggle button to hang outside right edge */
  transition: width 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.sec-nav--collapsed {
  width: 0;
  background: transparent;
  border-color: transparent;
}

/* Toggle button — hangs 12px outside the right border */
.sec-nav__toggle-wrap {
  position: absolute;
  top: 6px; /* aligned with scope selector bar */
  right: -12px;
  display: flex;
  align-items: center;
  z-index: 10;
}
.sec-nav__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 2px;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  color: var(--v9-ui-icon);
  cursor: pointer;
  flex-shrink: 0;
}
.sec-nav__toggle-btn:hover { color: var(--v9-ui-text); background: var(--v9-ui-hover); }
.sec-nav__toggle-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: 2px; }

/* Tooltip — opens to the right */
.sec-nav__toggle-tt {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  padding: var(--v9-space-xs) var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  font-size: var(--v9-font-size-m);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.25s;
  z-index: 500;
}
.sec-nav__toggle-wrap:hover .sec-nav__toggle-tt { opacity: 1; }

/* Section wrapper */
.sec-nav__section {
  display: flex;
  flex-direction: column;
  padding: var(--v9-space-m); /* 12px */
}
.sec-nav__section--sep {
  border-top: 1px solid var(--v9-ui-border-light);
}

/* Section header row */
.sec-nav__section-hdr {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xxs); /* 2px */
  height: 28px;
  padding-right: var(--v9-space-m);
  padding-block: var(--v9-space-xxs);
  flex-shrink: 0;
}
.sec-nav__section-icon {
  flex-shrink: 0;
  color: var(--v9-ui-icon);
}
.sec-nav__section-label {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);   /* 13px */
  font-weight: var(--v9-font-weight-strong); /* 600 */
  line-height: var(--v9-line-height-s); /* 16px */
  color: var(--v9-ui-text);
  white-space: nowrap;
}

/* Page list (top-level items + their expanded children) */
.sec-nav__page-list {
  position: relative;
  z-index: 0; /* establishes stacking context for the three z-layers below */
  display: flex;
  flex-direction: column;
}

/* Sliding indicator — layer 2: above spine, below button text */
.sec-nav__page-indicator {
  position: absolute;
  left: 0;
  right: 0;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  pointer-events: none;
  z-index: 2;
}

/* Group wrapper — gives ::before an anchor point that includes the parent button */
.sec-nav__page-group {
  position: relative;
}

/* Vertical spine — layer 1: below indicator card
   Starts at the top of the first child (top: 36px = AM button height: 8px + 20px lh + 8px),
   ends at the centre of the last child (bottom: 18px = half of 36px child height). */
.sec-nav__page-group--open::before {
  content: '';
  position: absolute;
  left: 15.5px;
  top: 36px;
  bottom: 18px;
  width: 1px;
  background: var(--v9-ui-border);
  pointer-events: none;
  z-index: 1;
}

/* Top-level page item */
.sec-nav__page {
  position: relative;
  z-index: 3; /* layer 3: above indicator (2) and spine (1) */
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--v9-space-s) var(--v9-space-m); /* 8px 12px */
  border: none;
  border-radius: var(--v9-radius-m);
  background: none; /* indicator handles the selected background */
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);  /* 14px */
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-dimmed);
  cursor: pointer;
  text-align: left;
  transition: color 0.1s;
}
/* Hover: only on unselected buttons */
.sec-nav__page:not(.sec-nav__page--active):hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
/* Active: stronger text colour, no background (indicator does that) */
.sec-nav__page--active { color: var(--v9-ui-text); font-weight: var(--v9-font-weight-strong); }
.sec-nav__page:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.sec-nav__page-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Hierarchy tree ─────────────────────────────────────────── */
.sec-nav__children {
  display: flex;
  flex-direction: column;
}

/* Child item */
.sec-nav__child {
  position: relative;
  z-index: 3; /* layer 3: above indicator (2) and spine (1) */
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--v9-space-s) var(--v9-space-m) var(--v9-space-s) 32px; /* pl-32 */
  border: 1px solid transparent;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-dimmed);
  cursor: pointer;
  text-align: left;
}
.sec-nav__child:not(.sec-nav__child--active):hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.sec-nav__child:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

/* Horizontal connector for every child */
.sec-nav__child::before {
  content: '';
  position: absolute;
  left: 15.5px;
  top: 50%;
  width: 12px;
  height: 1px;
  background: var(--v9-ui-border);
  pointer-events: none;
}

/* Active child: stronger text + bullet on the spine, indicator handles the card */
.sec-nav__child--active {
  color: var(--v9-ui-text);
  font-weight: var(--v9-font-weight-strong);
}
.sec-nav__child--active::before {
  display: none; /* no horizontal connector on selected child */
}
.sec-nav__child--active::after {
  content: '';
  position: absolute;
  left: 15.5px;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--v9-ui-text);
  pointer-events: none;
}

.sec-nav__child-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Children expand/collapse transition */
.sec-nav-children-enter-active,
.sec-nav-children-leave-active {
  transition: height 0.2s ease, opacity 0.15s ease;
  overflow: hidden;
}
.sec-nav-children-enter-from,
.sec-nav-children-leave-to {
  height: 0 !important;
  opacity: 0;
}

/* ── Views section ──────────────────────────────────────────── */
.sec-nav__view-list {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
}

/* Sliding selected-view indicator — same visual style as page indicator */
.sec-nav__view-indicator {
  position: absolute;
  left: 0;
  right: 0;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  pointer-events: none;
  z-index: 2;
}

.sec-nav__view {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs); /* 6px */
  width: 100%;
  padding: var(--v9-space-xs) var(--v9-space-s); /* tighter than before to fit pin btn */
  border-radius: var(--v9-radius-m);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  /* remove the old outline — focus goes to inner pin btn or the row itself */
}
.sec-nav__view:not(.sec-nav__view--active):hover { background: var(--v9-ui-hover); }
.sec-nav__view:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; border-radius: var(--v9-radius-m); }
.sec-nav__view--active .sec-nav__view-name { font-weight: var(--v9-font-weight-strong); }

/* Pin toggle button */
.sec-nav__pin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 4px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-icon);
  opacity: 0;
  transition: opacity 0.1s, background 0.1s, color 0.1s;
}
/* Show on row hover or when the view is active/unpinned */
.sec-nav__view:hover .sec-nav__pin-btn,
.sec-nav__view--active .sec-nav__pin-btn,
.sec-nav__pin-btn--pinned {
  opacity: 1;
}
.sec-nav__pin-btn:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.sec-nav__pin-btn--pinned { color: var(--v9-ui-text); }
.sec-nav__pin-btn:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; opacity: 1; }

.sec-nav__view-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.sec-nav__view-name {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);  /* 14px */
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sec-nav__view-context {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);  /* 13px */
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-s);
  color: var(--v9-ui-dimmed);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sec-nav__all-views {
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs);
  width: 100%;
  padding: 10px var(--v9-space-m);
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
  text-decoration: underline;
  cursor: pointer;
  text-align: left;
}
.sec-nav__all-views:hover { background: var(--v9-ui-hover); }
.sec-nav__all-views--active {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  font-weight: var(--v9-font-weight-strong);
}

/* ── UserNav ──────────────────────────────────────────────────── */
.user-nav {
  display: flex;
  align-items: center;
  gap: var(--v9-space-m); /* 12px */
  flex-shrink: 0;
}

/* Icon button wrapper (provides positioning context for tooltip) */
.user-nav__ibtn {
  position: relative;
  flex-shrink: 0;
}

/* Icon button */
.user-nav__ibtn-base {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 2px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s, color 0.1s;
}
.user-nav__ibtn-base:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.user-nav__ibtn-base:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

/* Tooltip — opens leftward (right: 12px of a 24px wrapper = appears to the left) */
.user-nav__tt {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--v9-space-s);
  height: 32px;
  padding: 0 var(--v9-space-s);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  font-size: var(--v9-font-size-m);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.25s;
  z-index: 500;
}
.user-nav__ibtn:hover .user-nav__tt { opacity: 1; }

/* Keyboard shortcut badge inside tooltip */
.user-nav__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  padding: 0 4px;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-xs);
  line-height: 16px;
  color: var(--v9-ui-dimmed);
  font-style: normal;
}

/* Notification badge — top-right of bell icon */
.user-nav__badge {
  position: absolute;
  top: 4px;
  right: 4px; /* = left:14px of 24px wrapper, matching Figma left:50px in UserNav */
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e53e3e;
  pointer-events: none;
}

/* ── AccountSelect (size s = 24px) ────────────────────────────── */
.acct-sel {
  position: relative;
  --acct-size: 24px;
  width: var(--acct-size);
  height: var(--acct-size);
  flex-shrink: 0;
}

/* Chevron tray — fixed, chevron at right edge, revealed when avatar slides left */
.acct-sel__dropdown {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--acct-size);
  height: var(--acct-size);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2px;
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  background: var(--v9-input-bg);
  color: var(--v9-ui-dimmed);
  transition: background 0.1s ease;
}
.acct-sel:hover .acct-sel__dropdown {
  background: var(--v9-ui-hover);
}

/* Avatar button — absolutely positioned, slides left on hover to reveal chevron */
.acct-sel__avatar {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--acct-size);
  height: var(--acct-size);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  overflow: hidden;
  background: var(--v9-ui-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: left 0.15s ease;
}
.acct-sel:hover .acct-sel__avatar {
  left: -11px;
}
.acct-sel__avatar:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: 2px;
}


.acct-sel__tooltip {
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  padding: var(--v9-space-xs) var(--v9-space-s);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  font-size: var(--v9-font-size-m);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.25s;
  z-index: 500;
}
.acct-sel:hover .acct-sel__tooltip { opacity: 1; }

/* Theme menu */
.acct-sel__menu {
  position: absolute;
  top: calc(var(--acct-size) + 6px);
  right: 0;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-ui-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
  padding: var(--v9-space-xxs);
  min-width: 140px;
  z-index: 400;
  font-family: var(--v9-font);
}
.acct-sel__menu-heading {
  padding: 4px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--v9-ui-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.acct-sel__menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  border: none;
  border-radius: var(--v9-radius-s);
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  transition: background 0.1s;
}
.acct-sel__menu-item:hover { background: var(--v9-ui-hover); }
.acct-sel__menu-item--active { background: var(--v9-ui-hover); font-weight: 600; }

/* ── ScopeSelector ────────────────────────────────────────────── */
.scope-sel {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--v9-space-xs); /* 6px */
}

/* Dark pill background, extends 2px beyond content on all sides */
.scope-sel__pill-bg {
  position: absolute;
  inset: -2px;
  background: var(--v9-ui-canvas);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: 8px;
  pointer-events: none;
}

/* Raised card behind the active (tenant) item */
.scope-sel__active-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 66px;
  height: 24px;
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 3px 2px -2px rgba(28, 28, 33, 0.2);
  pointer-events: none;
}

.scope-sel__item {
  position: relative; /* stacks above the absolute bg layers */
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 2px var(--v9-space-s); /* 2px 8px */
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  overflow: hidden;
  font-family: var(--v9-font);
  white-space: nowrap;
}
.scope-sel__item--active { cursor: default; }
.scope-sel__item:not(.scope-sel__item--active):hover { background: var(--v9-ui-hover); }
.scope-sel__item:not(.scope-sel__item--active):focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -2px;
}

/* 16px-wide icon wrapper — clips left 4px of the 20px icon */
.scope-sel__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 16px;
  height: 20px;
  overflow: hidden;
  flex-shrink: 0;
  color: var(--v9-ui-icon);
}
.scope-sel__item--active .scope-sel__icon-wrap { color: var(--v9-ui-selected); }

.scope-sel__label {
  font-size: var(--v9-font-size-m);
  line-height: 20px;
  font-weight: var(--v9-font-weight-regular);
  color: var(--v9-ui-dimmed);
}
.scope-sel__label--active {
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-selected);
}

.scope-sel__sep {
  font-size: var(--v9-font-size-m);
  line-height: 20px;
  color: var(--v9-ui-border);
  flex-shrink: 0;
  position: relative; /* above bg layers */
}

/* ── Right column ─────────────────────────────────────────────── */
.app-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.scope-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--v9-space-l);
  height: 56px;
  flex-shrink: 0;
  background: var(--v9-ui-bg);
  border-bottom: 1px solid var(--v9-ui-border);
}

.app-page {
  flex: 1;
  min-width: 0;
}
.app-page--views {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Section header icon button (Views "Save new view") ───────── */
.sec-nav__section-hdr--views {
  padding-right: 0;
  margin-right: -4px;
}

.sec-nav__hdr-ibtn {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sec-nav__hdr-ibtn-base {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: var(--v9-space-xs); /* 6px */
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s, color 0.1s;
}
.sec-nav__hdr-ibtn-base:hover {
  background: var(--v9-ui-hover);
  color: var(--v9-ui-text);
}
.sec-nav__hdr-ibtn-base:focus-visible {
  outline: 2px solid var(--v9-ui-focus);
  outline-offset: -2px;
}

/* Tooltip — opens below the button */
.sec-nav__hdr-tt {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  height: 28px;
  padding: 0 var(--v9-space-s);
  display: flex;
  align-items: center;
  background: var(--v9-tooltip-bg);
  color: var(--v9-tooltip-text);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.06);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease 0.3s;
  z-index: 500;
}
.sec-nav__hdr-ibtn:hover .sec-nav__hdr-tt { opacity: 1; }

/* ── Overlay ──────────────────────────────────────────────────── */
.snv-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  backdrop-filter: blur(3px);
  cursor: default;
  /* Baseline dark tint so it dims correctly in light mode too */
  background: rgba(0, 0, 0, 0.25);
}
.snv-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--v9-ui-bg);
  opacity: 0.35;
}
.snv-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--v9-ui-text);
  opacity: 0.08;
}

/* Overlay transition */
.overlay-enter-active,
.overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from,
.overlay-leave-to { opacity: 0; }

/* ── Dialog panel ─────────────────────────────────────────────── */
.snv-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 201;
  width: 512px;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-l);
  box-shadow: 0px 20px 12.5px rgba(0,0,0,0.10), 0px 10px 5px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}

/* Dialog transition — lifts up and fades in */
.dialog-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dialog-enter-from {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 12px)) scale(0.96);
}
.dialog-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 8px)) scale(0.97);
}

.snv-dialog__top-bar {
  display: flex;
  justify-content: flex-end;
  padding: var(--v9-space-m);
}

.snv-dialog__dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--v9-radius-m);
  background: none;
  cursor: pointer;
  color: var(--v9-ui-dimmed);
  transition: background 0.1s, color 0.1s;
}
.snv-dialog__dismiss:hover { background: var(--v9-ui-hover); color: var(--v9-ui-text); }
.snv-dialog__dismiss:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

.snv-dialog__content {
  display: flex;
  flex-direction: column;
  gap: var(--v9-space-m);
  padding: 0 var(--v9-space-xxl) var(--v9-space-xxl) var(--v9-space-xxl);
}

.snv-dialog__title {
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-xl);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-l);
  color: var(--v9-ui-text);
}

.snv-dialog__description {
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
}

.snv-dialog__footer {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--v9-ui-border-light);
  padding: var(--v9-space-m) var(--v9-space-xxl);
}

.snv-dialog__footer-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--v9-space-m);
}

.snv-dialog__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--v9-space-xs);
  height: 32px;
  padding: 0 var(--v9-space-m);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s, color 0.1s;
  box-shadow: 0px 1px 2px rgba(0,0,0,0.06);
}
.snv-dialog__btn--secondary {
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  color: var(--v9-ui-text);
}
.snv-dialog__btn--secondary:hover { background: var(--v9-ui-hover); }
.snv-dialog__btn--secondary:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.snv-dialog__btn--primary {
  background: var(--v9-input-primary-bg);
  border: 1px solid var(--v9-input-primary-bg);
  color: var(--v9-input-primary-text);
}
.snv-dialog__btn--primary:hover { filter: brightness(1.1); }
.snv-dialog__btn--primary:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }

/* ── Dialog form ──────────────────────────────────────────────── */
.snv-dialog__content--form {
  padding-top: var(--v9-space-xl);
}
.snv-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.snv-label {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-strong);
  color: var(--v9-ui-text);
  line-height: var(--v9-line-height-m);
}
.snv-info {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  line-height: var(--v9-line-height-s);
}
.snv-input {
  height: 32px;
  padding: 0 var(--v9-space-s);
  background: var(--v9-input-bg);
  border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  outline: none;
  transition: border-color 0.1s, box-shadow 0.1s;
  width: 100%;
  box-sizing: border-box;
}
.snv-input:focus { border-color: var(--v9-ui-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--v9-ui-focus) 20%, transparent); }
.snv-input--textarea { height: auto; padding: var(--v9-space-xs) var(--v9-space-s); resize: vertical; line-height: var(--v9-line-height-m); }
.snv-input--disabled { background: var(--v9-ui-canvas); color: var(--v9-ui-dimmed); cursor: not-allowed; }


/* View name combobox dropdown */
.snv-combobox { position: relative; }
.snv-combobox__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 224px; /* 7 rows × 32px */
  overflow-y: auto;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.10), 0px 4px 6px -2px rgba(0,0,0,0.06);
}
.snv-combobox__option {
  display: flex;
  align-items: center;
  gap: var(--v9-space-m);
  padding: 0 var(--v9-space-s);
  height: 32px;
  cursor: pointer;
  transition: background 0.08s;
}
.snv-combobox__option:hover,
.snv-combobox__option--active { background: var(--v9-ui-hover); }
.snv-combobox__divider {
  height: 1px;
  background: var(--v9-ui-border-light);
  margin: var(--v9-space-xxs) 0;
}
.snv-combobox__name {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  color: var(--v9-ui-text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.snv-combobox__page {
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-s);
  color: var(--v9-ui-dimmed);
  white-space: nowrap;
  flex-shrink: 0;
}

.snv-select-wrap { position: relative; display: flex; align-items: center; }
.snv-select {
  width: 100%; height: 32px;
  padding: 0 var(--v9-space-xl) 0 var(--v9-space-s);
  background: var(--v9-input-bg); border: 1px solid var(--v9-input-border);
  border-radius: var(--v9-radius-m);
  font-family: var(--v9-font); font-size: var(--v9-font-size-m); color: var(--v9-ui-text);
  appearance: none; -webkit-appearance: none; outline: none; cursor: pointer;
  box-sizing: border-box; transition: border-color 0.1s;
}
.snv-select:focus { border-color: var(--v9-ui-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--v9-ui-focus) 20%, transparent); }
.snv-select-chevron { position: absolute; right: var(--v9-space-s); pointer-events: none; color: var(--v9-ui-dimmed); }
.snv-checkbox-row { display: flex; align-items: center; gap: var(--v9-space-xs); cursor: pointer; user-select: none; }
.snv-checkbox-input { position: absolute; opacity: 0; width: 0; height: 0; }
.snv-checkbox-box {
  width: 20px; height: 20px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--v9-radius-s); border: 1.5px solid var(--v9-input-border);
  background: var(--v9-input-bg); transition: background 0.1s, border-color 0.1s;
}
.snv-checkbox-box--checked { background: var(--v9-ui-selected); border-color: var(--v9-ui-selected); color: var(--v9-ui-bg); }
.snv-checkbox-row:hover .snv-checkbox-box:not(.snv-checkbox-box--checked) { background: var(--v9-ui-hover); }
.snv-pin-icon { color: var(--v9-ui-dimmed); flex-shrink: 0; }
.snv-checkbox-label { font-family: var(--v9-font); font-size: var(--v9-font-size-m); color: var(--v9-ui-text); line-height: var(--v9-line-height-m); }

/* Overwrite confirm */
/* ── Overwrite alert dialog ───────────────────────────────────── */
.snv-alert-overlay {
  position: fixed;
  inset: 0;
  z-index: 202; /* above the save dialog (201) */
  backdrop-filter: blur(2px);
  background: rgba(0, 0, 0, 0.2);
  cursor: default;
}

.snv-alert {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 203;
  width: 400px;
  background: var(--v9-ui-bg);
  border: 1px solid var(--v9-ui-border-light);
  border-radius: var(--v9-radius-l);
  box-shadow: 0px 20px 12.5px rgba(0,0,0,0.12), 0px 10px 5px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  padding: var(--v9-space-xxl);
  gap: var(--v9-space-m);
}

.snv-alert__icon-box {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--v9-radius-l);
  background: var(--v9-warning-bg, #fef3c7);
  border: 1px solid var(--v9-warning-border, #fcd34d);
  color: var(--v9-warning-main, #d97706);
}

.snv-alert__title {
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-xl);
  font-weight: var(--v9-font-weight-strong);
  line-height: var(--v9-line-height-l);
  color: var(--v9-ui-text);
}

.snv-alert__desc {
  margin: 0;
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  color: var(--v9-ui-text);
}

.snv-alert__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--v9-space-m);
  padding-top: var(--v9-space-xs);
}
.snv-dialog__btn--danger { background: var(--v9-danger-main); border: 1px solid var(--v9-danger-main); color: #fff; }
.snv-dialog__btn--danger:hover { filter: brightness(1.1); }
.snv-dialog__btn--danger:focus-visible { outline: 2px solid var(--v9-ui-focus); outline-offset: -2px; }
.snv-dialog__btn:disabled { opacity: 0.45; cursor: not-allowed; filter: none; }

/* Toast */
.snv-toast {
  position: fixed;
  top: var(--v9-space-xl);    /* 24px */
  right: var(--v9-space-xl);  /* 24px */
  z-index: 300;
  display: flex;
  align-items: center;
  gap: var(--v9-space-m);     /* 12px */
  min-width: 240px;
  max-width: 400px;
  /* Asymmetric: right is wider to give room for dismiss button, left is tighter (status border sits there) */
  padding: var(--v9-space-l) var(--v9-space-xxl) var(--v9-space-l) var(--v9-space-xl); /* 16px 32px 16px 24px */
  /* Dark pill — same in light and dark mode */
  background: var(--v9-input-primary-bg);
  color: var(--v9-tooltip-text);
  border-radius: var(--v9-radius-m);
  box-shadow: 0px 20px 25px -5px rgba(0,0,0,0.10), 0px 10px 10px -5px rgba(0,0,0,0.06);
  font-family: var(--v9-font);
  font-size: var(--v9-font-size-m);
  font-weight: var(--v9-font-weight-regular);
  line-height: var(--v9-line-height-m);
  overflow: hidden; /* clip the status border to rounded corners */
}

/* Left status border — 4px coloured strip */
.snv-toast__border {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
}
.snv-toast--info    .snv-toast__border { background: var(--v9-info-main); }
.snv-toast--success .snv-toast__border { background: var(--v9-success-main); }
.snv-toast--warning .snv-toast__border { background: var(--v9-warning-main); }
.snv-toast--danger  .snv-toast__border { background: var(--v9-danger-main); }

.snv-toast__msg {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.snv-toast__dismiss {
  position: absolute;
  top: 2px; right: 2px;
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border: none; border-radius: var(--v9-radius-m);
  background: none; cursor: pointer;
  color: var(--v9-tooltip-text);
  opacity: 0.6;
  transition: opacity 0.1s;
  flex-shrink: 0;
}
.snv-toast__dismiss:hover { opacity: 1; }

.toast-enter-active { transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(16px); }
.toast-leave-to     { opacity: 0; transform: translateX(16px); }
</style>
