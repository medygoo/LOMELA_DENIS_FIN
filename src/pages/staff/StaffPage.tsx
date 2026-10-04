import { useSchoolProfiles, useUserRoles } from '@/hooks/useData'
import { Loader2, UserCog, Plus, X, KeyRound, Edit3, Power, PowerOff, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { formatDate, ROLE_LABELS, ROLE_COLORS, fullName, initials, ALL_ROLES } from '@/lib/constants'
import type { Profile } from '@/lib/types'

export default function StaffPage() {
  const { data: profiles, isLoading } = useSchoolProfiles()
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [showRolesModal, setShowRolesModal] = useState<Profile | null>(null)
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ label: string; password: string } | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{profiles?.length ?? 0} membre(s) du personnel</p>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (profiles ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <UserCog size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun membre du personnel enregistré.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profiles ?? []).map((member) => (
            <ProfileCard
              key={member.id}
              member={member}
              onEdit={() => setEditingProfile(member)}
              onManageRoles={() => setShowRolesModal(member)}
              onResetPassword={() => handleResetPassword(member, setTempPasswordInfo)}
              onToggleActive={() => handleToggleActive(member)}
            />
          ))}
        </div>
      )}

      {showForm && <CreateUserForm onClose={() => setShowForm(false)} onCreated={(label, pw) => setTempPasswordInfo({ label, password: pw })} />}
      {editingProfile && <EditProfileForm profile={editingProfile} onClose={() => setEditingProfile(null)} />}
      {showRolesModal && <RolesModal profile={showRolesModal} onClose={() => setShowRolesModal(null)} />}
      {tempPasswordInfo && <TempPasswordModal info={tempPasswordInfo} onClose={() => setTempPasswordInfo(null)} />}
    </div>
  )
}

async function handleResetPassword(profile: Profile, setInfo: (info: { label: string; password: string }) => void) {
  if (!confirm(`Réinitialiser le mot de passe de ${profile.first_name} ${profile.last_name} ?`)) return

  const { data: session } = await supabase.auth.getSession()
  const token = session?.session?.access_token
  if (!token) return

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: profile.id }),
  })
  const data = await res.json()
  if (data.temporaryPassword) {
    const label = data.email || data.phone || profile.first_name
    setInfo({ label, password: data.temporaryPassword })
  } else {
    alert(data.error || 'Erreur lors de la réinitialisation')
  }
}

async function handleToggleActive(profile: Profile) {
  const action = profile.is_active ? 'désactiver' : 'réactiver'
  if (!confirm(`Voulez-vous ${action} le compte de ${profile.first_name} ${profile.last_name} ?`)) return

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: !profile.is_active })
    .eq('id', profile.id)

  if (error) {
    alert(error.message)
    return
  }

  await supabase
    .from('staff')
    .update({ is_active: !profile.is_active })
    .eq('user_id', profile.id)

  await supabase.rpc('audit_action', {
    p_action: profile.is_active ? 'user_deactivated' : 'user_activated',
    p_entity_type: 'profile',
    p_entity_id: profile.id,
    p_details: { name: `${profile.first_name} ${profile.last_name}` },
  })

  window.location.reload()
}

function ProfileCard({
  member,
  onEdit,
  onManageRoles,
  onResetPassword,
  onToggleActive,
}: {
  member: Profile
  onEdit: () => void
  onManageRoles: () => void
  onResetPassword: () => void
  onToggleActive: () => void
}) {
  const { data: roles } = useUserRoles(member.id)
  const activeRoles = (roles ?? []).filter(r => r.is_active).map(r => r.role)

  return (
    <div className={`card p-5 ${!member.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
          {initials(member.first_name, member.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{fullName(member.first_name, member.last_name)}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {activeRoles.map((role) => (
              <span key={role} className={`badge ${ROLE_COLORS[role] ?? ''} text-[11px]`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 space-y-1">
        {member.email && <p>{member.email}</p>}
        {member.phone && <p>{member.phone}</p>}
        {member.function && <p>Fonction: {member.function}</p>}
        {member.matricule && <p>Matricule: {member.matricule}</p>}
        {member.hire_date && <p>Entrée le: {formatDate(member.hire_date)}</p>}
        <p>Statut: {member.is_active ? 'Actif' : 'Désactivé'}</p>
        {member.must_change_password && <p className="text-amber-600">Changement de mot de passe requis</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onEdit} className="btn-secondary-sm" title="Modifier">
          <Edit3 size={14} /> Modifier
        </button>
        <button onClick={onManageRoles} className="btn-secondary-sm" title="Rôles">
          <UserCog size={14} /> Rôles
        </button>
        <button onClick={onResetPassword} className="btn-secondary-sm" title="Réinitialiser mot de passe">
          <KeyRound size={14} /> Reset MDP
        </button>
        <button
          onClick={onToggleActive}
          className={member.is_active ? 'btn-secondary-sm text-error-600' : 'btn-secondary-sm text-success-600'}
          title={member.is_active ? 'Désactiver' : 'Réactiver'}
        >
          {member.is_active ? <PowerOff size={14} /> : <Power size={14} />}
          {member.is_active ? 'Désactiver' : 'Activer'}
        </button>
      </div>
    </div>
  )
}

function CreateUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: (label: string, password: string) => void }) {
  const { session } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [userFunction, setUserFunction] = useState('')
  const [matricule, setMatricule] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['enseignant'])

  function toggleRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (selectedRoles.length === 0) {
      setError('Au moins un rôle est obligatoire')
      setSaving(false)
      return
    }

    if (!email && !phone) {
      setError('Au moins un moyen de connexion est requis (email ou téléphone)')
      setSaving(false)
      return
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
          function: userFunction || undefined,
          matricule: matricule || undefined,
          hireDate: hireDate || undefined,
          roles: selectedRoles,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Erreur lors de la création')
        setSaving(false)
        return
      }

      qc.invalidateQueries({ queryKey: ['profiles'] })
      qc.invalidateQueries({ queryKey: ['staff'] })
      const label = data.email || data.phone || email || phone
      onCreated(label, data.temporaryPassword)
      setSaving(false)
      onClose()
    } catch {
      setError('Erreur réseau')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@ecole.edu" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 8XX XXX XXX" />
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Au moins un des deux (email ou téléphone) est obligatoire.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fonction</label>
              <input className="input" value={userFunction} onChange={(e) => setUserFunction(e.target.value)} placeholder="Ex: Directeur, Enseignant..." />
            </div>
            <div>
              <label className="label">Matricule interne</label>
              <input className="input" value={matricule} onChange={(e) => setMatricule(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Date d'entrée</label>
            <input type="date" className="input" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Rôles * (au moins un)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ALL_ROLES.map(role => (
                <label key={role} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Créer le compte
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditProfileForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [userFunction, setUserFunction] = useState(profile.function ?? '')
  const [matricule, setMatricule] = useState(profile.matricule ?? '')
  const [hireDate, setHireDate] = useState(profile.hire_date ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        function: userFunction || null,
        matricule: matricule || null,
        hire_date: hireDate || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }

    await supabase
      .from('staff')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        function: userFunction || null,
        matricule: matricule || null,
        hire_date: hireDate || null,
      })
      .eq('user_id', profile.id)

    await supabase.rpc('audit_action', {
      p_action: 'profile_updated',
      p_entity_type: 'profile',
      p_entity_id: profile.id,
      p_details: { name: `${firstName} ${lastName}` },
    })

    qc.invalidateQueries({ queryKey: ['profiles'] })
    qc.invalidateQueries({ queryKey: ['staff'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Modifier le dossier</h3>
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
            <label className="label">Téléphone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Fonction</label>
            <input className="input" value={userFunction} onChange={(e) => setUserFunction(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Matricule</label>
              <input className="input" value={matricule} onChange={(e) => setMatricule(e.target.value)} />
            </div>
            <div>
              <label className="label">Date d'entrée</label>
              <input type="date" className="input" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
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

function RolesModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { data: currentRoles, isLoading: rolesLoading } = useUserRoles(profile.id)
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // useEffect to sync roles when async data arrives
  useEffect(() => {
    if (currentRoles) {
      setSelectedRoles(currentRoles.filter(r => r.is_active).map(r => r.role))
    }
  }, [currentRoles])

  function toggleRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)

    if (selectedRoles.length === 0) {
      setError('Au moins un rôle est obligatoire. Impossible de laisser un compte sans rôle.')
      setSaving(false)
      return
    }

    // Delete all existing roles for this user in this school
    const { error: delError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', profile.id)
      .eq('school_id', profile.school_id)

    if (delError) {
      setError(delError.message)
      setSaving(false)
      return
    }

    // Insert new roles
    for (const role of selectedRoles) {
      const { error: insError } = await supabase.from('user_roles').upsert({
        user_id: profile.id,
        school_id: profile.school_id,
        role,
        is_active: true,
      })
      if (insError) {
        setError(insError.message)
        setSaving(false)
        return
      }
    }

    // Update primary role in profile
    await supabase
      .from('profiles')
      .update({ role: selectedRoles[0] })
      .eq('id', profile.id)

    await supabase
      .from('staff')
      .update({ role: selectedRoles[0] })
      .eq('user_id', profile.id)

    await supabase.rpc('audit_action', {
      p_action: 'roles_updated',
      p_entity_type: 'user_roles',
      p_entity_id: profile.id,
      p_details: { roles: selectedRoles },
    })

    qc.invalidateQueries({ queryKey: ['user-roles', profile.id] })
    qc.invalidateQueries({ queryKey: ['profiles'] })
    setSaving(false)
    onClose()
  }

  if (rolesLoading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 flex justify-center">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Gérer les rôles</h3>
            <p className="text-sm text-slate-500">{fullName(profile.first_name, profile.last_name)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className={`badge ${ROLE_COLORS[role] ?? ''}`}>
                {ROLE_LABELS[role]}
              </span>
            </label>
          ))}
          {error && <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TempPasswordModal({ info, onClose }: { info: { label: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copyPassword() {
    navigator.clipboard.writeText(info.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Mot de passe temporaire</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-2">
              Notez ce mot de passe temporaire. Il ne sera plus affiché après la fermeture de cette fenêtre.
            </p>
            <p className="text-sm text-amber-800">
              L'utilisateur devra le changer lors de sa première connexion.
            </p>
          </div>
          <div>
            <label className="label">Identifiant de connexion</label>
            <p className="text-sm text-slate-900 font-medium">{info.label}</p>
          </div>
          <div>
            <label className="label">Mot de passe temporaire</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm font-mono text-slate-900">
                {info.password}
              </code>
              <button onClick={copyPassword} className="btn-secondary-sm" title="Copier">
                {copied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary">J'ai noté, fermer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
