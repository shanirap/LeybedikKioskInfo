import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiClient, getApiErrorMessage } from './apiClient'
import { teacherUser } from '../test/fixtures'

describe('apiClient', () => {
  it('adds the stored JWT token to outgoing requests', async () => {
    localStorage.setItem('leybedik_auth', JSON.stringify(teacherUser))
    const capturedConfigs: InternalAxiosRequestConfig[] = []

    await apiClient.get('/secure', {
      adapter: async (config) => {
        capturedConfigs.push(config)
        return {
          data: null,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        } satisfies AxiosResponse
      },
    })

    expect(capturedConfigs[0]?.headers.Authorization).toBe('Bearer teacher-token')
  })

  it('translates server message responses into Hebrew messages', () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: 'Invalid email or password.' } },
    }

    expect(getApiErrorMessage(error, 'fallback')).toBe('כתובת המייל או הסיסמה אינם נכונים.')
  })

  it('uses problem details and fallback messages when no known server message exists', () => {
    const problemError = {
      isAxiosError: true,
      response: { data: { title: 'Custom validation error' } },
    }

    expect(getApiErrorMessage(problemError, 'fallback')).toBe('Custom validation error')
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})
