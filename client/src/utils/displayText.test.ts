import { describe, expect, it } from 'vitest'
import {
  formatAuditAction,
  formatDate,
  formatEntityType,
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
    expect(formatAuditAction('ApproveMaterial')).toBe('אישור חומר')
    expect(formatEntityType('Instrument')).toBe('כלי נגינה')
  })

  it('falls back to the original value for unknown audit metadata', () => {
    expect(formatAuditAction('CustomAction')).toBe('CustomAction')
    expect(formatEntityType('CustomEntity')).toBe('CustomEntity')
  })

  it('formats dates in the Hebrew locale', () => {
    expect(formatDate('2026-01-02T12:00:00Z')).toMatch(/2026|02|2/)
  })
})
