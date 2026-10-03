import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, Role } from '../types'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, role: Role, schoolId: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profile load error:', error)
      return null
    }
    return data as Profile | null
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        loadProfile(session.user.id).then((profile) => {
          if (!mounted) return
          setUser(profile)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      ;(async () => {
        if (session) {
          const profile = await loadProfile(session.user.id)
          setUser(profile)
        } else {
          setUser(null)
        }
        setLoading(false)
      })()
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  }

  async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    role: Role,
    schoolId: string
  ): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          school_id: schoolId,
          role,
        },
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          school_id: schoolId,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          role,
          is_active: true,
        })

      if (profileError) {
        return { error: profileError.message }
      }
    }

    return { error: null }
  }

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const profile = await loadProfile(session.user.id)
      setUser(profile)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
