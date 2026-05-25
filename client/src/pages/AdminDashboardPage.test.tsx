import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getAdminDashboardSummary } from '../api/materialsApi'
import { adminUser } from '../test/fixtures'
import { renderWithToast } from '../test/renderWithToast'
import { AuthProvider } from '../utils/AuthContext'
import { ToastProvider } from '../utils/ToastContext'
import { AdminDashboardPage } from './AdminDashboardPage'

vi.mock('../api/materialsApi', () => ({
  getAdminDashboardSummary: vi.fn(),
}))

function renderDashboard() {
  localStorage.setItem('leybedik_auth', JSON.stringify(adminUser))

  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/pending-materials" element={<div>Manage materials page</div>} />
            <Route path="/admin/archived-materials" element={<div>Archived materials page</div>} />
            <Route path="/admin/users" element={<div>Manage teachers page</div>} />
            <Route path="/admin/instruments" element={<div>Manage instruments page</div>} />
            <Route path="/admin/audit-logs" element={<div>Audit log page</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminDashboardSummary).mockReset()
    vi.mocked(getAdminDashboardSummary).mockResolvedValue({
      pendingMaterialsCount: 4,
      approvedMaterialsCount: 21,
      rejectedMaterialsCount: 2,
      archivedMaterialsCount: 3,
      activeTeachersCount: 7,
      activeInstrumentsCount: 5,
    })
  })

  it('loads and displays admin dashboard summary cards', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'שלום, Admin' })).toBeInTheDocument()
    expect(screen.getByLabelText('סיכום ניהול')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('חומרים ממתינים לאישור')).toBeInTheDocument()
    expect(screen.getByText('חומרים שאושרו')).toBeInTheDocument()
    expect(screen.getByText('חומרים שנדחו')).toBeInTheDocument()
    expect(screen.getByText('חומרים בארכיון')).toBeInTheDocument()
    expect(screen.getByText('מורים פעילים')).toBeInTheDocument()
    expect(screen.getByText('כלי נגינה פעילים')).toBeInTheDocument()
    expect(screen.queryByText('ממתינים לאישור')).not.toBeInTheDocument()
  })

  it('provides admin quick action links', async () => {
    renderDashboard()

    await screen.findByText('פעולות מהירות')
    expect(screen.getByRole('link', { name: 'ניהול חומרים' })).toHaveAttribute('href', '/admin/pending-materials')
    expect(screen.getByRole('link', { name: 'בדיקת חומרים ממתינים' })).toHaveAttribute(
      'href',
      '/admin/pending-materials',
    )
    expect(screen.getByRole('link', { name: 'ארכיון חומרים' })).toHaveAttribute(
      'href',
      '/admin/archived-materials',
    )
    expect(screen.getByRole('link', { name: 'ניהול מורים' })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: 'ניהול כלי נגינה' })).toHaveAttribute('href', '/admin/instruments')
    expect(screen.getByRole('link', { name: 'יומן פעילות' })).toHaveAttribute('href', '/admin/audit-logs')
  })

  it('navigates through quick actions', async () => {
    renderDashboard()

    await screen.findByText('פעולות מהירות')
    await userEvent.click(screen.getByRole('link', { name: 'ניהול מורים' }))

    expect(await screen.findByText('Manage teachers page')).toBeInTheDocument()
  })

  it('shows an error toast when summary loading fails', async () => {
    vi.mocked(getAdminDashboardSummary).mockRejectedValue({ isAxiosError: true })
    renderWithToast(
      <MemoryRouter>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('לא ניתן לטעון את סיכום לוח הניהול.')
  })
})
