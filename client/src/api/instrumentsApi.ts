import type {
  AdminUserDto,
  CreateInstrumentRequest,
  CreateUserRequest,
  InstrumentDto,
  ResetPasswordRequest,
  UpdateInstrumentRequest,
  UpdateUserRequest,
} from '../types/material'
import { apiClient } from './apiClient'

export async function getInstruments() {
  const { data } = await apiClient.get<InstrumentDto[]>('/instruments')
  return data
}

export async function getAdminUsers() {
  const { data } = await apiClient.get<AdminUserDto[]>('/admin/users')
  return data
}

export async function getAdminInstruments() {
  const { data } = await apiClient.get<InstrumentDto[]>('/admin/instruments')
  return data
}

export async function createAdminUser(request: CreateUserRequest) {
  const { data } = await apiClient.post<AdminUserDto>('/admin/users', request)
  return data
}

export async function updateAdminUser(id: number, request: UpdateUserRequest) {
  const { data } = await apiClient.put<AdminUserDto>(`/admin/users/${id}`, request)
  return data
}

export async function updateAdminUserInstruments(id: number, instrumentIds: number[]) {
  const { data } = await apiClient.put<AdminUserDto>(`/admin/users/${id}/instruments`, {
    instrumentIds,
  })
  return data
}

export async function resetAdminUserPassword(id: number, request: ResetPasswordRequest) {
  const { data } = await apiClient.put<AdminUserDto>(`/admin/users/${id}/password`, request)
  return data
}

export async function createAdminInstrument(request: CreateInstrumentRequest) {
  const { data } = await apiClient.post<InstrumentDto>('/admin/instruments', request)
  return data
}

export async function updateAdminInstrument(id: number, request: UpdateInstrumentRequest) {
  const { data } = await apiClient.put<InstrumentDto>(`/admin/instruments/${id}`, request)
  return data
}
