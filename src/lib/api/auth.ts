import { api } from "@app/lib/api"
import type { SessionData } from "@app/types/session"

export interface LoginResult {
  success: boolean
  message?: string
  redirectTo?: string
}

export async function fetchSession(): Promise<SessionData | null> {
  try {
    const response = await api.get<{ session: SessionData }>("/auth/session")
    return response.data.session
  } catch (error: any) {
    if (error?.response?.status === 204) return null
    throw error
  }
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  const response = await api.post<LoginResult>("/auth/login/email-password", { email, password })
  return response.data
}

export async function loginWithProjectCode(projectCode: string) {
  const response = await api.post<LoginResult>("/auth/login/project-code", { projectCode })
  return response.data
}

export async function setupClientPassword(_password: string) {
  return { success: false, message: "Cambia la contraseña desde la app de Terrazea." }
}

export async function logout() {
  await api.post("/auth/logout")
}
