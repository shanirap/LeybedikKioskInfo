import type { AuthUser } from '../types/auth'
import type { AdminUserDto, AuditLogDto, InstrumentDto, MaterialDto } from '../types/material'

export const teacherUser: AuthUser = {
  fullName: 'Teacher',
  email: 'teacher@test.local',
  role: 'Teacher',
  token: 'teacher-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
}

export const adminUser: AuthUser = {
  fullName: 'Admin',
  email: 'admin@test.local',
  role: 'Admin',
  token: 'admin-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
}

export const instruments: InstrumentDto[] = [
  { id: 1, name: 'Piano', isActive: true },
  { id: 2, name: 'Violin', isActive: true },
]

export const materials: MaterialDto[] = [
  {
    id: 1,
    title: 'Rhythm Basics',
    description: 'Clapping practice',
    instrumentId: 1,
    instrumentName: 'Piano',
    uploadedByName: 'Teacher',
    fileName: 'rhythm.pdf',
    status: 'Approved',
    downloadCount: 2,
    likeCount: 3,
    isLikedByCurrentUser: false,
    createdAtUtc: '2026-01-01T12:00:00Z',
    approvedAtUtc: '2026-01-02T12:00:00Z',
  },
  {
    id: 2,
    title: 'String Warmup',
    description: 'Slow bowing',
    instrumentId: 2,
    instrumentName: 'Violin',
    uploadedByName: 'Other Teacher',
    fileName: 'strings.pdf',
    status: 'Pending',
    downloadCount: 0,
    likeCount: 1,
    isLikedByCurrentUser: true,
    createdAtUtc: '2026-01-03T12:00:00Z',
    approvedAtUtc: null,
  },
]

export const adminUsers: AdminUserDto[] = [
  {
    id: 1,
    fullName: 'Admin',
    email: 'admin@test.local',
    role: 'Admin',
    isActive: true,
    instruments: [],
  },
  {
    id: 2,
    fullName: 'Teacher',
    email: 'teacher@test.local',
    role: 'Teacher',
    isActive: true,
    instruments: [instruments[0]],
  },
]

export const auditLogs: AuditLogDto[] = [
  {
    id: 1,
    actorUserId: 1,
    actorName: 'Admin',
    action: 'ApproveMaterial',
    entityType: 'Material',
    entityId: 1,
    details: 'Approved Rhythm Basics',
    createdAtUtc: '2026-01-04T12:00:00Z',
  },
]
