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
  uploadedByEmail: string
  level: 'Beginner' | 'Advanced'
  fileName: string
  status: 'Pending' | 'Approved' | 'Rejected'
  downloadCount: number
  likeCount: number
  isLikedByCurrentUser: boolean
  createdAtUtc: string
  approvedAtUtc: string | null
  rejectedAtUtc: string | null
  rejectionReason: string | null
  fileSizeBytes: number | null
  fileHashSha256: string | null
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface AdminUserDto {
  id: number
  fullName: string
  email: string
  role: 'Admin' | 'Teacher'
  isActive: boolean
  instruments: InstrumentDto[]
  totalLikesReceived: number
  totalUniqueDownloadsReceived: number
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

export interface TeacherWalletMaterialDto {
  materialId: number
  title: string
  instrumentName: string
  status: MaterialDto['status']
  likesCount: number
  uniqueDownloadsCount: number
}

export interface TeacherWalletDto {
  totalLikes: number
  totalUniqueDownloads: number
  totalMaterials: number
  materials: TeacherWalletMaterialDto[]
}
