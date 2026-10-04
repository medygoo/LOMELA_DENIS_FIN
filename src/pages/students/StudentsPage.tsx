import { useState } from 'react'
import { useStudents } from '@/hooks/useData'
import { useAuth, hasRole } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { formatDate, fullName, initials } from '@/lib/constants'
import type { Student } from '@/lib/types'
import { Search, Plus, Loader2, X, UserPlus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function StudentsPage() {
  const { profile } = useAuth()
  const { data: students, isLoading } = useStudents()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const canEdit = hasRole(profile, 'admin_principal', 'direction', 'enseignant')

  const filtered = (students ?? []).filter((s) => {
    const q = search.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.enrollment_number ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher un élève..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} />
            Inscrire un élève
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">Aucun élève trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}

      {showForm && <StudentForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

function StudentCard({ student }: { student: Student }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {student.photo_url ? (
          <img src={student.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
            {initials(student.first_name, student.last_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            {fullName(student.first_name, student.last_name)}
          </p>
          <p className="text-xs text-slate-500">
            {student.enrollment_number ?? 'Pas de matricule'}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-400">Naissance</span>
          <p className="text-slate-700">{formatDate(student.birth_date)}</p>
        </div>
        <div>
          <span className="text-slate-400">Inscrit le</span>
          <p className="text-slate-700">{formatDate(student.enrollment_date)}</p>
        </div>
      </div>
    </div>
  )
}

function StudentForm({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id) return
    setSaving(true)
    setError(null)

    const enrollmentNumber = `EL${Date.now().toString().slice(-6)}`

    const { error } = await supabase.from('students').insert({
      school_id: profile.school_id,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
      gender: gender || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      enrollment_number: enrollmentNumber,
      enrollment_date: new Date().toISOString().slice(0, 10),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['students'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <UserPlus size={20} />
            Inscription d'un élève
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Date de naissance</label>
              <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Sexe</label>
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Ville</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
