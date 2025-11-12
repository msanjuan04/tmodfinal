export type SessionRole = "admin" | "client"

export interface SessionData {
  userId: string
  email: string
  name: string
  clientId: string | null
  role: SessionRole
  mustUpdatePassword?: boolean
}
