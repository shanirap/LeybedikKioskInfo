import { describe, expect, it } from 'vitest'
import {
  formatAuditAction,
  formatAuditDetails,
  formatDate,
  formatEntityType,
  formatMaterialLevel,
  formatRole,
  formatStatus,
} from './displayText'

describe('display text helpers', () => {
  it('formats known roles, material statuses, audit actions, and entity types', () => {
    expect(formatRole('Admin')).toBe('מנהל')
    expect(formatRole('Teacher')).toBe('מורה')
    expect(formatStatus('Pending')).toBe('ממתין לאישור')
    expect(formatStatus('Approved')).toBe('מאושר')
    expect(formatStatus('Rejected')).toBe('נדחה')
    expect(formatMaterialLevel('Beginner')).toBe('מתחילים')
    expect(formatMaterialLevel('Advanced')).toBe('מתקדמים')
    expect(formatAuditAction('ApproveMaterial')).toBe('אישור חומר')
    expect(formatAuditAction('ActivateInstrument')).toBe('הפעלת כלי')
    expect(formatAuditAction('DeactivateUser')).toBe('השבתת משתמש')
    expect(formatEntityType('Instrument')).toBe('כלי נגינה')
  })

  it('translates legacy English audit details to Hebrew', () => {
    expect(formatAuditDetails('Approved material Rhythm Basics.')).toBe('אושר החומר: Rhythm Basics.')
    expect(formatAuditDetails('Created Teacher user teacher@test.local.')).toBe(
      'נוצר משתמש Teacher: teacher@test.local.',
    )
    expect(formatAuditDetails('עודכן חומר מאושר: כותרת.')).toBe('עודכן חומר מאושר: כותרת.')
  })

  it('falls back to the original value for unknown audit metadata', () => {
    expect(formatAuditAction('CustomAction')).toBe('CustomAction')
    expect(formatEntityType('CustomEntity')).toBe('CustomEntity')
  })

  it('formats dates in the Hebrew locale', () => {
    expect(formatDate('2026-01-02T12:00:00Z')).toMatch(/2026|02|2/)
  })
})
