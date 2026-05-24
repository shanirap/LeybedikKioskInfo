import type { AuditLogDto, PagedResult } from '../types/material'
import { apiClient } from './apiClient'

export async function getAuditLogsPaged(params?: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PagedResult<AuditLogDto>>('/admin/audit-logs', { params })
  return data
}
