import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import { adminUser, teacherUser } from './test/fixtures'
import { AuthProvider } from './utils/AuthContext'

function renderApp(initialEntry: string, user = teacherUser) {
  localStorage.setItem('leybedik_auth', JSON.stringify(user))

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />}>
            <Route path="teacher-library" element={<div>Library page</div>} />
            <Route path="my-uploads" element={<div>My uploads page</div>} />
            <Route path="admin/users" element={<div>Users page</div>} />
            <Route path="login" element={<div>Login page</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('App shell', () => {
  it('shows teacher navigation links for signed-in teachers', () => {
    renderApp('/teacher-library')

    expect(screen.getByText('Library page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'לוח בקרה' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ספרייה' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'העלאת חומר' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'החשבון שלי' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'משתמשים' })).not.toBeInTheDocument()
  })

  it('shows admin navigation links for signed-in admins', () => {
    renderApp('/admin/users', adminUser)

    expect(screen.getByText('Users page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'לוח ניהול' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'לוח בקרה' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'משתמשים' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ארכיון חומרים' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'יומן פעילות' })).toBeInTheDocument()
  })

  it('logs out and navigates back to login', async () => {
    renderApp('/my-uploads')

    await userEvent.click(screen.getByRole('button', { name: 'יציאה' }))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(localStorage.getItem('leybedik_auth')).toBeNull()
  })
})
