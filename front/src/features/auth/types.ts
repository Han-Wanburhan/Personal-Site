// Mirrors back/internal/dto/auth.go

export interface User {
  id: number
  email: string
  username: string
  phone: string
  created_at: string
}

export interface RegisterRequest {
  email: string
  username: string
  phone: string
  password: string
}

export interface LoginRequest {
  identifier: string // email, username or phone
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}
