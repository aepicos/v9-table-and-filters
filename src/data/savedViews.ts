import { ref, computed } from 'vue'
import type { FilterDef, FilterChip } from './filters'

// ── Types ──────────────────────────────────────────────────────────

export interface SavedView {
  id: string
  name: string
  page: string   // top-level nav page: 'Analytics' | 'Inventory' | 'Projects' | 'Issues' | 'Policies'
  scope: 'everyone' | 'admin' | 'only-me'
  createdBy: string
  createdAt: Date
  pinned: boolean
  summary: string
}

// ── Filter definitions for the Views page ─────────────────────────

export const VIEW_FILTER_DEFS: FilterDef[] = [
  {
    id: 'view-page',
    label: 'Page',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Analytics', 'Inventory', 'Issues', 'Policies', 'Projects'],
  },
  {
    id: 'view-created-by',
    label: 'Creator',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Me', 'Aiko Nakamura', 'Marcus Webb', 'Priya Sharma', 'Sarah Chen', 'Tom Okafor'],
  },
  {
    id: 'view-scope',
    label: 'Scope',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Everyone', 'Admin', 'Only me'],
  },
]

// ── Helpers ────────────────────────────────────────────────────────

const now = new Date()
const minsAgo  = (m: number) => new Date(now.getTime() - m * 60_000)
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)
const daysAgo  = (d: number) => new Date(now.getTime() - d * 86_400_000)

export function formatRelativeDate(date: Date): string {
  const diffMs    = Date.now() - date.getTime()
  const diffMins  = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays  = Math.floor(diffMs / 86_400_000)

  if (diffMins  < 1)  return 'just now'
  if (diffMins  < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays  < 7)  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  if (diffDays  < 14) return '1 week ago'

  // Absolute: "d Mmm yyyy"
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const SCOPE_LABELS: Record<SavedView['scope'], string> = {
  everyone:  'Everyone',
  admin:     'Admin',
  'only-me': 'Only me',
}

// ── Mock data ──────────────────────────────────────────────────────

const mockViews: SavedView[] = [
  // ── Inventory ─────────────────────────────────────────────────
  {
    id: 'v1',
    name: 'Critical repos',
    page: 'Inventory',
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: hoursAgo(2),
    pinned: true,
    summary: 'Repositories with critical or high severity issues and a risk score above 900. Sorted by risk score descending. Compact density.',
  },
  {
    id: 'v2',
    name: 'External APIs',
    page: 'Inventory',
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(2),
    pinned: true,
    summary: 'API assets exposed to external traffic. Filters: Asset type is API; Environment is External. Grouped by team.',
  },
  {
    id: 'v3',
    name: 'High-risk packages',
    page: 'Inventory',
    scope: 'admin',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(5),
    pinned: true,
    summary: 'Packages with known exploits and high exploitability scores. Filters: Exploitability is Known exploit; Asset class is A or B. Sorted by risk score descending.',
  },
  {
    id: 'v4',
    name: 'Class A assets — no coverage',
    page: 'Inventory',
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(8),
    pinned: false,
    summary: 'Class A assets that have no Snyk coverage applied. Useful for identifying coverage gaps in the most critical part of the inventory.',
  },
  {
    id: 'v5',
    name: 'Container images — prod',
    page: 'Inventory',
    scope: 'only-me',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(14),
    pinned: false,
    summary: 'Container images running in production environments. Filters: Asset type is Container image; Environment is Production.',
  },
  {
    id: 'v6',
    name: 'Web apps — unscanned',
    page: 'Inventory',
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(21),
    pinned: false,
    summary: 'Web applications that have not been scanned in the last 30 days. Sorted by last scan date ascending to surface the most stale assets first.',
  },
  {
    id: 'v7',
    name: 'GPL-licensed dependencies',
    page: 'Inventory',
    scope: 'admin',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(30),
    pinned: false,
    summary: 'Packages with GPL or strong-copyleft licenses. Filters: License type is Strong copyleft. Sorted by asset class.',
  },
  {
    id: 'v8',
    name: 'Deprecated assets',
    page: 'Inventory',
    scope: 'everyone',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(45),
    pinned: false,
    summary: 'Assets in Deprecated or Retired lifecycle stage. Filters: Lifecycle stage is Deprecated or Retired. Grouped by team.',
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id: 'v9',
    name: 'Critical severity trend',
    page: 'Analytics',
    scope: 'everyone',
    createdBy: 'Priya Sharma',
    createdAt: minsAgo(45),
    pinned: true,
    summary: 'Trend view showing critical severity issues over the past 90 days, filtered to Class A assets only.',
  },
  {
    id: 'v10',
    name: 'Coverage gaps — Q3',
    page: 'Analytics',
    scope: 'admin',
    createdBy: 'Aiko Nakamura',
    createdAt: daysAgo(3),
    pinned: false,
    summary: 'Coverage analysis scoped to Q3. Shows teams with the lowest Snyk coverage across their asset portfolios.',
  },
  {
    id: 'v11',
    name: 'MTTR by team',
    page: 'Analytics',
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(11),
    pinned: false,
    summary: 'Mean time to remediate, broken down by team. Filtered to High and Critical severity issues only. 30-day rolling window.',
  },

  // ── Projects ──────────────────────────────────────────────────
  {
    id: 'v12',
    name: 'At-risk projects',
    page: 'Projects',
    scope: 'admin',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(6),
    pinned: true,
    summary: 'Projects with more than 5 unresolved Critical issues. Sorted by issue count descending.',
  },
  {
    id: 'v13',
    name: 'Unmonitored repos',
    page: 'Projects',
    scope: 'everyone',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(18),
    pinned: false,
    summary: 'Projects that are not actively monitored by Snyk. Useful for identifying blind spots in coverage.',
  },

  // ── Issues ────────────────────────────────────────────────────
  {
    id: 'v14',
    name: 'Unresolved critical issues',
    page: 'Issues',
    scope: 'everyone',
    createdBy: 'Aiko Nakamura',
    createdAt: hoursAgo(6),
    pinned: true,
    summary: 'All unresolved Critical severity issues with a known exploit. Sorted by CVSS score descending.',
  },
  {
    id: 'v15',
    name: 'Fix-available backlog',
    page: 'Issues',
    scope: 'everyone',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(4),
    pinned: false,
    summary: 'High and Critical issues where a fix is available but not yet applied. Grouped by team to support triage assignments.',
  },
  {
    id: 'v16',
    name: 'License violations',
    page: 'Issues',
    scope: 'admin',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(26),
    pinned: false,
    summary: 'Issues of type License that are flagged as policy violations. Filtered to production assets only.',
  },

  // ── Policies ──────────────────────────────────────────────────
  {
    id: 'v17',
    name: 'Policy violations — license',
    page: 'Policies',
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(7),
    pinned: true,
    summary: 'Active policy violations related to license compliance across all Class A and B assets.',
  },
  {
    id: 'v18',
    name: 'Block policies — prod',
    page: 'Policies',
    scope: 'admin',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(33),
    pinned: false,
    summary: 'Policies set to Block action that apply to production environments. Useful for audit and sign-off reviews.',
  },
]

// ── Shared reactive store ──────────────────────────────────────────

const _views = ref<SavedView[]>([...mockViews])

export function useSavedViews() {
  const views = _views

  const pinnedViews = computed(() => views.value.filter(v => v.pinned))

  function togglePin(id: string) {
    const view = views.value.find(v => v.id === id)
    if (view) view.pinned = !view.pinned
  }

  function deleteView(id: string) {
    views.value = views.value.filter(v => v.id !== id)
  }

  return { views, pinnedViews, togglePin, deleteView }
}

// ── Filter helpers ─────────────────────────────────────────────────

function getFieldValue(view: SavedView, filterId: string): string {
  switch (filterId) {
    case 'view-page':       return view.page
    case 'view-created-by': return view.createdBy === 'Jakob Buhl' ? 'Me' : view.createdBy
    case 'view-scope':      return SCOPE_LABELS[view.scope]
    default:                return ''
  }
}

export function applyViewFilters(views: SavedView[], chips: FilterChip[]): SavedView[] {
  if (chips.length === 0) return views

  // Group chips by filterId
  const byKey = new Map<string, FilterChip[]>()
  for (const chip of chips) {
    const key = chip.filterId ?? chip.key
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(chip)
  }

  return views.filter(view => {
    for (const [filterId, chips] of byKey) {
      const fieldValue = getFieldValue(view, filterId)
      const isChips    = chips.filter(c => c.operator === 'is')
      const isNotChips = chips.filter(c => c.operator === 'is not')

      // All 'is not' must hold (AND)
      for (const chip of isNotChips) {
        if (fieldValue === chip.value) return false
      }
      // At least one 'is' must match (OR within dimension)
      if (isChips.length > 0 && !isChips.some(c => c.value === fieldValue)) {
        return false
      }
    }
    return true
  })
}
