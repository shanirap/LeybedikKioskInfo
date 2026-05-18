import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuditLogs } from '../api/auditApi'
import { auditLogs } from '../test/fixtures'
import { AdminAuditLogsPage } from './AdminAuditLogsPage'

vi.mock('../api/auditApi', () => ({
  getAuditLogs: vi.fn(),
}))

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.mocked(getAuditLogs).mockReset()
    vi.mocked(getAuditLogs).mockResolvedValue(auditLogs)
  })

  it('loads audit logs, formats labels, and filters by search', async () => {
    render(<AdminAuditLogsPage />)

    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('אישור חומר')).toBeInTheDocument()
    expect(screen.getByText('חומר #1')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('חיפוש'), 'missing')

    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.getByText('עדיין לא נרשמו פעולות ביומן.')).toBeInTheDocument()
  })
})
