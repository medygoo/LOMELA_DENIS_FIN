import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, School, UserRole } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  school: School | null
  loading: boolean
  needsEmailVerification: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)

  async function fetchProfileAndSchool(userId: string) {
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profError || !prof) {
      setProfile(null)
      setSchool(null)
      setLoading(false)
      return null
    }

    const p = prof as Profile
    setProfile(p)

    // Fetch school
    if (p.school_id) {
      const { data: sch } = await supabase
        .from('schools')
        .select('*')
        .eq('id', p.school_id)
        .maybeSingle()
      setSchool(sch as School | null)
    }

    setLoading(false)
    return p
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfileAndSchool(session.user.id)
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
          await fetchProfileAndSchool(sess.user.id)
        })()
      } else {
        setProfile(null)
        setSchool(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    // Fetch profile to check email_verified and is_active
    const p = await fetchProfileAndSchool(data.user.id)
    if (!p) return { error: 'Profil introuvable. Contactez l\'administrateur de votre école.' }

    if (!p.email_verified) {
      setNeedsEmailVerification(true)
      // Sign out — user must verify first
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setSchool(null)
      return { error: null, needsVerification: true }
    }

    if (!p.is_active) {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setSchool(null)
      return { error: 'Votre compte est désactivé. Contactez l\'administrateur de votre école.' }
    }

    // Check school status
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
        return { error: 'Votre école est suspendue. Contactez le support.' }
      }
    }

    setNeedsEmailVerification(false)
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
    setSchool(null)
    setNeedsEmailVerification(false)
  }

  return (
    <AuthContext.Provider value={{ session, profile, school, loading, needsEmailVerification, signIn, signOut }}>
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
