import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { adminUser, teacherUser } from '../test/fixtures'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

function AuthHarness() {
  const { user, login, logout } = useAuth()

  return (
    <div>
      <span>{user ? user.fullName : 'Guest'}</span>
      <button onClick={() => login(teacherUser)}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('loads a valid stored user and supports logout', async () => {
    localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByText('Teacher')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))

    expect(screen.getByText('Guest')).toBeInTheDocument()
    expect(localStorage.getItem('leybedik_auth')).toBeNull()
  })

  it('removes expired stored users', () => {
    localStorage.setItem(
      'leybedik_auth',
      JSON.stringify({ ...teacherUser, expiresAtUtc: '2000-01-01T00:00:00Z' }),
    )

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByText('Guest')).toBeInTheDocument()
    expect(localStorage.getItem('leybedik_auth')).toBeNull()
  })
})

describe('ProtectedRoute', () => {
  it('renders protected content when the user has an allowed role', () => {
    localStorage.setItem('leybedik_auth', JSON.stringify(adminUser))

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <div>Admin content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('redirects guests and users without the required role to login', () => {
    localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <div>Admin content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})
