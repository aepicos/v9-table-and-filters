import { ref, computed } from 'vue'
import type { FilterDef, FilterChip } from './filters'

// ── Types ──────────────────────────────────────────────────────────

export interface ViewState {
  filters?:        FilterChip[]
  sortCol?:        string | null
  sortDir?:        'asc' | 'desc'
  groupBy?:        string | null
  density?:        'comfortable' | 'compact'
  visibleColumns?: string[]   // column IDs that should be visible
}

export interface SavedView {
  id: string
  name: string
  page: string        // top-level nav page: 'Analytics' | 'Inventory' | 'Projects' | 'Issues' | 'Policies'
  path: string[]      // full breadcrumb route, e.g. ['Inventory', 'Asset management', 'Repositories']
  scope: 'everyone' | 'admin' | 'only-me'
  createdBy: string
  createdAt: Date
  pinned: boolean
  summary: string
  state?: ViewState
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
    path: ['Inventory', 'Asset management'],
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: hoursAgo(2),
    pinned: true,
    summary: 'Repositories in production with asset class A. Grouped by team, sorted by risk score. Compact density.',
    state: {
      filters: [
        { id: 'sv1-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'Repository' },
        { id: 'sv1-2', filterId: 'asset-class', key: 'Class',       operator: 'is', value: 'A'          },
        { id: 'sv1-3', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Production' },
      ],
      groupBy: 'team',
      sortCol: 'riskScore',
      sortDir: 'desc',
      density: 'compact',
      visibleColumns: ['select', 'name', 'issueCounts', 'riskScore', 'coverage', 'lastScan', 'visibility', 'actions'],
    },
  },
  {
    id: 'v2',
    name: 'External APIs',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'API'],
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(2),
    pinned: true,
    summary: 'API assets exposed to external traffic. Filters: Asset type is API; Environment is External. Grouped by team.',
    state: {
      filters: [
        { id: 'sv2-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'API'      },
        { id: 'sv2-2', filterId: 'environment', key: 'Environment',  operator: 'is', value: 'Production' },
      ],
      groupBy: 'team',
    },
  },
  {
    id: 'v3',
    name: 'High-risk packages',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Packages'],
    scope: 'admin',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(5),
    pinned: true,
    summary: 'Packages with known exploits and high exploitability scores. Filters: Exploitability is Known exploit; Asset class is A or B. Sorted by risk score descending.',
    state: {
      filters: [
        { id: 'sv3-1', filterId: 'asset-type',     key: 'Type',           operator: 'is', value: 'Package'      },
        { id: 'sv3-2', filterId: 'exploitability',  key: 'Exploitability', operator: 'is', value: 'Known exploit' },
        { id: 'sv3-3', filterId: 'asset-class',     key: 'Class',          operator: 'is', value: 'A'            },
        { id: 'sv3-4', filterId: 'asset-class',     key: 'Class',          operator: 'is', value: 'B'            },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v4',
    name: 'Class A assets — no coverage',
    page: 'Inventory',
    path: ['Inventory', 'Asset management'],
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(8),
    pinned: true,
    summary: 'Class A assets that have no Snyk coverage applied. Grouped by team to surface ownership gaps.',
    state: {
      filters: [
        { id: 'sv4-1', filterId: 'asset-class', key: 'Class', operator: 'is', value: 'A' },
      ],
      groupBy: 'team',
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v5',
    name: 'Container images — prod',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Container images'],
    scope: 'only-me',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(14),
    pinned: true,
    summary: 'Container images running in production environments. Filters: Asset type is Container image; Environment is Production. Sorted by risk score.',
    state: {
      filters: [
        { id: 'sv5-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'Container image' },
        { id: 'sv5-2', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Production'      },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v6',
    name: 'Web apps — unscanned',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Web applications'],
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(21),
    pinned: true,
    summary: 'Web applications that have not been scanned in the last 30 days. Sorted by last scan date ascending to surface the most stale assets first.',
    state: {
      filters: [
        { id: 'sv6-1', filterId: 'asset-type', key: 'Type', operator: 'is', value: 'Website' },
      ],
      sortCol: 'lastScan',
      sortDir: 'asc',
      visibleColumns: ['select', 'name', 'type', 'assetClass', 'issueCounts', 'riskScore', 'coverage', 'team', 'lastScan', 'actions'],
    },
  },
  {
    id: 'v7',
    name: 'GPL-licensed dependencies',
    page: 'Inventory',
    path: ['Inventory', 'Dependencies'],
    scope: 'admin',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(30),
    pinned: true,
    summary: 'Packages with GPL or strong-copyleft licenses. Filters: License type is Strong copyleft. Sorted by asset class descending.',
    state: {
      filters: [
        { id: 'sv7-1', filterId: 'license-type', key: 'License', operator: 'is', value: 'Strong copyleft' },
      ],
      sortCol: 'assetClass',
      sortDir: 'asc',
    },
  },
  {
    id: 'v8',
    name: 'Deprecated assets',
    page: 'Inventory',
    path: ['Inventory', 'Asset management'],
    scope: 'everyone',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(45),
    pinned: true,
    summary: 'Assets in Deprecated or Retired lifecycle stage. Filters: Lifecycle stage is Deprecated or Retired. Grouped by team.',
    state: {
      filters: [
        { id: 'sv8-1', filterId: 'lifecycle', key: 'Lifecycle', operator: 'is', value: 'Deprecated' },
        { id: 'sv8-2', filterId: 'lifecycle', key: 'Lifecycle', operator: 'is', value: 'Retired'    },
      ],
      groupBy: 'team',
    },
  },

  // ── Coverage ───────────────────────────────────────────────────
  {
    id: 'v19',
    name: 'Class A — no coverage',
    page: 'Inventory',
    path: ['Inventory', 'Coverage'],
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(3),
    pinned: true,
    summary: 'Class A assets with no Snyk product coverage applied. Grouped by team to surface ownership gaps quickly.',
    state: {
      filters: [
        { id: 'sv19-1', filterId: 'asset-class', key: 'Class', operator: 'is', value: 'A' },
        { id: 'sv19-2', filterId: 'coverage',    key: 'Coverage', operator: 'is', value: 'None' },
      ],
      groupBy: 'team',
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v20',
    name: 'SAST coverage gaps',
    page: 'Inventory',
    path: ['Inventory', 'Coverage'],
    scope: 'admin',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(9),
    pinned: true,
    summary: 'Repositories missing SAST coverage. Filters: Asset type is Repository; SAST coverage is None. Sorted by risk score.',
    state: {
      filters: [
        { id: 'sv20-1', filterId: 'asset-type',    key: 'Type',    operator: 'is', value: 'Repository' },
        { id: 'sv20-2', filterId: 'sast-coverage', key: 'SAST',    operator: 'is', value: 'None'       },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v21',
    name: 'Coverage by team',
    page: 'Inventory',
    path: ['Inventory', 'Coverage'],
    scope: 'everyone',
    createdBy: 'Aiko Nakamura',
    createdAt: daysAgo(22),
    pinned: false,
    summary: 'All assets grouped by team to compare coverage rates across the organisation. Sorted by coverage ascending to surface the worst-covered teams first.',
    state: {
      groupBy: 'team',
      sortCol: 'coverage',
      sortDir: 'asc',
    },
  },

  // ── Asset management (additional unpinned) ─────────────────────
  {
    id: 'v22',
    name: 'Production assets — A or B',
    page: 'Inventory',
    path: ['Inventory', 'Asset management'],
    scope: 'everyone',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(12),
    pinned: false,
    summary: 'Production assets of class A or B. Useful for focusing remediation effort on the highest-value surface.',
    state: {
      filters: [
        { id: 'sv22-1', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Production' },
        { id: 'sv22-2', filterId: 'asset-class', key: 'Class',       operator: 'is', value: 'A'          },
        { id: 'sv22-3', filterId: 'asset-class', key: 'Class',       operator: 'is', value: 'B'          },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
      density: 'compact',
    },
  },
  {
    id: 'v23',
    name: 'High-risk by team',
    page: 'Inventory',
    path: ['Inventory', 'Asset management'],
    scope: 'everyone',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(19),
    pinned: false,
    summary: 'All assets grouped by team and sorted by risk score. Useful for triaging which team needs attention first.',
    state: {
      groupBy: 'team',
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },

  // ── Repositories ───────────────────────────────────────────────
  {
    id: 'v24',
    name: 'Repos with known exploits',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Repositories'],
    scope: 'everyone',
    createdBy: 'Aiko Nakamura',
    createdAt: hoursAgo(3),
    pinned: true,
    summary: 'Repositories containing at least one package with a known exploit. Sorted by risk score descending.',
    state: {
      filters: [
        { id: 'sv24-1', filterId: 'asset-type',      key: 'Type',           operator: 'is', value: 'Repository'  },
        { id: 'sv24-2', filterId: 'exploitability',  key: 'Exploitability', operator: 'is', value: 'Known exploit'},
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v25',
    name: 'Repos — unscanned',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Repositories'],
    scope: 'everyone',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(8),
    pinned: true,
    summary: 'Repositories not scanned in the last 30 days. Sorted by last scan date ascending to surface the most stale first.',
    state: {
      filters: [
        { id: 'sv25-1', filterId: 'asset-type', key: 'Type', operator: 'is', value: 'Repository' },
      ],
      sortCol: 'lastScan',
      sortDir: 'asc',
      visibleColumns: ['select', 'name', 'assetClass', 'issueCounts', 'riskScore', 'coverage', 'team', 'lastScan', 'actions'],
    },
  },
  {
    id: 'v26',
    name: 'GPL repos',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Repositories'],
    scope: 'admin',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(35),
    pinned: false,
    summary: 'Repositories with GPL or strong-copyleft licensed dependencies. Filtered to production assets only.',
    state: {
      filters: [
        { id: 'sv26-1', filterId: 'asset-type',   key: 'Type',        operator: 'is', value: 'Repository'     },
        { id: 'sv26-2', filterId: 'license-type', key: 'License',     operator: 'is', value: 'Strong copyleft'},
        { id: 'sv26-3', filterId: 'environment',  key: 'Environment', operator: 'is', value: 'Production'     },
      ],
    },
  },

  // ── Container images (additional) ──────────────────────────────
  {
    id: 'v27',
    name: 'Container images — class A',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Container images'],
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(6),
    pinned: true,
    summary: 'Class A container images sorted by risk score. Useful for prioritising the most critical image vulnerabilities.',
    state: {
      filters: [
        { id: 'sv27-1', filterId: 'asset-type',  key: 'Type',  operator: 'is', value: 'Container image' },
        { id: 'sv27-2', filterId: 'asset-class', key: 'Class', operator: 'is', value: 'A'               },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v28',
    name: 'Container images by team',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Container images'],
    scope: 'everyone',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(28),
    pinned: false,
    summary: 'All container images grouped by team. Useful for ownership review and ensuring every team has coverage applied.',
    state: {
      filters: [
        { id: 'sv28-1', filterId: 'asset-type', key: 'Type', operator: 'is', value: 'Container image' },
      ],
      groupBy: 'team',
    },
  },

  // ── Packages (additional) ──────────────────────────────────────
  {
    id: 'v29',
    name: 'Packages with fix available',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Packages'],
    scope: 'everyone',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(4),
    pinned: true,
    summary: 'High and Critical severity packages where a fix is available. Sorted by risk score to surface the easiest wins first.',
    state: {
      filters: [
        { id: 'sv29-1', filterId: 'asset-type',    key: 'Type',     operator: 'is', value: 'Package'   },
        { id: 'sv29-2', filterId: 'fix-available', key: 'Fix',      operator: 'is', value: 'Available' },
        { id: 'sv29-3', filterId: 'severity',      key: 'Severity', operator: 'is', value: 'Critical'  },
        { id: 'sv29-4', filterId: 'severity',      key: 'Severity', operator: 'is', value: 'High'      },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v30',
    name: 'GPL packages',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Packages'],
    scope: 'admin',
    createdBy: 'Priya Sharma',
    createdAt: daysAgo(38),
    pinned: false,
    summary: 'Packages with GPL or strong-copyleft licenses. Useful for legal review and licence compliance audits.',
    state: {
      filters: [
        { id: 'sv30-1', filterId: 'asset-type',   key: 'Type',    operator: 'is', value: 'Package'        },
        { id: 'sv30-2', filterId: 'license-type', key: 'License', operator: 'is', value: 'Strong copyleft'},
      ],
    },
  },
  {
    id: 'v31',
    name: 'Packages by team',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Packages'],
    scope: 'everyone',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(50),
    pinned: false,
    summary: 'All packages grouped by owning team. Compact density for a high-level overview of package risk distribution.',
    state: {
      filters: [
        { id: 'sv31-1', filterId: 'asset-type', key: 'Type', operator: 'is', value: 'Package' },
      ],
      groupBy: 'team',
      density: 'compact',
    },
  },

  // ── API (additional) ───────────────────────────────────────────
  {
    id: 'v32',
    name: 'APIs — class A, production',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'API'],
    scope: 'everyone',
    createdBy: 'Aiko Nakamura',
    createdAt: daysAgo(5),
    pinned: true,
    summary: 'Class A API assets running in production. Sorted by risk score to prioritise the highest-exposure endpoints.',
    state: {
      filters: [
        { id: 'sv32-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'API'        },
        { id: 'sv32-2', filterId: 'asset-class', key: 'Class',       operator: 'is', value: 'A'          },
        { id: 'sv32-3', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Production' },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v33',
    name: 'Internal APIs',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'API'],
    scope: 'everyone',
    createdBy: 'Sarah Chen',
    createdAt: daysAgo(40),
    pinned: false,
    summary: 'APIs restricted to internal traffic only. Useful for confirming that internal-only APIs are not inadvertently exposed.',
    state: {
      filters: [
        { id: 'sv33-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'API'      },
        { id: 'sv33-2', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Internal' },
      ],
    },
  },

  // ── Web applications (additional) ──────────────────────────────
  {
    id: 'v34',
    name: 'Web apps — prod, class A',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Web applications'],
    scope: 'everyone',
    createdBy: 'Jakob Buhl',
    createdAt: daysAgo(7),
    pinned: true,
    summary: 'Class A web applications in production. Sorted by risk score to surface the most exposed properties first.',
    state: {
      filters: [
        { id: 'sv34-1', filterId: 'asset-type',  key: 'Type',        operator: 'is', value: 'Website'    },
        { id: 'sv34-2', filterId: 'asset-class', key: 'Class',       operator: 'is', value: 'A'          },
        { id: 'sv34-3', filterId: 'environment', key: 'Environment', operator: 'is', value: 'Production' },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v35',
    name: 'Web apps by team',
    page: 'Inventory',
    path: ['Inventory', 'Asset management', 'Web applications'],
    scope: 'everyone',
    createdBy: 'Tom Okafor',
    createdAt: daysAgo(55),
    pinned: false,
    summary: 'All web applications grouped by owning team. Useful for reviewing which teams own the most exposed web properties.',
    state: {
      filters: [
        { id: 'sv35-1', filterId: 'asset-type', key: 'Type', operator: 'is', value: 'Website' },
      ],
      groupBy: 'team',
    },
  },

  // ── Dependencies (additional) ──────────────────────────────────
  {
    id: 'v36',
    name: 'Vulnerable dependencies',
    page: 'Inventory',
    path: ['Inventory', 'Dependencies'],
    scope: 'everyone',
    createdBy: 'Aiko Nakamura',
    createdAt: daysAgo(2),
    pinned: true,
    summary: 'Direct and transitive dependencies with Critical or High severity issues. Sorted by risk score descending.',
    state: {
      filters: [
        { id: 'sv36-1', filterId: 'severity', key: 'Severity', operator: 'is', value: 'Critical' },
        { id: 'sv36-2', filterId: 'severity', key: 'Severity', operator: 'is', value: 'High'     },
      ],
      sortCol: 'riskScore',
      sortDir: 'desc',
    },
  },
  {
    id: 'v37',
    name: 'Dependencies by team',
    page: 'Inventory',
    path: ['Inventory', 'Dependencies'],
    scope: 'everyone',
    createdBy: 'Marcus Webb',
    createdAt: daysAgo(42),
    pinned: false,
    summary: 'All dependencies grouped by owning team. Compact density for a portfolio-level view of dependency risk.',
    state: {
      groupBy: 'team',
      density: 'compact',
    },
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id: 'v9',
    name: 'Critical severity trend',
    page: 'Analytics',
    path: ['Analytics'],
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
    path: ['Analytics'],
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
    path: ['Analytics'],
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
    path: ['Projects'],
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
    path: ['Projects'],
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
    path: ['Issues'],
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
    path: ['Issues'],
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
    path: ['Issues'],
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
    path: ['Policies'],
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
    path: ['Policies'],
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

  function getViewByNameAndPath(name: string, path: string[]): SavedView | undefined {
    const needleName = name.trim().toLowerCase()
    const needlePath = path.map(s => s.toLowerCase()).join(' / ')
    return views.value.find(
      v => v.name.trim().toLowerCase() === needleName &&
           v.path.map(s => s.toLowerCase()).join(' / ') === needlePath
    )
  }

  function saveView(view: SavedView) {
    const idx = views.value.findIndex(v => v.id === view.id)
    if (idx !== -1) {
      views.value.splice(idx, 1, view)
    } else {
      views.value.push(view)
    }
  }

  return { views, pinnedViews, togglePin, deleteView, getViewByNameAndPath, saveView }
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
