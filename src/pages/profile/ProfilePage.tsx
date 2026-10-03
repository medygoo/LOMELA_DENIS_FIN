import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { School } from '../../types'
import { PageHeader } from '../../components/ui/DataTable'
import { User, Lock, Save, CheckCircle } from 'lucide-react'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const [school, setSchool] = useState<School | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    async function loadSchool() {
      if (!user) return
      const { data } = await supabase.from('schools').select('*').eq('id', user.school_id).maybeSingle()
      setSchool((data as School) || null)
    }
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
      })
      loadSchool()
    }
  }, [user])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    await supabase
      .from('profiles')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
      })
      .eq('id', user.id)
    await refreshProfile()
    setSavingProfile(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordMin'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'))
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  if (!user) return null

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.editProfile')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600">
              <User size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {user.last_name} {user.first_name}
              </h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label={t('common.phone')} value={user.phone} />
            <InfoRow label={t('profile.role')} value={t(`roles.${user.role}`, user.role)} />
            <InfoRow label={t('profile.school')} value={school?.name || '—'} />
            {school?.city && <InfoRow label={t('students.city')} value={school.city} />}
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} /> {t('profile.editProfile')}
          </h3>
          {profileSaved && (
            <div className="mb-4 rounded-xl bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-accent-700 flex items-center gap-2">
              <CheckCircle size={16} /> {t('common.saved')}
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('students.firstName')}>
                <input
                  className="input"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('students.lastName')}>
                <input
                  className="input"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('common.phone')}>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingProfile} className="btn-primary">
                <Save size={18} className="inline -mt-0.5 mr-1" />
                {savingProfile ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-6 lg:col-span-3">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={18} /> {t('profile.changePassword')}
          </h3>
          {passwordSaved && (
            <div className="mb-4 rounded-xl bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-accent-700 flex items-center gap-2">
              <CheckCircle size={16} /> {t('profile.passwordChanged')}
            </div>
          )}
          {passwordError && (
            <div className="mb-4 rounded-xl bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
              {passwordError}
            </div>
          )}
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('profile.newPassword')}>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Field>
              <Field label={t('profile.confirmPassword')}>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPassword} className="btn-primary">
                {savingPassword ? t('common.loading') : t('profile.changePassword')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  )
}
