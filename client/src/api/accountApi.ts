import { apiClient } from './apiClient'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export async function changePassword(request: ChangePasswordRequest) {
  await apiClient.put('/account/password', request)
}
