import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Profile, ClassRoom, Subject, TeacherAssignment } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Trash2, UserCheck } from 'lucide-react'

interface AssignmentRow extends TeacherAssignment {
  teachers: Profile | null
  classes: ClassRoom | null
  subjects: Subject | null
}

interface AssignmentForm {
  teacher_id: string
  class_id: string
  subject_id: string
}

const emptyForm: AssignmentForm = { teacher_id: '', class_id: '', subject_id: '' }

export function AssignmentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<AssignmentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRow | null>(null)
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const isTeacher = user?.role === 'enseignant'

  async function loadAssignments() {
    if (!user) return
    setLoading(true)
    let query = supabase
      .from('teacher_assignments')
      .select('*, teachers!teacher_assignments_teacher_id_fkey(*), classes(*), subjects(*)')
      .eq('school_id', user.school_id)
      .eq('is_active', true)

    if (isTeacher) {
      query = query.eq('teacher_id', user.id)
    }

    const { data } = await query.order('created_at', { ascending: false })
    setAssignments((data as unknown as AssignmentRow[]) || [])
    setLoading(false)
  }

  async function loadOptions() {
    if (!user) return
    const [teachersRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('school_id', user.school_id).eq('role', 'enseignant').eq('is_active', true).order('last_name'),
      supabase.from('classes').select('*').eq('school_id', user.school_id).eq('is_active', true).order('name'),
      supabase.from('subjects').select('*').eq('school_id', user.school_id).order('name'),
    ])
    setTeachers((teachersRes.data as Profile[]) || [])
    setClasses((classesRes.data as ClassRoom[]) || [])
    setSubjects((subjectsRes.data as Subject[]) || [])
  }

  useEffect(() => {
    loadAssignments()
    if (!isTeacher) loadOptions()
  }, [user])

  function openAdd() {
    setForm(emptyForm)
    loadOptions()
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !form.teacher_id || !form.class_id) return
    setSaving(true)
    await supabase.from('teacher_assignments').insert({
      school_id: user.school_id,
      teacher_id: form.teacher_id,
      class_id: form.class_id,
      subject_id: form.subject_id || null,
      is_active: true,
    })
    setSaving(false)
    setFormOpen(false)
    loadAssignments()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('teacher_assignments').update({ is_active: false }).eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadAssignments()
  }

  const filtered = assignments.filter((a) => {
    const name = `${a.teachers?.first_name} ${a.teachers?.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div>
      <PageHeader
        title={t('assignments.title')}
        subtitle={t('assignments.subtitle')}
        action={
          !isTeacher && (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('assignments.add')}
            </button>
          )
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('assignments.search')} />
      </div>

      {assignments.length === 0 && !loading ? (
        <EmptyState
          icon={<UserCheck size={32} />}
          title={t('assignments.empty')}
          description={t('assignments.emptyDescription')}
          action={
            !isTeacher && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('assignments.add')}
              </button>
            )
          }
        />
      ) : (
        <DataTable<AssignmentRow>
          loading={loading}
          emptyMessage={t('assignments.noResults')}
          data={filtered}
          columns={[
            {
              key: 'teacher',
              label: t('assignments.teacher'),
              render: (a) => (
                <span className="font-medium text-gray-900">
                  {a.teachers?.first_name} {a.teachers?.last_name}
                </span>
              ),
            },
            {
              key: 'class',
              label: t('assignments.class'),
              render: (a) => <Badge color="blue">{a.classes?.name || '—'}</Badge>,
            },
            {
              key: 'subject',
              label: t('assignments.subject'),
              render: (a) => a.subjects?.name || '—',
            },
          ]}
          actions={
            !isTeacher
              ? (a) => (
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                    title={t('common.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                )
              : undefined
          }
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t('assignments.add')}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t('assignments.teacher')}>
            <select className="input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required>
              <option value="">—</option>
              {teachers.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.last_name} {tc.first_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('assignments.class')}>
            <select className="input" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('assignments.subject')}>
            <select className="input" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">—</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
        title={t('assignments.deleteTitle')}
        message={t('assignments.deleteMessage', {
          teacher: deleteTarget ? `${deleteTarget.teachers?.first_name} ${deleteTarget.teachers?.last_name}` : '',
          class: deleteTarget?.classes?.name || '',
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
