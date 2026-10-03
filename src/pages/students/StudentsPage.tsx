import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Student, Guardian, StudentGuardian, AuthorizedPerson } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Eye, GraduationCap, Users, ShieldCheck } from 'lucide-react'

interface StudentForm {
  first_name: string
  last_name: string
  birth_date: string
  gender: string
  address: string
  city: string
  phone: string
  email: string
  enrollment_number: string
}

const emptyForm: StudentForm = {
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: 'M',
  address: '',
  city: '',
  phone: '',
  email: '',
  enrollment_number: '',
}

export function StudentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [detail, setDetail] = useState<Student | null>(null)
  const [guardians, setGuardians] = useState<(StudentGuardian & { guardians: Guardian | null })[]>([])
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  async function loadStudents() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('is_active', true)
      .order('last_name', { ascending: true })
    setStudents((data as Student[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStudents()
  }, [user])

  async function openDetail(student: Student) {
    setDetail(student)
    setDetailLoading(true)
    const [g, ap] = await Promise.all([
      supabase
        .from('student_guardians')
        .select('*, guardians(*)')
        .eq('student_id', student.id),
      supabase.from('authorized_persons').select('*').eq('student_id', student.id).eq('is_active', true),
    ])
    setGuardians((g.data as unknown as (StudentGuardian & { guardians: Guardian | null })[]) || [])
    setAuthorizedPersons((ap.data as AuthorizedPerson[]) || [])
    setDetailLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      birth_date: student.birth_date || '',
      gender: student.gender || 'M',
      address: student.address || '',
      city: student.city || '',
      phone: student.phone || '',
      email: student.email || '',
      enrollment_number: student.enrollment_number || '',
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = {
      ...form,
      school_id: user.school_id,
      is_active: true,
    }
    if (editing) {
      await supabase.from('students').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('students').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadStudents()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('students').update({ is_active: false }).eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadStudents()
  }

  const filtered = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title={t('students.title')}
        subtitle={t('students.subtitle')}
        action={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} className="inline -mt-0.5 mr-1" />
            {t('students.add')}
          </button>
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('students.search')} />
      </div>

      {students.length === 0 && !loading ? (
        <EmptyState
          icon={<GraduationCap size={32} />}
          title={t('students.empty')}
          description={t('students.emptyDescription')}
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('students.add')}
            </button>
          }
        />
      ) : (
        <DataTable<Student>
          loading={loading}
          emptyMessage={t('students.noResults')}
          data={filtered}
          onRowClick={openDetail}
          columns={[
            {
              key: 'name',
              label: t('students.name'),
              render: (s) => (
                <span className="font-medium text-gray-900">
                  {s.last_name} {s.first_name}
                </span>
              ),
            },
            { key: 'enrollment_number', label: t('students.enrollmentNumber') },
            {
              key: 'gender',
              label: t('students.gender'),
              render: (s) => (s.gender === 'F' ? t('students.female') : t('students.male')),
            },
            {
              key: 'birth_date',
              label: t('students.birthDate'),
              render: (s) => (s.birth_date ? new Date(s.birth_date).toLocaleDateString() : '—'),
            },
          ]}
          actions={(s) => (
            <>
              <button
                onClick={() => openDetail(s)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.view')}
              >
                <Eye size={18} />
              </button>
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('students.edit') : t('students.add')}
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('students.firstName')}>
              <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </Field>
            <Field label={t('students.lastName')}>
              <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </Field>
            <Field label={t('students.birthDate')}>
              <input type="date" className="input" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </Field>
            <Field label={t('students.gender')}>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">{t('students.male')}</option>
                <option value="F">{t('students.female')}</option>
              </select>
            </Field>
            <Field label={t('students.enrollmentNumber')}>
              <input className="input" value={form.enrollment_number} onChange={(e) => setForm({ ...form, enrollment_number: e.target.value })} />
            </Field>
            <Field label={t('students.phone')}>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('students.email')}>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('students.city')}>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
          </div>
          <Field label={t('students.address')}>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
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
        title={t('students.deleteTitle')}
        message={t('students.deleteMessage', {
          name: deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : '',
        })}
        confirmLabel={t('common.delete')}
        danger
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.first_name} ${detail.last_name}` : ''}
        size="lg"
      >
        {detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField label={t('students.enrollmentNumber')} value={detail.enrollment_number} />
              <InfoField label={t('students.gender')} value={detail.gender === 'F' ? t('students.female') : t('students.male')} />
              <InfoField label={t('students.birthDate')} value={detail.birth_date ? new Date(detail.birth_date).toLocaleDateString() : '—'} />
              <InfoField label={t('students.phone')} value={detail.phone} />
              <InfoField label={t('students.email')} value={detail.email} />
              <InfoField label={t('students.city')} value={detail.city} />
            </div>
            <div>
              <InfoField label={t('students.address')} value={detail.address} />
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Users size={16} /> {t('students.guardians')}
              </h3>
              {detailLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : guardians.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {guardians.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {g.guardians?.first_name} {g.guardians?.last_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {g.relationship_type || g.guardians?.relationship} · {g.guardians?.phone || '—'}
                        </p>
                      </div>
                      {g.guardians?.is_emergency_contact && <Badge color="red">{t('guardians.emergencyContact')}</Badge>}
                      {g.is_primary && <Badge color="blue">{t('guardians.primary')}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <ShieldCheck size={16} /> {t('students.authorizedPersons')}
              </h3>
              {detailLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : authorizedPersons.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {authorizedPersons.map((ap) => (
                    <div key={ap.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {ap.first_name} {ap.last_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {ap.relationship} · {ap.phone || '—'}
                        </p>
                      </div>
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
