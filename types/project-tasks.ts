export const PROJECT_TASK_STATUSES = ["todo", "in_progress", "blocked", "review", "done"] as const

export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number]

export function isProjectTaskStatus(value: unknown): value is ProjectTaskStatus {
  return typeof value === "string" && PROJECT_TASK_STATUSES.includes(value as ProjectTaskStatus)
}
