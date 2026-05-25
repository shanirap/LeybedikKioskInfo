import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

const STORAGE_KEY = 'leybedik_auth'

export function createLikeNotificationConnection() {
  return new HubConnectionBuilder()
    .withUrl(getLikeNotificationHubUrl(), {
      accessTokenFactory: () => getStoredAuthToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}

export function getLikeNotificationHubUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    const url = new URL(apiBaseUrl)
    url.pathname = '/hubs/likes'
    url.search = ''
    url.hash = ''
    return url.toString()
  }

  return '/hubs/likes'
}

export function getStoredAuthToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const auth = JSON.parse(raw) as { token?: string }
    return auth.token ?? null
  } catch {
    return null
  }
}
