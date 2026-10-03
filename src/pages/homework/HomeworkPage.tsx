import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Homework, ClassRoom, Subject, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'

interface HomeworkRow extends Homework {
  classes: ClassRoom | null
  subjects: Subject | null
}

interface HomeworkForm {
  title: string
  description: string
  class_id: string
  subject_id: string
  due_date: string
}

const emptyForm: HomeworkForm = {
  title: '',
  description: '',
  class_id: '',
  subject_id: '',
  due_date: '',
}

export function HomeworkPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [homework, setHomework] = useState<HomeworkRow[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [childClassIds, setChildClassIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Homework | null>(null)
  const [form, setForm] = useState<HomeworkForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Homework | null>(null)

  const isTeacher = user?.role === 'enseignant'
  const isParent = user?.role === 'parent_tuteur'
  const canEdit = user?.role === 'enseignant' || user?.role === 'admin_principal' || user?.role === 'direction'

  useEffect(() => {
    async function loadAll() {
      if (!user) return
      setLoading(true)

      // Classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      setClasses((classesData as ClassRoom[]) || [])

      // Subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true })
      setSubjects((subjectsData as Subject[]) || [])

      // For parents: find their children's classes
      if (isParent) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id, students(*)')
          .eq('guardians.user_id', user.id)
        const childIds = ((links as unknown as (StudentGuardian & { students: { id: string } })[]) || [])
          .map((l) => l.students?.id)
          .filter(Boolean) as string[]

        if (childIds.length > 0) {
          const { data: enrollments } = await supabase
            .from('class_students')
            .select('class_id')
            .in('student_id', childIds)
            .eq('is_active', true)
          setChildClassIds([...new Set(((enrollments as { class_id: string }[]) || []).map((e) => e.class_id))])
        }
      }

      setLoading(false)
    }
    loadAll()
  }, [user])

  useEffect(() => {
    loadHomework()
  }, [user, classes, childClassIds])

  async function loadHomework() {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('homework')
      .select('*, classes(*), subjects(*)')
      .eq('school_id', user.school_id)
      .order('due_date', { ascending: false })

    if (isTeacher) {
      query = query.eq('teacher_id', user.id)
    } else if (isParent && childClassIds.length > 0) {
      query = query.in('class_id', childClassIds)
    } else if (isParent) {
      // No children's classes loaded yet
      setHomework([])
      setLoading(false)
      return
    }

    const { data } = await query
    setHomework((data as HomeworkRow[]) || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, class_id: classes[0]?.id || '', due_date: new Date().toISOString().slice(0, 10) })
    setFormOpen(true)
  }

  function openEdit(hw: Homework) {
    setEditing(hw)
    setForm({
      title: hw.title,
      description: hw.description || '',
      class_id: hw.class_id,
      subject_id: hw.subject_id || '',
      due_date: hw.due_date,
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = {
      school_id: user.school_id,
      teacher_id: user.id,
      title: form.title,
      description: form.description || null,
      class_id: form.class_id,
      subject_id: form.subject_id || null,
      due_date: form.due_date,
    }
    if (editing) {
      await supabase.from('homework').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('homework').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadHomework()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('homework').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadHomework()
  }

  return (
    <div>
      <PageHeader
        title={t('homework.title')}
        subtitle={t('homework.description')}
        action={
          canEdit ? (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('homework.addHomework')}
            </button>
          ) : undefined
        }
      />

      {homework.length === 0 && !loading ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title={t('common.noData')}
          description={t('homework.title')}
        />
      ) : (
        <DataTable<HomeworkRow>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={homework}
          columns={[
            {
              key: 'title',
              label: t('homework.title_field'),
              render: (h) => <span className="font-medium text-gray-900">{h.title}</span>,
            },
            {
              key: 'class',
              label: t('homework.class'),
              render: (h) => h.classes?.name || '—',
            },
            {
              key: 'subject',
              label: t('homework.subject'),
              render: (h) => h.subjects?.name || '—',
            },
            {
              key: 'due_date',
              label: t('homework.dueDate'),
              render: (h) => new Date(h.due_date).toLocaleDateString(),
            },
          ]}
          actions={(h) =>
            canEdit ? (
              <>
                <button
                  onClick={() => openEdit(h)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                  title={t('common.edit')}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setDeleteTarget(h)}
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
        title={editing ? t('homework.editHomework') : t('homework.addHomework')}
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <Field label={t('homework.title_field')}>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label={t('homework.description')}>
            <textarea
              className="input min-h-[100px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('homework.class')}>
              <select
                className="input"
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                required
              >
                <option value="">{t('common.selectOption')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('homework.subject')}>
              <select
                className="input"
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              >
                <option value="">{t('common.none')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('homework.dueDate')}>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
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
        message={deleteTarget ? deleteTarget.title : ''}
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
