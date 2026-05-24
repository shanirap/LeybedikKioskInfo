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
  ActivateInstrument: 'הפעלת כלי',
  DeactivateInstrument: 'השבתת כלי',
  ReactivateUser: 'הפעלת משתמש',
  DeactivateUser: 'השבתת משתמש',
  LikeMaterial: 'הוספת לייק',
  UnlikeMaterial: 'הסרת לייק',
  DownloadMaterial: 'הורדת חומר',
  Login: 'התחברות למערכת',
}

const entityTypeLabels: Record<string, string> = {
  Material: 'חומר',
  User: 'משתמש',
  Instrument: 'כלי נגינה',
}

const auditDetailPatterns: Array<[RegExp, string]> = [
  [/^Approved material (.+)\.$/, 'אושר החומר: $1.'],
  [/^Rejected material (.+)\.$/, 'נדחה החומר: $1.'],
  [/^Uploaded material (.+)\.$/, 'הועלה החומר: $1.'],
  [/^Updated material (.+) before approval\.$/, 'עודכן חומר לפני אישור: $1.'],
  [/^Updated own material (.+)\.$/, 'עודכן החומר שלי: $1.'],
  [/^Archived material (.+)\.$/, 'הועבר לארכיון החומר: $1.'],
  [/^Archived own material (.+)\.$/, 'הועבר לארכיון החומר שלי: $1.'],
  [/^Restored material (.+)\.$/, 'שוחזר החומר: $1.'],
  [/^Created (Admin|Teacher) user (.+)\.$/, 'נוצר משתמש $1: $2.'],
  [/^Updated user (.+)\.$/, 'עודכן משתמש: $1.'],
  [/^Reactivated user (.+)\.$/, 'הופעל מחדש המשתמש: $1.'],
  [/^Deactivated user (.+)\.$/, 'הושבת המשתמש: $1.'],
  [/^Updated teacher instruments to: (.+)\.$/, 'עודכנו כלי הנגינה של המורה: $1.'],
  [/^Changed password for user (.+)\.$/, 'שונתה סיסמה למשתמש: $1.'],
  [/^Reset password for user (.+)\.$/, 'אופסה סיסמה למשתמש: $1.'],
  [/^Created instrument (.+)\.$/, 'נוצר כלי נגינה: $1.'],
  [/^Updated instrument (.+)\.$/, 'עודכן כלי נגינה: $1.'],
  [/^Activated instrument (.+)\.$/, 'הופעל כלי נגינה: $1.'],
  [/^Deactivated instrument (.+)\.$/, 'הושבת כלי נגינה: $1.'],
]

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

export function formatAuditDetails(details: string | null) {
  if (!details)
    return ''

  for (const [pattern, replacement] of auditDetailPatterns) {
    if (pattern.test(details))
      return details.replace(pattern, replacement)
  }

  return details
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
