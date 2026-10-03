import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Staff } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react'

interface StaffForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  role: string
  hire_date: string
  is_active: boolean
}

const emptyForm: StaffForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'enseignant',
  hire_date: '',
  is_active: true,
}

const STAFF_ROLES = ['direction', 'enseignant', 'gardien', 'caisse', 'administration']

export function StaffPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [staff, setStaff] = useState<Staff[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

  async function loadStaff() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', user.school_id)
      .order('last_name', { ascending: true })
    setStaff((data as Staff[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [user])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(member: Staff) {
    setEditing(member)
    setForm({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role,
      hire_date: member.hire_date || '',
      is_active: member.is_active,
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = { ...form, school_id: user.school_id }
    if (editing) {
      await supabase.from('staff').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('staff').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadStaff()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('staff').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadStaff()
  }

  const filtered = staff.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        action={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} className="inline -mt-0.5 mr-1" />
            {t('staff.add')}
          </button>
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('staff.search')} />
      </div>

      {staff.length === 0 && !loading ? (
        <EmptyState
          icon={<Briefcase size={32} />}
          title={t('staff.empty')}
          description={t('staff.emptyDescription')}
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('staff.add')}
            </button>
          }
        />
      ) : (
        <DataTable<Staff>
          loading={loading}
          emptyMessage={t('staff.noResults')}
          data={filtered}
          columns={[
            {
              key: 'name',
              label: t('staff.name'),
              render: (s) => (
                <span className="font-medium text-gray-900">
                  {s.last_name} {s.first_name}
                </span>
              ),
            },
            {
              key: 'role',
              label: t('staff.role'),
              render: (s) => <Badge color="blue">{t(`roles.${s.role}`, s.role)}</Badge>,
            },
            { key: 'email', label: t('staff.email'), render: (s) => s.email || '—' },
            { key: 'phone', label: t('staff.phone'), render: (s) => s.phone || '—' },
            {
              key: 'is_active',
              label: t('staff.status'),
              render: (s) =>
                s.is_active ? <Badge color="green">{t('staff.active')}</Badge> : <Badge color="gray">{t('staff.inactive')}</Badge>,
            },
          ]}
          actions={(s) => (
            <>
              <button
                onClick={() => openEdit(s)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.edit')}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                title={t('common.delete')}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('staff.edit') : t('staff.add')} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('staff.firstName')}>
              <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </Field>
            <Field label={t('staff.lastName')}>
              <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </Field>
            <Field label={t('staff.email')}>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('staff.phone')}>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('staff.role')}>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`, r)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('staff.hireDate')}>
              <input type="date" className="input" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700">{t('staff.active')}</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('staff.deleteTitle')}
        message={t('staff.deleteMessage', {
          name: deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : '',
        })}
        confirmLabel={t('common.delete')}
        danger
      />
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
