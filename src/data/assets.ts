export type AssetType = 'API' | 'Application' | 'Container image' | 'Package' | 'Repository' | 'SBOM' | 'Service' | 'Website'
export type TeamName = 'Legendary Shack Shakers' | 'Love and Rockets' | 'Nouvelle Vague' | 'Public Service Broadcasting' | 'The Bad Seeds' | 'Trimdon Grange Explosion'
export type LanguageName = 'C#' | 'Go' | 'Java' | 'Javascript' | 'Python' | 'Ruby' | 'Typescript'

export interface AssetItem {
  id: string
  name: string
  assetClass: string
  type: AssetType
  issues: { critical: number; high: number; medium: number; low: number }
  riskScore: number
  coverage: string[]
  team: TeamName
  language: LanguageName
  source: string[]
  environment: string
  firstSeen: string
  lastScan: string
  visibility: string
  activityStatus: string
  ecosystem: string
  lifecycleStage: string
  fixability: string
  exploitability: string
  issueType: string
  license: string
  licenseType: string
  tags: string[]
}

export function assetPath(item: AssetItem): string {
  switch (item.type) {
    case 'Repository':      return `github.com/org/${item.name}`
    case 'Container image': return `docker.io/org/${item.name}`
    case 'Package':         return item.language === 'Java' ? `pkg:maven/${item.name}` : `pkg:npm/${item.name}`
    case 'API':             return `${item.name}.api.internal`
    case 'SBOM':            return item.id
    case 'Service':         return `${item.name}.svc.cluster.local`
    case 'Website':         return `https://${item.name}.io`
    case 'Application':     return `app:${item.name}`
    default:                return item.name
  }
}
