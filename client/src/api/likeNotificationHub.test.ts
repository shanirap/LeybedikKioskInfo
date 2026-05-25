import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLikeNotificationHubUrl, getStoredAuthToken } from './likeNotificationHub'
import { teacherUser } from '../test/fixtures'

describe('likeNotificationHub helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('uses the same origin hub path when API base is relative', () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api')

    expect(getLikeNotificationHubUrl()).toBe('/hubs/likes')
  })

  it('maps an absolute API base URL to the likes hub URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5000/api')

    expect(getLikeNotificationHubUrl()).toBe('http://localhost:5000/hubs/likes')
  })

  it('reads the stored auth token from localStorage', () => {
    localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))

    expect(getStoredAuthToken()).toBe('teacher-token')
  })

  it('returns null when auth is missing or invalid', () => {
    expect(getStoredAuthToken()).toBeNull()
    localStorage.setItem('leybedik_auth', '{not-json')
    expect(getStoredAuthToken()).toBeNull()
  })
})
