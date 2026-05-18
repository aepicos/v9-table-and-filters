import type { AssetItem, AssetType, TeamName, LanguageName } from './assets'

/* ============================================================
   CONSTANTS
   ============================================================ */

export const NAMES = [
  'auth-service','payment-api','user-service','notification-svc','reporting-api',
  'search-svc','ml-inference','data-pipeline','config-service','gateway-api',
  'frontend-app','admin-console','billing-svc','analytics-api','asset-manager',
  'secret-manager','cert-rotator','log-aggregator','event-bus','scheduler-svc',
  'cache-service','queue-worker','batch-processor','file-storage','image-resize',
  'email-service','sms-gateway','push-notification','webhook-relay','rate-limiter',
  'feature-flags','ab-testing','session-svc','token-service','audit-log',
  'compliance-checker','vuln-scanner','dep-tracker','sbom-generator','policy-engine',
  'k8s-operator','helm-chart','terraform-module','ansible-role','docker-base-img',
  'nginx-proxy','haproxy-lb','istio-config','envoy-filter','otel-collector',
]

export const TEAMS: TeamName[] = [
  'Legendary Shack Shakers','Love and Rockets','Nouvelle Vague',
  'Public Service Broadcasting','The Bad Seeds','Trimdon Grange Explosion',
]

export const LANGUAGES: LanguageName[] = ['C#', 'Go', 'Java', 'Javascript', 'Python', 'Ruby', 'Typescript']
export const CLASS_CYCLE = ['A','B','C','C','D','B','C','D','B','C','A','C','D','B','C','D','C','B','D','C']
export const TYPES: AssetType[] = ['API','Application','Container image','Package','Repository','SBOM','Service','Website']
export const ENVS = ['Production','Staging','Development','Testing']
export const VISIBILITIES = ['Public','Private','Internal']
export const COVERAGE_TYPES = ['SCM','SAST','Secrets','DAST','Container','IaC']
export const SOURCE_TYPES = ['SCM','CLI','CI/CD','Docker','Registry','API']
export const LAST_SCAN_LABELS = [
  'just now','15 min ago','1 hour ago','3 hours ago','6 hours ago','12 hours ago',
  '1 day ago','2 days ago','5 days ago','8 days ago','14 days ago','21 days ago','30+ days ago',
]
export const NAME_SUFFIXES = ['','-v2','-prod','-staging','-svc','-api','-worker','-gateway','']

export const COVERAGE_ABBREV: Record<string, string> = {
  SCM: 'SCM', SAST: 'SAT', Secrets: 'SEC', DAST: 'DST', Container: 'CTR', IaC: 'IaC',
}

export const LIFECYCLE_STAGES = ['Experimental', 'Active', 'Deprecated', 'Retired']
export const FIXABILITIES = ['Fix available', 'No fix', 'Workaround']
export const EXPLOITABILITIES = ['Known exploit', 'Proof of concept', 'None']
export const ISSUE_TYPES = ['Code quality', 'License', 'Misconfiguration', 'Vulnerability']
export const LICENSES = ['Apache 2.0', 'BSD 3-Clause', 'GPL', 'LGPL', 'MIT', 'MPL 2.0', 'Unlicense']
export const LICENSE_TYPE_MAP: Record<string, string> = {
  'Apache 2.0': 'Permissive',
  'BSD 3-Clause': 'Permissive',
  'MIT': 'Permissive',
  'Unlicense': 'Permissive',
  'MPL 2.0': 'Weak copyleft',
  'LGPL': 'Weak copyleft',
  'GPL': 'Strong copyleft',
}
export const LANG_ECOSYSTEM: Record<LanguageName, string> = {
  'Java': 'Maven', 'Javascript': 'npm', 'Typescript': 'npm',
  'Python': 'PyPI', 'Go': 'Go', 'C#': 'NuGet', 'Ruby': 'RubyGems',
}
export const ALL_TAGS = [
  'pci-dss','hipaa','gdpr','soc2','internal-tool','customer-facing',
  'ml-model','data-processing','auth','payments','legacy','greenfield',
]

export const REFERENCE_DATE = new Date('2026-04-20')

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getBitmaskSubset(arr: string[], bitmask: number): string[] {
  const result: string[] = []
  for (let j = 0; j < arr.length; j++) {
    if (bitmask & (1 << j)) result.push(arr[j])
  }
  return result
}

/* ============================================================
   DATASET GENERATOR
   ============================================================ */

function generateDataset(): AssetItem[] {
  const items: AssetItem[] = []
  for (let i = 0; i < 10473; i++) {
    const assetClass = CLASS_CYCLE[i % CLASS_CYCLE.length]
    let critIssues: number, highIssues: number, medIssues: number, lowIssues: number
    if (assetClass === 'A') {
      // High-value assets: always have critical + high issues
      critIssues = (i % 5) + 8;  highIssues = (i % 7) + 10; medIssues = (i % 8) + 12; lowIssues = (i % 10) + 5
    } else if (assetClass === 'B') {
      // ~30% have no critical issues, all have high
      critIssues = (i % 10) < 3 ? 0 : (i % 5) + 4
      highIssues = (i % 7) + 6;  medIssues = (i % 8) + 8;   lowIssues = (i % 10) + 4
    } else if (assetClass === 'C') {
      // ~50% have no critical, ~25% have no high
      critIssues = (i % 8) < 4 ? 0 : (i % 5) + 3
      highIssues = (i % 12) < 3 ? 0 : (i % 6) + 4
      medIssues = (i % 8) + 6;   lowIssues = (i % 10) + 3
    } else {
      // D: ~70% have no critical, ~40% have no high
      critIssues = (i % 10) < 7 ? 0 : (i % 3) + 1
      highIssues = (i % 5) < 2 ? 0 : (i % 4) + 2
      medIssues = (i % 8) + 4;   lowIssues = (i % 10) + 2
    }

    const classMultiplier = assetClass === 'A' ? 4 : assetClass === 'B' ? 3 : assetClass === 'C' ? 2 : 1
    const riskScore = Math.min(1000, (critIssues * 10 + highIssues * 7 + medIssues * 4 + lowIssues * 1) * classMultiplier)

    const nameBase = NAMES[i % NAMES.length]
    const cycle = Math.floor(i / NAMES.length)
    const suffix = NAME_SUFFIXES[i % NAME_SUFFIXES.length]
    const namePart = cycle > 0 ? String(cycle).padStart(2, '0') : ''
    const name = nameBase + (namePart ? '-' + namePart : '') + suffix

    // coverageMask === 0 → unmonitored (no coverage tools assigned)
    const coverageMask = i % 64
    const coverage = coverageMask === 0 ? [] : getBitmaskSubset(COVERAGE_TYPES, coverageMask)
    const sourceMask = (i * 7) % 64
    const source = getBitmaskSubset(SOURCE_TYPES, sourceMask || 1)

    let activityStatus: string
    const actMod = i % 10
    if (actMod < 7) activityStatus = 'Active'
    else if (actMod < 9) activityStatus = 'Inactive'
    else activityStatus = 'Stale'

    const daysAgo = 10473 - i
    const firstSeenDate = new Date(REFERENCE_DATE)
    firstSeenDate.setDate(firstSeenDate.getDate() - daysAgo)

    const lang = LANGUAGES[i % LANGUAGES.length]
    const lic = LICENSES[i % LICENSES.length]
    const tagMask = (i * 13) % (1 << ALL_TAGS.length)
    const tags = ALL_TAGS.filter((_, j) => tagMask & (1 << j)).slice(0, 3)

    items.push({
      id: 'asset-' + String(i + 1).padStart(5, '0'),
      name,
      assetClass,
      type: TYPES[i % TYPES.length],
      issues: { critical: critIssues, high: highIssues, medium: medIssues, low: lowIssues },
      riskScore,
      coverage,
      team: TEAMS[i % TEAMS.length],
      language: lang,
      source,
      environment: ENVS[(i * 3) % ENVS.length],
      firstSeen: formatDate(firstSeenDate),
      lastScan: LAST_SCAN_LABELS[i % LAST_SCAN_LABELS.length],
      visibility: VISIBILITIES[i % 3],
      activityStatus,
      ecosystem: LANG_ECOSYSTEM[lang],
      lifecycleStage: LIFECYCLE_STAGES[(i * 3) % LIFECYCLE_STAGES.length],
      fixability: FIXABILITIES[i % FIXABILITIES.length],
      exploitability: EXPLOITABILITIES[(i * 7) % EXPLOITABILITIES.length],
      issueType: ISSUE_TYPES[(i * 5) % ISSUE_TYPES.length],
      license: lic,
      licenseType: LICENSE_TYPE_MAP[lic] ?? 'Proprietary',
      tags: tags.length ? tags : [ALL_TAGS[i % ALL_TAGS.length]],
    })
  }
  return items
}

/* ============================================================
   RISK PREDICATE
   ============================================================ */

/**
 * Composite "asset at risk" signal — combines factors we have directly
 * with proxies for the dimensions we don't:
 *
 *  Direct:
 *    - Asset class (A = highest weight)
 *    - Critical + high issue counts
 *    - Coverage gap (low coverage = exposed)
 *
 *  Proxied from available fields:
 *    - Issue reachability  → exploitability ("Known exploit" / "Proof of concept")
 *    - Issue maturity      → exploitability × issueType=Vulnerability
 *    - Low maintainability → activityStatus=Stale + lifecycleStage=Deprecated/Retired
 *
 * Threshold: score ≥ 55 out of a possible ~115.
 */
export function isAtRisk(item: AssetItem): boolean {
  let score = 0

  // ── Class weight ──────────────────────────────────────────
  if      (item.assetClass === 'A') score += 28
  else if (item.assetClass === 'B') score += 12

  // ── Severity ─────────────────────────────────────────────
  if      (item.issues.critical >= 8) score += 24
  else if (item.issues.critical >= 4) score += 14
  else if (item.issues.critical >  0) score += 6

  if      (item.issues.high >= 10) score += 14
  else if (item.issues.high >=  6) score += 8
  else if (item.issues.high >=  2) score += 3

  // ── Coverage gap (0 tools = fully exposed, 6 = fully covered) ──
  const covGap = (6 - item.coverage.length) / 6  // 0.0 → 1.0
  score += Math.round(covGap * 14)                // 0–14 pts

  // ── Reachability proxy: exploitability ───────────────────
  if      (item.exploitability === 'Known exploit')     score += 15
  else if (item.exploitability === 'Proof of concept')  score += 8

  // ── Issue maturity proxy: known vulnerability type ───────
  if (item.issueType === 'Vulnerability' && item.exploitability !== 'None') score += 5

  // ── Maintainability proxy ────────────────────────────────
  if (item.activityStatus === 'Stale') score += 8
  if (item.lifecycleStage === 'Deprecated' || item.lifecycleStage === 'Retired') score += 6

  return score >= 55
}

/* ============================================================
   EXPORTS
   ============================================================ */

export const DATASET = generateDataset()

/** Pre-computed aggregate stats — avoids re-scanning 10k items at runtime */
export const DATASET_STATS = {
  total:          DATASET.length,
  atRisk:         DATASET.filter(isAtRisk).length,
  classA:         DATASET.filter(a => a.assetClass === 'A').length,
  criticalIssues: DATASET.filter(a => a.issues.critical > 0).length,
  unmonitored:    DATASET.filter(a => a.coverage.length === 0).length,
}
