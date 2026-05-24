import type { AuthUser } from '../types/auth'
import type { MaterialDto } from '../types/material'

export const APP_TITLE = 'לייבעדיק'
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

const materialLevelLabels: Record<MaterialDto['level'], string> = {
  Beginner: 'מתחילים',
  Advanced: 'מתקדמים',
}

const auditActionLabels: Record<string, string> = {
  ApproveMaterial: 'אישור חומר',
  RejectMaterial: 'דחיית חומר',
  UploadMaterial: 'העלאת חומר',
  UpdateOwnMaterial: 'עדכון חומר',
  UpdateMaterialByAdmin: 'עריכת חומר (מנהל)',
  DeleteOwnMaterial: 'ארכוב חומר (מורה)',
  DeleteMaterialByAdmin: 'ארכוב חומר (מנהל)',
  RestoreMaterial: 'שחזור חומר',
  CreateUser: 'יצירת משתמש',
  UpdateUser: 'עדכון משתמש',
  UpdateUserInstruments: 'עדכון שיוך כלים למורה',
  ResetUserPassword: 'איפוס סיסמת משתמש',
  ChangePassword: 'שינוי סיסמה',
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

export function formatMaterialLevel(level: MaterialDto['level']) {
  return materialLevelLabels[level] ?? level
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
