import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  createAdminUser,
  getAdminInstruments,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserInstruments,
} from '../api/instrumentsApi'
import { adminUsers, instruments } from '../test/fixtures'
import { AdminCreateUserPage } from './AdminCreateUserPage'
import { AdminUsersPage } from './AdminUsersPage'

vi.mock('../api/instrumentsApi', () => ({
  createAdminUser: vi.fn(),
  getAdminInstruments: vi.fn(),
  getAdminUsers: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  updateAdminUser: vi.fn(),
  updateAdminUserInstruments: vi.fn(),
}))

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.mocked(createAdminUser).mockReset()
    vi.mocked(getAdminInstruments).mockReset()
    vi.mocked(getAdminUsers).mockReset()
    vi.mocked(resetAdminUserPassword).mockReset()
    vi.mocked(updateAdminUser).mockReset()
    vi.mocked(updateAdminUserInstruments).mockReset()

    vi.mocked(getAdminUsers).mockResolvedValue(adminUsers)
    vi.mocked(getAdminInstruments).mockResolvedValue(instruments)
    vi.mocked(createAdminUser).mockResolvedValue(adminUsers[1])
    vi.mocked(updateAdminUser).mockResolvedValue(adminUsers[1])
    vi.mocked(updateAdminUserInstruments).mockResolvedValue(adminUsers[1])
    vi.mocked(resetAdminUserPassword).mockResolvedValue(adminUsers[1])
  })

  function renderUsersPage(initialEntry = '/admin/users') {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/new" element={<AdminCreateUserPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('loads users and instruments without showing instrument management controls', async () => {
    renderUsersPage()

    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Teacher')).toBeInTheDocument()
    expect(screen.getAllByText('Piano').length).toBeGreaterThan(0)
    expect(getAdminUsers).toHaveBeenCalledTimes(1)
    expect(getAdminInstruments).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('ניהול כלי נגינה')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'הוסף כלי' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'משתמש חדש' })).toBeInTheDocument()
  })

  it('creates a teacher with selected instruments on a separate page', async () => {
    renderUsersPage()

    await screen.findByText('Admin')
    await userEvent.click(screen.getByRole('link', { name: 'משתמש חדש' }))

    expect(await screen.findByRole('heading', { name: 'יצירת משתמש' })).toBeInTheDocument()
    const createForm = screen.getByRole('button', { name: 'יצירת משתמש' }).closest('form')
    expect(createForm).not.toBeNull()

    await userEvent.type(within(createForm!).getByLabelText('שם מלא'), 'New Teacher')
    await userEvent.type(within(createForm!).getByLabelText('מייל'), 'new.teacher@test.local')
    await userEvent.type(within(createForm!).getByLabelText('סיסמה ראשונית'), 'Teacher123!')
    await userEvent.click(within(createForm!).getByLabelText('Piano'))
    await userEvent.click(within(createForm!).getByLabelText('Violin'))
    await userEvent.click(within(createForm!).getByRole('button', { name: 'יצירת משתמש' }))

    expect(createAdminUser).toHaveBeenCalledWith({
      fullName: 'New Teacher',
      email: 'new.teacher@test.local',
      password: 'Teacher123!',
      role: 'Teacher',
      isActive: true,
      instrumentIds: [1, 2],
    })
    expect(await screen.findByText('המשתמש נוצר.')).toBeInTheDocument()
  })

  it('creates an admin without instrument assignments on a separate page', async () => {
    renderUsersPage()

    await screen.findByText('Admin')
    await userEvent.click(screen.getByRole('link', { name: 'משתמש חדש' }))

    const createForm = (await screen.findByRole('button', { name: 'יצירת משתמש' })).closest('form')
    expect(createForm).not.toBeNull()

    await userEvent.type(within(createForm!).getByLabelText('שם מלא'), 'Second Admin')
    await userEvent.type(within(createForm!).getByLabelText('מייל'), 'second.admin@test.local')
    await userEvent.type(within(createForm!).getByLabelText('סיסמה ראשונית'), 'Admin123!')
    await userEvent.selectOptions(within(createForm!).getByLabelText('תפקיד'), 'Admin')

    expect(within(createForm!).queryByLabelText('Piano')).not.toBeInTheDocument()
    await userEvent.click(within(createForm!).getByRole('button', { name: 'יצירת משתמש' }))

    expect(createAdminUser).toHaveBeenCalledWith({
      fullName: 'Second Admin',
      email: 'second.admin@test.local',
      password: 'Admin123!',
      role: 'Admin',
      isActive: true,
      instrumentIds: [],
    })
  })

  it('edits user details and keeps teacher instrument assignments updated', async () => {
    renderUsersPage()

    await screen.findByText('Teacher')
    const teacherRow = screen.getByText('teacher@test.local').closest('tr')
    expect(teacherRow).not.toBeNull()
    await userEvent.click(within(teacherRow!).getByRole('button', { name: 'עריכה' }))
    const editingRow = screen.getByDisplayValue('teacher@test.local').closest('tr')
    expect(editingRow).not.toBeNull()
    const fullNameInput = within(editingRow!).getByDisplayValue('Teacher')
    const emailInput = within(editingRow!).getByDisplayValue('teacher@test.local')

    await userEvent.clear(fullNameInput)
    await userEvent.type(fullNameInput, 'Teacher Updated')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'teacher.updated@test.local')
    await userEvent.click(within(editingRow!).getByLabelText('Violin'))
    await userEvent.click(within(editingRow!).getByRole('button', { name: 'שמירה' }))

    expect(updateAdminUser).toHaveBeenCalledWith(2, {
      fullName: 'Teacher Updated',
      email: 'teacher.updated@test.local',
      role: 'Teacher',
      isActive: true,
    })
    expect(updateAdminUserInstruments).toHaveBeenCalledWith(2, [1, 2])
    await expect(screen.findByText('המשתמש עודכן.')).resolves.toBeInTheDocument()
  })

  it('resets a user password', async () => {
    renderUsersPage()

    await screen.findByText('Teacher')
    const teacherRow = screen.getByText('teacher@test.local').closest('tr')
    expect(teacherRow).not.toBeNull()
    await userEvent.click(within(teacherRow!).getByRole('button', { name: 'איפוס סיסמה' }))
    await userEvent.type(screen.getByPlaceholderText('סיסמה חדשה'), 'Changed123!')
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(resetAdminUserPassword).toHaveBeenCalledWith(2, { newPassword: 'Changed123!' })
    await expect(screen.findByText('הסיסמה אופסה.')).resolves.toBeInTheDocument()
  })

  it('displays API error messages on the create page', async () => {
    vi.mocked(createAdminUser).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Email is already in use.' } },
    })
    renderUsersPage()

    await screen.findByText('Admin')
    await userEvent.click(screen.getByRole('link', { name: 'משתמש חדש' }))

    const createForm = (await screen.findByRole('button', { name: 'יצירת משתמש' })).closest('form')
    expect(createForm).not.toBeNull()

    await userEvent.type(within(createForm!).getByLabelText('שם מלא'), 'Duplicate')
    await userEvent.type(within(createForm!).getByLabelText('מייל'), 'admin@test.local')
    await userEvent.type(within(createForm!).getByLabelText('סיסמה ראשונית'), 'Teacher123!')
    await userEvent.click(within(createForm!).getByRole('button', { name: 'יצירת משתמש' }))

    expect(await screen.findByText('כתובת המייל כבר נמצאת בשימוש.')).toBeInTheDocument()
  })

  it('does not show instrument assignment controls when editing an admin user', async () => {
    renderUsersPage()

    await screen.findByText('Admin')
    const adminRow = screen.getByText('admin@test.local').closest('tr')
    expect(adminRow).not.toBeNull()
    await userEvent.click(within(adminRow!).getByRole('button', { name: 'עריכה' }))

    const editingRow = screen.getByDisplayValue('admin@test.local').closest('tr')
    expect(editingRow).not.toBeNull()
    expect(within(editingRow!).getByText('הכל לפי תפקיד')).toBeInTheDocument()
    expect(within(editingRow!).queryByLabelText('Piano')).not.toBeInTheDocument()
  })
})
