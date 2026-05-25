import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getTeacherDashboardSummary } from '../api/materialsApi'
import { teacherUser } from '../test/fixtures'
import { renderWithToast } from '../test/renderWithToast'
import { AuthProvider } from '../utils/AuthContext'
import { ToastProvider } from '../utils/ToastContext'
import { TeacherDashboardPage } from './TeacherDashboardPage'

vi.mock('../api/materialsApi', () => ({
  getTeacherDashboardSummary: vi.fn(),
}))

function renderDashboard() {
  localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))

  return render(
    <MemoryRouter initialEntries={['/teacher/dashboard']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/upload-material" element={<div>Upload page</div>} />
            <Route path="/my-uploads" element={<div>My uploads page</div>} />
            <Route path="/my-favorites" element={<div>My favorites page</div>} />
            <Route path="/teacher-library" element={<div>Library page</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('TeacherDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getTeacherDashboardSummary).mockReset()
    vi.mocked(getTeacherDashboardSummary).mockResolvedValue({
      approvedAvailableCount: 12,
      myUploadsCount: 5,
      pendingCount: 2,
      rejectedCount: 1,
    })
  })

  it('loads and displays dashboard summary cards', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'שלום, Teacher' })).toBeInTheDocument()
    expect(screen.getByLabelText('סיכום חומרים')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('חומרים מאושרים בספרייה')).toBeInTheDocument()
    expect(screen.getByText('ממתינים לאישור')).toBeInTheDocument()
    expect(screen.getByText('נדחו')).toBeInTheDocument()
  })

  it('provides quick action links', async () => {
    renderDashboard()

    await screen.findByText('פעולות מהירות')
    expect(screen.getByRole('link', { name: 'העלאת חומר' })).toHaveAttribute('href', '/upload-material')
    expect(screen.getByRole('link', { name: 'החומרים שלי' })).toHaveAttribute('href', '/my-uploads')
    expect(screen.getByRole('link', { name: 'המועדפים שלי' })).toHaveAttribute('href', '/my-favorites')
    expect(screen.getByRole('link', { name: 'לספרייה' })).toHaveAttribute('href', '/teacher-library')
  })

  it('navigates through quick actions', async () => {
    renderDashboard()

    await screen.findByText('פעולות מהירות')
    await userEvent.click(screen.getByRole('link', { name: 'לספרייה' }))

    expect(await screen.findByText('Library page')).toBeInTheDocument()
  })

  it('shows an error toast when summary loading fails', async () => {
    vi.mocked(getTeacherDashboardSummary).mockRejectedValue({ isAxiosError: true })
    renderWithToast(
      <MemoryRouter>
        <AuthProvider>
          <TeacherDashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('לא ניתן לטעון את סיכום לוח הבקרה.')
  })
})
