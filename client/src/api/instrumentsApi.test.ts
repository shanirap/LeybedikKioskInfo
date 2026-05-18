import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import {
  createAdminInstrument,
  createAdminUser,
  getAdminInstruments,
  getAdminUsers,
  getInstruments,
  resetAdminUserPassword,
  updateAdminInstrument,
  updateAdminUser,
  updateAdminUserInstruments,
} from './instrumentsApi'
import { adminUsers, instruments } from '../test/fixtures'

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('user and instrument API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.put).mockReset()
  })

  it('loads visible and admin-only resources from the expected endpoints', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: instruments })
      .mockResolvedValueOnce({ data: adminUsers })
      .mockResolvedValueOnce({ data: instruments })

    await expect(getInstruments()).resolves.toBe(instruments)
    await expect(getAdminUsers()).resolves.toBe(adminUsers)
    await expect(getAdminInstruments()).resolves.toBe(instruments)

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/instruments')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/admin/users')
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/admin/instruments')
  })

  it('sends admin mutations to the expected endpoints and payloads', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: adminUsers[1] })
    vi.mocked(apiClient.put).mockResolvedValue({ data: adminUsers[1] })

    await createAdminUser({
      fullName: 'New Teacher',
      email: 'new@test.local',
      password: 'Teacher123!',
      role: 'Teacher',
      isActive: true,
      instrumentIds: [1],
    })
    await updateAdminUser(2, {
      fullName: 'Teacher Updated',
      email: 'teacher@test.local',
      role: 'Teacher',
      isActive: false,
    })
    await updateAdminUserInstruments(2, [1, 2])
    await resetAdminUserPassword(2, { newPassword: 'Changed123!' })
    await createAdminInstrument({ name: 'Flute', isActive: true })
    await updateAdminInstrument(1, { name: 'Piano', isActive: false })

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/admin/users', {
      fullName: 'New Teacher',
      email: 'new@test.local',
      password: 'Teacher123!',
      role: 'Teacher',
      isActive: true,
      instrumentIds: [1],
    })
    expect(apiClient.put).toHaveBeenNthCalledWith(1, '/admin/users/2', {
      fullName: 'Teacher Updated',
      email: 'teacher@test.local',
      role: 'Teacher',
      isActive: false,
    })
    expect(apiClient.put).toHaveBeenNthCalledWith(2, '/admin/users/2/instruments', {
      instrumentIds: [1, 2],
    })
    expect(apiClient.put).toHaveBeenNthCalledWith(3, '/admin/users/2/password', {
      newPassword: 'Changed123!',
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/admin/instruments', {
      name: 'Flute',
      isActive: true,
    })
    expect(apiClient.put).toHaveBeenNthCalledWith(4, '/admin/instruments/1', {
      name: 'Piano',
      isActive: false,
    })
  })
})
