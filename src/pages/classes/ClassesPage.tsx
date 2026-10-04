import { useClasses, useStudents } from '@/hooks/useData'
import { useAuth, hasRole } from '@/hooks/useAuth'
import { GraduationCap, Loader2, Plus, X, Users } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/constants'
import type { ClassRoom } from '@/lib/types'

export default function ClassesPage() {
  const { profile } = useAuth()
  const { data: classes, isLoading } = useClasses()
  const canEdit = hasRole(profile, 'admin_principal', 'direction')
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{classes?.length ?? 0} classe(s)</p>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} />
            Nouvelle classe
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : (classes ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucune classe créée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(classes ?? []).map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}

      {showForm && <ClassForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

function ClassCard({ cls }: { cls: ClassRoom }) {
  const { data: students } = useStudents()
  const count = (students ?? []).filter((s) => s.is_active).length

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{cls.name}</p>
            <p className="text-xs text-slate-500">{cls.level ?? 'Niveau non défini'}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={14} />
          {count} élève(s)
        </span>
        {cls.room && <span>Salle: {cls.room}</span>}
        <span>Capacité: {cls.capacity}</span>
      </div>
    </div>
  )
}

function ClassForm({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [room, setRoom] = useState('')
  const [capacity, setCapacity] = useState('30')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id) return

    const { data: year } = await supabase
      .from('school_years')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('is_current', true)
      .maybeSingle()

    if (!year) {
      setError('Aucune année scolaire active. Créez-en une dans les paramètres.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      school_id: profile.school_id,
      school_year_id: year.id,
      name,
      level: level || null,
      room: room || null,
      capacity: parseInt(capacity) || 30,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['classes'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Nouvelle classe</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nom de la classe *</label>
            <input className="input" placeholder="ex: 6ème A" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Niveau</label>
            <input className="input" placeholder="ex: Collège" value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Salle</label>
              <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            <div>
              <label className="label">Capacité</label>
              <input type="number" className="input" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
