import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changePassword } from '../api/accountApi'
import { teacherUser } from '../test/fixtures'
import { AuthProvider } from '../utils/AuthContext'
import { AccountPage } from './AccountPage'

vi.mock('../api/accountApi', () => ({
  changePassword: vi.fn(),
}))

describe('AccountPage', () => {
  beforeEach(() => {
    vi.mocked(changePassword).mockReset()
    localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))
  })

  it('shows profile data and blocks mismatched password confirmation', async () => {
    render(
      <AuthProvider>
        <AccountPage />
      </AuthProvider>,
    )

    expect(screen.getByText('Teacher')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('סיסמה נוכחית'), 'Teacher123!')
    await userEvent.type(screen.getByLabelText('סיסמה חדשה'), 'NewPassword123!')
    await userEvent.type(screen.getByLabelText('אימות סיסמה חדשה'), 'Different123!')
    await userEvent.click(screen.getByRole('button', { name: 'עדכון סיסמה' }))

    expect(screen.getByText('הסיסמאות החדשות אינן תואמות.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('submits matching password changes and clears the form', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined)
    render(
      <AuthProvider>
        <AccountPage />
      </AuthProvider>,
    )

    await userEvent.type(screen.getByLabelText('סיסמה נוכחית'), 'Teacher123!')
    await userEvent.type(screen.getByLabelText('סיסמה חדשה'), 'NewPassword123!')
    await userEvent.type(screen.getByLabelText('אימות סיסמה חדשה'), 'NewPassword123!')
    await userEvent.click(screen.getByRole('button', { name: 'עדכון סיסמה' }))

    await waitFor(() => expect(screen.getByText('הסיסמה עודכנה בהצלחה.')).toBeInTheDocument())
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'Teacher123!',
      newPassword: 'NewPassword123!',
    })
    expect(screen.getByLabelText('סיסמה נוכחית')).toHaveValue('')
  })
})
