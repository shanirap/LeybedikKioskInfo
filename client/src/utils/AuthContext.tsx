import { useState, type ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { AuthContext } from './authContextValue'

const STORAGE_KEY = 'leybedik_auth'

function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    // Discard expired tokens immediately
    if (new Date(parsed.expiresAtUtc) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadFromStorage)

  function login(authUser: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
