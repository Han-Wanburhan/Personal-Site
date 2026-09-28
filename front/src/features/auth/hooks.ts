import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { api, isUnauthorized } from '../../lib/api'
import { clearToken, getToken, setToken } from '../../lib/token'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './types'

export const meKey = ['me'] as const

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api<User>('/me'),
    enabled: getToken() !== null,
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => !isUnauthorized(err) && count < 1,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ remember, ...body }: LoginRequest & { remember: boolean }) =>
      api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }).then(
        (res) => ({ res, remember }),
      ),
    onSuccess: ({ res, remember }) => {
      setToken(res.access_token, remember)
      queryClient.setQueryData(meKey, res.user)
    },
  })
}

// Register returns the new user but no token; the caller logs in afterwards.
export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      api<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return () => {
    clearToken()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}
