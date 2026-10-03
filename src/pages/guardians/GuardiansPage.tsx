import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Guardian, Student, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Eye, Users } from 'lucide-react'

interface GuardianForm {
  first_name: string
  last_name: string
  relationship: string
  phone: string
  email: string
  address: string
  city: string
  profession: string
  is_emergency_contact: boolean
}

const emptyForm: GuardianForm = {
  first_name: '',
  last_name: '',
  relationship: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  profession: '',
  is_emergency_contact: false,
}

export function GuardiansPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Guardian | null>(null)
  const [form, setForm] = useState<GuardianForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Guardian | null>(null)
  const [detail, setDetail] = useState<Guardian | null>(null)
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  async function loadGuardians() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('guardians')
      .select('*')
      .eq('school_id', user.school_id)
      .order('last_name', { ascending: true })
    setGuardians((data as Guardian[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadGuardians()
  }, [user])

  async function openDetail(guardian: Guardian) {
    setDetail(guardian)
    setDetailLoading(true)
    const { data } = await supabase
      .from('student_guardians')
      .select('students(*)')
      .eq('guardian_id', guardian.id)
    setLinkedStudents(((data || []) as unknown as (StudentGuardian & { students: Student })[]).map((l) => l.students).filter(Boolean))
    setDetailLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(guardian: Guardian) {
    setEditing(guardian)
    setForm({
      first_name: guardian.first_name,
      last_name: guardian.last_name,
      relationship: guardian.relationship || '',
      phone: guardian.phone || '',
      email: guardian.email || '',
      address: guardian.address || '',
      city: guardian.city || '',
      profession: guardian.profession || '',
      is_emergency_contact: guardian.is_emergency_contact,
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = { ...form, school_id: user.school_id }
    if (editing) {
      await supabase.from('guardians').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('guardians').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadGuardians()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('student_guardians').delete().eq('guardian_id', deleteTarget.id)
    await supabase.from('guardians').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadGuardians()
  }

  const filtered = guardians.filter((g) =>
    `${g.first_name} ${g.last_name}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title={t('guardians.title')}
        subtitle={t('guardians.subtitle')}
        action={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} className="inline -mt-0.5 mr-1" />
            {t('guardians.add')}
          </button>
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('guardians.search')} />
      </div>

      {guardians.length === 0 && !loading ? (
        <EmptyState
          icon={<Users size={32} />}
          title={t('guardians.empty')}
          description={t('guardians.emptyDescription')}
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('guardians.add')}
            </button>
          }
        />
      ) : (
        <DataTable<Guardian>
          loading={loading}
          emptyMessage={t('guardians.noResults')}
          data={filtered}
          onRowClick={openDetail}
          columns={[
            {
              key: 'name',
              label: t('guardians.name'),
              render: (g) => (
                <span className="font-medium text-gray-900">
                  {g.last_name} {g.first_name}
                </span>
              ),
            },
            { key: 'relationship', label: t('guardians.relationship'), render: (g) => g.relationship || '—' },
            { key: 'phone', label: t('guardians.phone'), render: (g) => g.phone || '—' },
            { key: 'email', label: t('guardians.email'), render: (g) => g.email || '—' },
            {
              key: 'is_emergency_contact',
              label: t('guardians.emergencyContact'),
              render: (g) =>
                g.is_emergency_contact ? <Badge color="red">{t('common.yes')}</Badge> : <Badge color="gray">{t('common.no')}</Badge>,
            },
          ]}
          actions={(g) => (
            <>
              <button
                onClick={() => openDetail(g)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.view')}
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() => openEdit(g)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.edit')}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setDeleteTarget(g)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                title={t('common.delete')}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('guardians.edit') : t('guardians.add')}
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('guardians.firstName')}>
              <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </Field>
            <Field label={t('guardians.lastName')}>
              <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </Field>
            <Field label={t('guardians.relationship')}>
              <input className="input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder={t('guardians.relationshipPlaceholder')} />
            </Field>
            <Field label={t('guardians.profession')}>
              <input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
            </Field>
            <Field label={t('guardians.phone')}>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('guardians.email')}>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('guardians.city')}>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label={t('guardians.address')}>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_emergency_contact}
              onChange={(e) => setForm({ ...form, is_emergency_contact: e.target.checked })}
              className="rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700">{t('guardians.emergencyContact')}</span>
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
        title={t('guardians.deleteTitle')}
        message={t('guardians.deleteMessage', {
          name: deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : '',
        })}
        confirmLabel={t('common.delete')}
        danger
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.first_name} ${detail.last_name}` : ''} size="lg">
        {detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField label={t('guardians.relationship')} value={detail.relationship} />
              <InfoField label={t('guardians.phone')} value={detail.phone} />
              <InfoField label={t('guardians.email')} value={detail.email} />
              <InfoField label={t('guardians.profession')} value={detail.profession} />
              <InfoField label={t('guardians.city')} value={detail.city} />
              <InfoField label={t('guardians.emergencyContact')} value={detail.is_emergency_contact ? t('common.yes') : t('common.no')} />
            </div>
            <div>
              <InfoField label={t('guardians.address')} value={detail.address} />
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Users size={16} /> {t('guardians.linkedStudents')}
              </h3>
              {detailLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : linkedStudents.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {linkedStudents.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-700">
                        {s.first_name} {s.last_name}
                      </span>
                      <span className="text-xs text-gray-400">{s.enrollment_number || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  )
}
