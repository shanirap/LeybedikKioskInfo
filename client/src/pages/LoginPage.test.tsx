import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { login } from '../api/authApi'
import { adminUser, teacherUser } from '../test/fixtures'
import { AuthProvider } from '../utils/AuthContext'
import { LoginPage } from './LoginPage'

vi.mock('../api/authApi', () => ({
  login: vi.fn(),
}))

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/teacher-library" element={<div>Teacher library</div>} />
          <Route path="/admin/pending-materials" element={<div>Admin pending</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('logs in teachers and navigates to the teacher library', async () => {
    vi.mocked(login).mockResolvedValue(teacherUser)
    renderLogin()

    await userEvent.type(screen.getByLabelText('מייל'), 'teacher@test.local')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'Teacher123!')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))

    await waitFor(() => expect(screen.getByText('Teacher library')).toBeInTheDocument())
    expect(localStorage.getItem('leybedik_auth')).toContain('teacher-token')
  })

  it('logs in admins and navigates to the pending materials page', async () => {
    vi.mocked(login).mockResolvedValue(adminUser)
    renderLogin()

    await userEvent.type(screen.getByLabelText('מייל'), 'admin@test.local')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'Admin123!')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))

    await waitFor(() => expect(screen.getByText('Admin pending')).toBeInTheDocument())
  })
})
