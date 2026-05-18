// Shape of the JWT payload we care about (stored in memory + localStorage)
export interface AuthUser {
  token: string
  email: string
  fullName: string
  role: 'Admin' | 'Teacher'
  expiresAtUtc: string
}
