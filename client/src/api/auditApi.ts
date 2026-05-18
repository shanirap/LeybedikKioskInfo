import type { AuditLogDto } from '../types/material'
import { apiClient } from './apiClient'

export async function getAuditLogs(take = 100) {
  const { data } = await apiClient.get<AuditLogDto[]>('/admin/audit-logs', {
    params: { take },
  })
  return data
}
