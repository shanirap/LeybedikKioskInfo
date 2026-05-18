import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/useAuth'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  allowedRoles?: Array<'Admin' | 'Teacher'>
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
