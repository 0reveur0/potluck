'use client'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { SessionUser } from './types'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  signUp: (email: string, password: string, displayName: string, avatarEmoji?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    avatarEmoji = '🧑‍🍳'
  ): Promise<{ error: string | null }> => {
    try {
      const data = await api.post<{ user: SessionUser }>('/api/auth/register', {
        email, password, displayName, avatarEmoji,
      })
      setUser(data.user)
      return { error: null }
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const data = await api.post<{ user: SessionUser }>('/api/auth/login', { email, password })
      setUser(data.user)
      return { error: null }
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

  const signOut = async () => {
    try { await api.post('/api/auth/logout', {}) } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
