import type { AxiosError } from "axios"

import type { SessionData } from "@app/types/session"

import { api } from "@app/lib/api"

export interface LoginResult {
  success: boolean
  message?: string
  redirectTo?: string
}

export async function fetchSession(): Promise<SessionData | null> {
  try {
    const response = await api.get<{ session: SessionData }>("/auth/session", {
      validateStatus: (status: number) => status === 200 || status === 204,
    })
    if (response.status === 204) {
      return null
    }
    return response.data.session
  } catch (error) {
    const err = error as AxiosError
    if (err.response && err.response.status === 401) {
      return null
    }
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

export async function logout() {
  await api.post("/auth/logout")
}
