export interface DashboardMetric {
  code: string
  label: string
  value: number
  sublabel: string | null
}

export interface DashboardUpdate {
  id: string
  title: string
  description: string | null
  type: "success" | "info" | "warning" | "message"
  occurredAt: string
}

export interface DashboardTeamMember {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  status: string
}

export interface DashboardMilestone {
  id: string
  title: string
  scheduledStart: string | null
  scheduledEnd: string | null
  progressPercent: number
  status: "completed" | "in_progress" | "pending"
}

export interface DashboardProjectSummary {
  id: string
  name: string
  code: string | null
  clientName: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
  totalDays: number | null
  remainingDays: number | null
}

export interface DashboardData {
  project: DashboardProjectSummary
  metrics: DashboardMetric[]
  updates: DashboardUpdate[]
  team: DashboardTeamMember[]
  milestones: DashboardMilestone[]
}
