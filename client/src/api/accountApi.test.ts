import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import { changePassword } from './accountApi'

vi.mock('./apiClient', () => ({
  apiClient: {
    put: vi.fn(),
  },
}))

describe('account API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset()
  })

  it('sends password change requests to the account endpoint', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({})

    await changePassword({
      currentPassword: 'Teacher123!',
      newPassword: 'NewPassword123!',
    })

    expect(apiClient.put).toHaveBeenCalledWith('/account/password', {
      currentPassword: 'Teacher123!',
      newPassword: 'NewPassword123!',
    })
  })
})
