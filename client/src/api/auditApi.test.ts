import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import { getAuditLogsPaged } from './auditApi'
import { auditLogs, pagedMaterials } from '../test/fixtures'

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('audit API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('loads paged audit logs from the admin endpoint', async () => {
    const paged = {
      items: auditLogs,
      totalCount: auditLogs.length,
      page: 1,
      pageSize: 50,
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: paged })

    await expect(getAuditLogsPaged({ search: 'admin', page: 2, pageSize: 25 })).resolves.toBe(paged)

    expect(apiClient.get).toHaveBeenCalledWith('/admin/audit-logs', {
      params: { search: 'admin', page: 2, pageSize: 25 },
    })
  })

  it('loads audit logs without params', async () => {
    const paged = pagedMaterials([])
    vi.mocked(apiClient.get).mockResolvedValue({ data: paged })

    await expect(getAuditLogsPaged()).resolves.toBe(paged)

    expect(apiClient.get).toHaveBeenCalledWith('/admin/audit-logs', { params: undefined })
  })
})
