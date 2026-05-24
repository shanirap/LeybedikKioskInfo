import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import { login } from './authApi'
import { teacherUser } from '../test/fixtures'

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('auth API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('posts credentials to the login endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: teacherUser })

    await expect(
      login({ email: 'teacher@test.local', password: 'Teacher123!' }),
    ).resolves.toBe(teacherUser)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'teacher@test.local',
      password: 'Teacher123!',
    })
  })
})
