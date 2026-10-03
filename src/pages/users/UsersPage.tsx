import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Profile, Role, School } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Plus, Pencil, Users, UserCheck, UserX } from 'lucide-react'

const ALL_ROLES: Role[] = ['admin_principal', 'direction', 'enseignant', 'parent_tuteur', 'gardien', 'caisse']

interface UserForm {
  email: string
  first_name: string
  last_name: string
  phone: string
  role: Role
  password: string
}

const emptyForm: UserForm = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'enseignant',
  password: '',
}

export function UsersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [school, setSchool] = useState<School | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = user?.role === 'admin_principal'

  useEffect(() => {
    if (!user) return
    if (!isAdmin) return
    loadUsers()
    loadSchool()
  }, [user])

  async function loadUsers() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', user.school_id)
      .order('last_name', { ascending: true })
    setUsers((data as Profile[]) || [])
    setLoading(false)
  }

  async function loadSchool() {
    if (!user) return
    const { data } = await supabase.from('schools').select('*').eq('id', user.school_id).maybeSingle()
    setSchool((data as School) || null)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setFormOpen(true)
  }

  function openEdit(p: Profile) {
    setEditing(p)
    setForm({
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      phone: p.phone || '',
      role: p.role,
      password: '',
    })
    setError('')
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    if (editing) {
      // Only edit first_name, last_name, phone
      const { error: err } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
        })
        .eq('id', editing.id)
      if (err) setError(err.message)
      setSaving(false)
      setFormOpen(false)
      loadUsers()
      return
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        role: form.role,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      setError(errData.error || t('common.error'))
      setSaving(false)
      return
    }

    setSaving(false)
    setFormOpen(false)
    loadUsers()
  }

  async function toggleActive(p: Profile) {
    await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    loadUsers()
  }

  const filtered = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  )

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title={t('users.title')} />
        <EmptyState icon={<Users size={32} />} title={t('common.error')} description={t('users.title')} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={school?.name || ''}
        action={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} className="inline -mt-0.5 mr-1" />
            {t('users.addUser')}
          </button>
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />
      </div>

      {users.length === 0 && !loading ? (
        <EmptyState
          icon={<Users size={32} />}
          title={t('common.noData')}
          description={t('users.title')}
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('users.addUser')}
            </button>
          }
        />
      ) : (
        <DataTable<Profile>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={filtered}
          columns={[
            {
              key: 'name',
              label: t('common.name'),
              render: (p) => (
                <span className="font-medium text-gray-900">
                  {p.last_name} {p.first_name}
                </span>
              ),
            },
            { key: 'email', label: t('common.email') },
            {
              key: 'role',
              label: t('users.role'),
              render: (p) => <Badge color="blue">{t(`roles.${p.role}`, p.role)}</Badge>,
            },
            {
              key: 'is_active',
              label: t('common.status'),
              render: (p) =>
                p.is_active ? <Badge color="green">{t('users.active')}</Badge> : <Badge color="gray">{t('staff.inactive')}</Badge>,
            },
          ]}
          actions={(p) => (
            <>
              <button
                onClick={() => openEdit(p)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.edit')}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => toggleActive(p)}
                className={`p-1.5 rounded-lg ${
                  p.is_active
                    ? 'text-gray-400 hover:text-error-600 hover:bg-error-50'
                    : 'text-gray-400 hover:text-accent-600 hover:bg-accent-50'
                }`}
                title={p.is_active ? t('users.deactivate') : t('users.activate')}
              >
                {p.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
              </button>
            </>
          )}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('users.editUser') : t('users.addUser')}
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
              {error}
            </div>
          )}
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
            <Field label={t('common.email')}>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={!!editing}
              />
            </Field>
            <Field label={t('common.phone')}>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label={t('users.role')}>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                disabled={!!editing}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`, r)}
                  </option>
                ))}
              </select>
            </Field>
            {!editing && (
              <Field label={t('auth.password')}>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </Field>
            )}
          </div>
          {editing && (
            <p className="text-xs text-gray-400">
              {t('common.edit')}: {t('students.firstName')}, {t('students.lastName')}, {t('common.phone')}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
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
