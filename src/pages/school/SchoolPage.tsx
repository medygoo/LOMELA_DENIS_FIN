import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { School } from '../../types'
import { PageHeader } from '../../components/ui/DataTable'
import { Building2, Save } from 'lucide-react'

interface SchoolForm {
  name: string
  address: string
  city: string
  phone: string
  email: string
}

export function SchoolPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [school, setSchool] = useState<School | null>(null)
  const [form, setForm] = useState<SchoolForm>({ name: '', address: '', city: '', phone: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notAuthorized, setNotAuthorized] = useState(false)

  const isAdmin = user?.role === 'admin_principal' || user?.role === 'direction'

  async function loadSchool() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('schools').select('*').eq('id', user.school_id).maybeSingle()
    const s = data as School | null
    setSchool(s)
    if (s) {
      setForm({
        name: s.name,
        address: s.address || '',
        city: s.city || '',
        phone: s.phone || '',
        email: s.email || '',
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isAdmin) {
      setNotAuthorized(true)
      setLoading(false)
      return
    }
    loadSchool()
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !school) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: updateError } = await supabase
      .from('schools')
      .update({
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone,
        email: form.email,
      })
      .eq('id', school.id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      loadSchool()
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
  }

  if (notAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-error-50 flex items-center justify-center text-error-400 mb-4">
          <Building2 size={32} />
        </div>
        <h3 className="text-base font-semibold text-gray-700">{t('school.notAuthorized')}</h3>
        <p className="text-sm text-gray-400 mt-1">{t('school.notAuthorizedDescription')}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('school.title')} subtitle={t('school.subtitle')} />

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{school?.name}</h2>
            <p className="text-xs text-gray-400">{t('school.code')}: {school?.code}</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4">
          <Field label={t('school.name')}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label={t('school.code')}>
            <input className="input bg-gray-50" value={school?.code || ''} disabled readOnly />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('school.phone')}>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('school.email')}>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label={t('school.city')}>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label={t('school.address')}>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>

          {error && (
            <div className="rounded-lg bg-error-50 text-error-700 text-sm px-4 py-3">{error}</div>
          )}
          {saved && (
            <div className="rounded-lg bg-accent-50 text-accent-700 text-sm px-4 py-3">{t('school.saved')}</div>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={18} className="inline -mt-0.5 mr-1" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
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
