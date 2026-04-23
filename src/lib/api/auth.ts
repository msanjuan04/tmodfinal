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

// Define la contraseña inicial del cliente tras entrar con el código Terrazea.
// El backend marca clients.password_initialized = true y limpia
// must_update_password. Si falla, devolvemos el mensaje del backend.
export async function setupClientPassword(password: string) {
  try {
    const response = await api.post<{ success: boolean; message?: string }>("/auth/setup-password", {
      password,
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data as { success: boolean; message?: string }
    }
    throw error
  }
}

export async function requestPasswordReset(email: string) {
  const response = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", { email })
  return response.data
}

export async function confirmPasswordReset(token: string, password: string) {
  try {
    const response = await api.post<{ success: boolean; message: string }>("/auth/reset-password", {
      token,
      password,
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data as { success: boolean; message: string }
    }
    throw error
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const response = await api.post<{ success: boolean; message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data as { success: boolean; message: string }
    }
    throw error
  }
}

export async function logout() {
  await api.post("/auth/logout")
}
