import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { AuthorizedPerson, Student, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, ShieldCheck, UserCog } from 'lucide-react'

interface PersonForm {
  first_name: string
  last_name: string
  relationship: string
  phone: string
  id_number: string
}

const emptyForm: PersonForm = {
  first_name: '',
  last_name: '',
  relationship: '',
  phone: '',
  id_number: '',
}

export function AuthorizedPersonsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [persons, setPersons] = useState<AuthorizedPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AuthorizedPerson | null>(null)
  const [form, setForm] = useState<PersonForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AuthorizedPerson | null>(null)

  const isParent = user?.role === 'parent_tuteur'
  const canEdit = !isParent

  useEffect(() => {
    async function loadStudents() {
      if (!user) return
      setLoading(true)

      if (isParent) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id, students(*)')
          .eq('guardians.user_id', user.id)
        const childStudents = ((links as unknown as (StudentGuardian & { students: Student })[]) || [])
          .map((l) => l.students)
          .filter(Boolean) as Student[]
        setStudents(childStudents)
        if (childStudents[0]) setSelectedStudent(childStudents[0].id)
      } else {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .order('last_name', { ascending: true })
        setStudents((data as Student[]) || [])
        if ((data as Student[])?.[0]) setSelectedStudent((data as Student[])[0].id)
      }
      setLoading(false)
    }
    loadStudents()
  }, [user])

  useEffect(() => {
    if (selectedStudent) loadPersons()
  }, [selectedStudent])

  async function loadPersons() {
    if (!selectedStudent) return
    const { data } = await supabase
      .from('authorized_persons')
      .select('*')
      .eq('student_id', selectedStudent)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    setPersons((data as AuthorizedPerson[]) || [])
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(p: AuthorizedPerson) {
    setEditing(p)
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      relationship: p.relationship,
      phone: p.phone || '',
      id_number: p.id_number || '',
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedStudent) return
    setSaving(true)
    const payload = {
      student_id: selectedStudent,
      school_id: user.school_id,
      first_name: form.first_name,
      last_name: form.last_name,
      relationship: form.relationship,
      phone: form.phone || null,
      id_number: form.id_number || null,
      is_active: true,
    }
    if (editing) {
      await supabase.from('authorized_persons').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('authorized_persons').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadPersons()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('authorized_persons').update({ is_active: false }).eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadPersons()
  }

  return (
    <div>
      <PageHeader
        title={t('authorizedPersonsNav') || t('students.authorizedPersons')}
        subtitle={t('students.addAuthorizedPerson')}
        action={
          canEdit && selectedStudent ? (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('students.addAuthorizedPerson')}
            </button>
          ) : undefined
        }
      />

      <div className="card p-4 mb-6">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">{t('grades.student')}</span>
          <select className="input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            {students.length === 0 && <option value="">{t('common.selectOption')}</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.last_name} {s.first_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selectedStudent ? (
        <EmptyState icon={<ShieldCheck size={32} />} title={t('common.selectOption')} description={t('students.authorizedPersons')} />
      ) : persons.length === 0 && !loading ? (
        <EmptyState
          icon={<ShieldCheck size={32} />}
          title={t('common.noData')}
          description={t('students.authorizedPersons')}
          action={
            canEdit ? (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('students.addAuthorizedPerson')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable<AuthorizedPerson>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={persons}
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
            { key: 'relationship', label: t('guardian.relationship'), render: (p) => p.relationship },
            { key: 'phone', label: t('common.phone'), render: (p) => p.phone || '—' },
            { key: 'id_number', label: t('students.enrollmentNumber'), render: (p) => p.id_number || '—' },
          ]}
          actions={(p) =>
            canEdit ? (
              <>
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                  title={t('common.edit')}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                  title={t('common.delete')}
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : undefined
          }
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('common.edit') : t('students.addAuthorizedPerson')}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
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
            <Field label={t('guardian.relationship')}>
              <input
                className="input"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                placeholder={t('guardian.relationship')}
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
            <Field label={t('students.enrollmentNumber')}>
              <input
                className="input"
                value={form.id_number}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              />
            </Field>
          </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}
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
