export interface InstrumentDto {
  id: number
  name: string
  isActive: boolean
}

export interface MaterialDto {
  id: number
  title: string
  description: string | null
  instrumentId: number
  instrumentName: string
  uploadedByName: string
  fileName: string
  status: 'Pending' | 'Approved' | 'Rejected'
  downloadCount: number
  likeCount: number
  isLikedByCurrentUser: boolean
  createdAtUtc: string
  approvedAtUtc: string | null
}

export interface AdminUserDto {
  id: number
  fullName: string
  email: string
  role: 'Admin' | 'Teacher'
  isActive: boolean
  instruments: InstrumentDto[]
}

export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  role: 'Admin' | 'Teacher'
  isActive: boolean
  instrumentIds: number[]
}

export interface UpdateUserRequest {
  fullName: string
  email: string
  role: 'Admin' | 'Teacher'
  isActive: boolean
}

export interface ResetPasswordRequest {
  newPassword: string
}

export interface CreateInstrumentRequest {
  name: string
  isActive: boolean
}

export interface UpdateInstrumentRequest {
  name: string
  isActive: boolean
}

export interface AuditLogDto {
  id: number
  actorUserId: number
  actorName: string
  action: string
  entityType: string
  entityId: number | null
  details: string | null
  createdAtUtc: string
}
