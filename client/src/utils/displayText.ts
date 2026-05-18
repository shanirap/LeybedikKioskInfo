import type { AuthUser } from '../types/auth'
import type { MaterialDto } from '../types/material'

export const APP_TITLE = 'לייבעדיק'
export const APP_TAGLINE = 'נגינה, שמחה, חינוך'
export const INSTITUTION_LOGO_SRC = '/brand/institution-logo.png'

const roleLabels: Record<AuthUser['role'], string> = {
  Admin: 'מנהל',
  Teacher: 'מורה',
}

const statusLabels: Record<MaterialDto['status'], string> = {
  Pending: 'ממתין לאישור',
  Approved: 'מאושר',
  Rejected: 'נדחה',
}

const auditActionLabels: Record<string, string> = {
  ApproveMaterial: 'אישור חומר',
  RejectMaterial: 'דחיית חומר',
  CreateUser: 'יצירת משתמש',
  UpdateUser: 'עדכון משתמש',
  UpdateUserInstruments: 'עדכון שיוך כלים למורה',
  ResetUserPassword: 'איפוס סיסמת משתמש',
  CreateInstrument: 'יצירת כלי',
  UpdateInstrument: 'עדכון כלי',
}

const entityTypeLabels: Record<string, string> = {
  Material: 'חומר',
  User: 'משתמש',
  Instrument: 'כלי נגינה',
}

export function formatRole(role: AuthUser['role']) {
  return roleLabels[role] ?? role
}

export function formatStatus(status: MaterialDto['status']) {
  return statusLabels[status] ?? status
}

export function formatAuditAction(action: string) {
  return auditActionLabels[action] ?? action
}

export function formatEntityType(entityType: string) {
  return entityTypeLabels[entityType] ?? entityType
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('he-IL')
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('he-IL')
}
