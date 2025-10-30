export interface ClientProjectSummary {
  id: string
  slug: string
  name: string
  code: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
}
