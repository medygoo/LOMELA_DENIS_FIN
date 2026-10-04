import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, School, UserRole } from '@/lib/types'

interface SignInResult {
  error: string | null
  needsVerification?: boolean
  needsPasswordChange?: boolean
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  school: School | null
  roles: string[]
  loading: boolean
  needsEmailVerification: boolean
  needsPasswordChange: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signInWithPhone: (phone: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '')
  if (p.startsWith('0')) {
    p = '+243' + p.substring(1)
  }
  if (!p.startsWith('+')) {
    p = '+243' + p
  }
  return p
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)

  async function fetchUserRoles(userId: string, schoolId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .eq('is_active', true)
    if (!error && data) {
      setRoles(data.map((r: { role: string }) => r.role))
    } else {
      setRoles([])
    }
  }

  async function fetchProfileAndSchool(userId: string) {
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profError || !prof) {
      setProfile(null)
      setSchool(null)
      setRoles([])
      setLoading(false)
      return null
    }

    const p = prof as Profile
    setProfile(p)

    if (p.school_id) {
      const { data: sch } = await supabase
        .from('schools')
        .select('*')
        .eq('id', p.school_id)
        .maybeSingle()
      setSchool(sch as School | null)

      await fetchUserRoles(userId, p.school_id)
    }

    setLoading(false)
    return p
  }

  async function refreshProfile() {
    if (session?.user) {
      const p = await fetchProfileAndSchool(session.user.id)
      if (p?.must_change_password) {
        setNeedsPasswordChange(true)
      } else {
        setNeedsPasswordChange(false)
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        (async () => {
          const p = await fetchProfileAndSchool(session.user.id)
          if (p?.must_change_password) {
            setNeedsPasswordChange(true)
          }
        })()
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess?.user) {
        (async () => {
          const p = await fetchProfileAndSchool(sess.user.id)
          if (p?.must_change_password) {
            setNeedsPasswordChange(true)
          } else {
            setNeedsPasswordChange(false)
          }
        })()
      } else {
        setProfile(null)
        setSchool(null)
        setRoles([])
        setNeedsPasswordChange(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function postSignInChecks(data: { user: { id: string; email_confirmed_at?: string | null } }): Promise<SignInResult> {
    const p = await fetchProfileAndSchool(data.user.id)
    if (!p) return { error: 'Profil introuvable. Contactez l\'administrateur de votre école.' }

    if (!p.email_verified && data.user.email_confirmed_at) {
      await supabase.from('profiles').update({ email_verified: true }).eq('id', data.user.id)
      p.email_verified = true
    }

    if (!p.email_verified) {
      setNeedsEmailVerification(true)
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setSchool(null)
      setRoles([])
      return { error: null, needsVerification: true }
    }

    if (!p.is_active) {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setSchool(null)
      setRoles([])
      return { error: 'Votre compte est désactivé. Contactez l\'administrateur de votre école.' }
    }

    if (p.school_id) {
      const { data: sch } = await supabase
        .from('schools')
        .select('status')
        .eq('id', p.school_id)
        .maybeSingle()
      if (sch?.status === 'suspended') {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setSchool(null)
        setRoles([])
        return { error: 'Votre école est suspendue. Contactez le support.' }
      }
    }

    if (p.must_change_password) {
      setNeedsPasswordChange(true)
      return { error: null, needsPasswordChange: true }
    }

    setNeedsEmailVerification(false)
    setNeedsPasswordChange(false)
    return { error: null }
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return { error: null, needsVerification: true }
      }
      return { error: error.message }
    }
    return postSignInChecks(data)
  }

  async function signInWithPhone(phone: string, password: string): Promise<SignInResult> {
    const normalizedPhone = normalizePhone(phone)
    const { error, data } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password,
    })
    if (error) {
      return { error: error.message }
    }
    return postSignInChecks(data)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
    setSchool(null)
    setRoles([])
    setNeedsEmailVerification(false)
    setNeedsPasswordChange(false)
  }

  return (
    <AuthContext.Provider value={{
      session, profile, school, roles, loading,
      needsEmailVerification, needsPasswordChange,
      signIn, signInWithPhone, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function hasRole(profile: Profile | null, ...roles: UserRole[]): boolean {
  if (!profile) return false
  return roles.includes(profile.role)
}

export function hasAnyRole(roles: string[], ...checkRoles: UserRole[]): boolean {
  if (!roles || roles.length === 0) return false
  return checkRoles.some(r => roles.includes(r))
}
