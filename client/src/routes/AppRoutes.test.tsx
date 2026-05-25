import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage'
import { adminUser, teacherUser } from '../test/fixtures'
import { useAuth } from '../utils/useAuth'

vi.mock('../pages/TeacherDashboardPage', () => ({
  TeacherDashboardPage: () => <div>Teacher dashboard page</div>,
}))

vi.mock('../utils/useAuth', () => ({
  useAuth: vi.fn(),
}))

function TeacherDashboardRoute() {
  const { user } = useAuth()

  if (user?.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <TeacherDashboardPage />
}

describe('TeacherDashboardRoute role redirect', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('redirects admins away from the teacher dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherDashboardRoute />} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Teacher dashboard page')).not.toBeInTheDocument()
  })

  it('allows teachers to access the teacher dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: teacherUser,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherDashboardRoute />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Teacher dashboard page')).toBeInTheDocument()
  })
})
