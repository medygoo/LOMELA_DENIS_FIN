import { useStaffList } from '@/hooks/useData'
import { Loader2, UserCog, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { formatDate, ROLE_LABELS, fullName, initials } from '@/lib/constants'
import type { Staff } from '@/lib/types'

export default function StaffPage() {
  const { data: staff, isLoading } = useStaffList()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{staff?.length ?? 0} membre(s) du personnel</p>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (staff ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <UserCog size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun membre du personnel enregistré.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(staff ?? []).map((member) => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>
      )}

      {showForm && <StaffForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

function StaffCard({ member }: { member: Staff }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
          {initials(member.first_name, member.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{fullName(member.first_name, member.last_name)}</p>
          <span className="badge bg-primary-50 text-primary-600 mt-0.5">{ROLE_LABELS[member.role] ?? member.role}</span>
        </div>
      </div>
      <div className="mt-4 text-xs text-slate-500 space-y-1">
        {member.email && <p>{member.email}</p>}
        {member.phone && <p>{member.phone}</p>}
        {member.hire_date && <p>Embauché le: {formatDate(member.hire_date)}</p>}
      </div>
    </div>
  )
}

function StaffForm({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('enseignant')
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id) return
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('staff').insert({
      school_id: profile.school_id,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      role,
      hire_date: hireDate || null,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['staff'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Ajouter un membre du personnel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="enseignant">Enseignant</option>
              <option value="direction">Direction</option>
              <option value="admin_principal">Administrateur / Directeur</option>
              <option value="administratif">Personnel administratif</option>
              <option value="service">Personnel de service</option>
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Date d'embauche</label>
            <input type="date" className="input" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </div>
          {error && <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{error}</p>}
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
