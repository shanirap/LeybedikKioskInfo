import type { AuthUser } from '../types/auth'
import { apiClient } from './apiClient'

interface LoginRequest {
  email: string
  password: string
}

export async function login(request: LoginRequest): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/auth/login', request)
  return data
}
