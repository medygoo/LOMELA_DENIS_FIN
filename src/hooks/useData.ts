import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SchoolYear, ClassRoom, Student, Staff, Profile, UserRoleEntry } from '@/lib/types'

export function useCurrentSchoolYear() {
  const { profile } = useAuth()
  return useQuery<SchoolYear | null>({
    queryKey: ['current-school-year', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return null
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('is_current', true)
        .maybeSingle()
      if (error) throw error
      return data as SchoolYear | null
    },
    enabled: !!profile?.school_id,
  })
}

export function useStats() {
  const { profile } = useAuth()
  const schoolId = profile?.school_id

  return useQuery({
    queryKey: ['stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return null

      const [studentsRes, classesRes, staffRes, yearRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
        supabase.from('school_years').select('*').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
      ])

      return {
        students: studentsRes.count ?? 0,
        classes: classesRes.count ?? 0,
        staff: staffRes.count ?? 0,
        schoolYear: yearRes.data as SchoolYear | null,
      }
    },
    enabled: !!schoolId,
  })
}

export function useStudents() {
  const { profile } = useAuth()
  return useQuery<Student[]>({
    queryKey: ['students', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('last_name', { ascending: true })
      if (error) throw error
      return data as Student[]
    },
    enabled: !!profile?.school_id,
  })
}

export function useClasses() {
  const { profile } = useAuth()
  return useQuery<ClassRoom[]>({
    queryKey: ['classes', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data as ClassRoom[]
    },
    enabled: !!profile?.school_id,
  })
}

export function useStaffList() {
  const { profile } = useAuth()
  return useQuery<Staff[]>({
    queryKey: ['staff', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('last_name', { ascending: true })
      if (error) throw error
      return data as Staff[]
    },
    enabled: !!profile?.school_id,
  })
}

export function useSchoolProfiles() {
  const { profile } = useAuth()
  return useQuery<Profile[]>({
    queryKey: ['profiles', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('last_name', { ascending: true })
      if (error) throw error
      return data as Profile[]
    },
    enabled: !!profile?.school_id,
  })
}

export function useUserRoles(userId: string | undefined) {
  const { profile } = useAuth()
  return useQuery<UserRoleEntry[]>({
    queryKey: ['user-roles', userId, profile?.school_id],
    queryFn: async () => {
      if (!userId || !profile?.school_id) return []
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', profile.school_id)
      if (error) throw error
      return data as UserRoleEntry[]
    },
    enabled: !!userId && !!profile?.school_id,
  })
}
