import axios, { AxiosError } from 'axios'

const STORAGE_KEY = 'leybedik_auth'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
const serverMessageTranslations: Record<string, string> = {
  'Invalid email or password.': 'כתובת המייל או הסיסמה אינם נכונים.',
  'Email is already in use.': 'כתובת המייל כבר נמצאת בשימוש.',
  'Instrument name is already in use.': 'שם הכלי כבר נמצא בשימוש.',
  'Only teachers can have instrument assignments.': 'ניתן לשייך כלי נגינה למורים בלבד.',
  'Current password is incorrect.': 'הסיסמה הנוכחית אינה נכונה.',
  'File is required.': 'יש לבחור קובץ.',
  'File is too large. Maximum size is 50 MB.': 'הקובץ גדול מדי. הגודל המרבי הוא 50MB.',
  'File type is not allowed.': 'סוג הקובץ אינו מותר.',
  'File content type is not allowed.': 'תוכן הקובץ אינו תואם לסוג מותר.',
  'Stored file was not found.': 'הקובץ השמור לא נמצא.',
  'Could not upload material.': 'לא ניתן להעלות את החומר.',
  'Invalid request.': 'בקשה לא תקינה.',
  'One or more validation errors occurred.': 'אחד או יותר מהשדות אינם תקינים.',
  'An unexpected error occurred.': 'אירעה שגיאה בלתי צפויה.',
  'The server could not complete the request.': 'השרת לא הצליח להשלים את הבקשה.',
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
})

// Attach the JWT token to every request if one is stored
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const auth = JSON.parse(raw) as { token: string }
      config.headers.Authorization = `Bearer ${auth.token}`
    }
  } catch {
    // Ignore parse errors
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback

  const data = error.response?.data
  if (isMessageResponse(data)) return translateServerMessage(data.message)
  if (isProblemDetails(data)) {
    return translateServerMessage(data.detail ?? data.title ?? fallback)
  }

  return fallback
}

function translateServerMessage(message: string) {
  return serverMessageTranslations[message] ?? message
}

function isMessageResponse(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

function isProblemDetails(value: unknown): value is { title?: string; detail?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (('title' in value && typeof value.title === 'string') ||
      ('detail' in value && typeof value.detail === 'string'))
  )
}
