import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Settings, Save, Calendar } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/constants'
import type { School, SchoolYear } from '@/lib/types'

export default function SettingsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const { data: school, isLoading } = useQuery<School | null>({
    queryKey: ['school', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return null
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', profile.school_id)
        .maybeSingle()
      if (error) throw error
      return data as School | null
    },
    enabled: !!profile?.school_id,
  })

  const { data: years } = useQuery<SchoolYear[]>({
    queryKey: ['school-years', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as SchoolYear[]
    },
    enabled: !!profile?.school_id,
  })

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync form when school loads
  if (school && name === '' && school.name) {
    setName(school.name)
    setCity(school.city ?? '')
    setPhone(school.phone ?? '')
    setEmail(school.email ?? '')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id) return
    setSaving(true)
    const { error } = await supabase
      .from('schools')
      .update({ name, city, phone, email, updated_at: new Date().toISOString() })
      .eq('id', profile.school_id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['school'] })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
  }

  return (
    <div className="space-y-6">
      {/* School info */}
      <form onSubmit={handleSave} className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Informations de l'école</h3>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <img src="/schoolsafe-logo.jpg" alt="" className="w-16 h-16 rounded-xl object-cover" />
          <div>
            <p className="font-semibold text-slate-900">{school?.name}</p>
            <p className="text-sm text-slate-500">Code: {school?.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom de l'école</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Ville</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </button>
          {saved && <span className="text-sm text-success-600">Enregistré !</span>}
        </div>
      </form>

      {/* School years */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Années scolaires</h3>
        </div>
        {(years ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucune année scolaire.</p>
        ) : (
          <div className="space-y-2">
            {(years ?? []).map((y) => (
              <div key={y.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{y.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(y.start_date)} — {formatDate(y.end_date)}</p>
                </div>
                {y.is_current && <span className="badge bg-success-100 text-success-700">Année active</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
