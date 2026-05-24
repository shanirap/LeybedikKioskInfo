import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuditLogsPaged } from '../api/auditApi'
import { auditLogs } from '../test/fixtures'
import { AdminAuditLogsPage } from './AdminAuditLogsPage'

vi.mock('../api/auditApi', () => ({
  getAuditLogsPaged: vi.fn(),
}))

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.mocked(getAuditLogsPaged).mockReset()
    vi.mocked(getAuditLogsPaged).mockImplementation(async (params) => ({
      items: params?.search === 'missing' ? [] : auditLogs,
      totalCount: params?.search === 'missing' ? 0 : auditLogs.length,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 50,
    }))
  })

  it('loads audit logs, formats labels, and searches server-side', async () => {
    render(<AdminAuditLogsPage />)

    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('אישור חומר')).toBeInTheDocument()
    expect(screen.getByText('חומר #1')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('חיפוש'), 'missing')
    await userEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() =>
      expect(getAuditLogsPaged).toHaveBeenCalledWith({
        search: 'missing',
        page: 1,
        pageSize: 50,
      }),
    )
    expect(await screen.findByText('לא נמצאו רשומות התואמות את החיפוש.')).toBeInTheDocument()
  })
})
