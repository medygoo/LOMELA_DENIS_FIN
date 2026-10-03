import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Grade, ClassRoom, Subject, Student, ClassStudent, TeacherAssignment, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'

interface GradeRow extends Grade {
  students: Student | null
  subjects: Subject | null
}

interface EnrollmentRow extends ClassStudent {
  students: Student
}

interface GradeForm {
  student_id: string
  subject_id: string
  score: string
  max_score: string
  grade_type: string
  title: string
  grade_date: string
  term: string
  comments: string
}

const GRADE_TYPES = ['devoir', 'examen', 'controle', 'participation']

const emptyForm: GradeForm = {
  student_id: '',
  subject_id: '',
  score: '',
  max_score: '20',
  grade_type: 'devoir',
  title: '',
  grade_date: new Date().toISOString().slice(0, 10),
  term: '1',
  comments: '',
}

export function GradesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [students, setStudents] = useState<EnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Grade | null>(null)
  const [form, setForm] = useState<GradeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Grade | null>(null)
  const [childStudentIds, setChildStudentIds] = useState<string[]>([])

  const isTeacher = user?.role === 'enseignant'
  const isParent = user?.role === 'parent_tuteur'
  const canEdit = user?.role === 'enseignant' || user?.role === 'admin_principal' || user?.role === 'direction'

  useEffect(() => {
    async function loadInit() {
      if (!user) return
      setLoading(true)

      if (isParent) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id, students(*)')
          .eq('guardians.user_id', user.id)
        const ids = ((links as unknown as (StudentGuardian & { students: { id: string } })[]) || [])
          .map((l) => l.students?.id)
          .filter(Boolean) as string[]
        setChildStudentIds(ids)

        // Load grades for children
        if (ids.length > 0) {
          const { data } = await supabase
            .from('grades')
            .select('*, students(*), subjects(*)')
            .in('student_id', ids)
            .eq('school_id', user.school_id)
            .order('grade_date', { ascending: false })
          setGrades((data as GradeRow[]) || [])
        }
        setLoading(false)
        return
      }

      // Classes
      let classList: ClassRoom[] = []
      if (isTeacher) {
        const { data: assigns } = await supabase
          .from('teacher_assignments')
          .select('class_id, classes(*)')
          .eq('teacher_id', user.id)
          .eq('is_active', true)
        const seen = new Set<string>()
        for (const a of (assigns as unknown as (TeacherAssignment & { classes: ClassRoom | null })[]) || []) {
          if (a.classes && !seen.has(a.classes.id)) {
            seen.add(a.classes.id)
            classList.push(a.classes)
          }
        }
      } else {
        const { data } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .order('name', { ascending: true })
        classList = (data as ClassRoom[]) || []
      }
      setClasses(classList)

      // Subjects
      if (isTeacher) {
        const { data: assigns } = await supabase
          .from('teacher_assignments')
          .select('subject_id, subjects(*)')
          .eq('teacher_id', user.id)
          .eq('is_active', true)
        const seen = new Set<string>()
        const subs: Subject[] = []
        for (const a of (assigns as unknown as (TeacherAssignment & { subjects: Subject | null })[]) || []) {
          if (a.subjects && !seen.has(a.subjects.id)) {
            seen.add(a.subjects.id)
            subs.push(a.subjects)
          }
        }
        setSubjects(subs)
      } else {
        const { data } = await supabase
          .from('subjects')
          .select('*')
          .eq('school_id', user.school_id)
          .order('name', { ascending: true })
        setSubjects((data as Subject[]) || [])
      }

      setLoading(false)
    }
    loadInit()
  }, [user])

  useEffect(() => {
    if (!isParent && selectedClass) loadClassData()
  }, [selectedClass])

  async function loadClassData() {
    if (!user || !selectedClass) return
    setLoading(true)

    const { data: enrollments } = await supabase
      .from('class_students')
      .select('*, students(*)')
      .eq('class_id', selectedClass)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: true })
    setStudents((enrollments as unknown as EnrollmentRow[]) || [])

    let query = supabase
      .from('grades')
      .select('*, students(*), subjects(*)')
      .eq('school_id', user.school_id)
      .eq('class_id', selectedClass)
      .order('grade_date', { ascending: false })

    if (selectedSubject) {
      query = query.eq('subject_id', selectedSubject)
    }

    const { data } = await query
    setGrades((data as GradeRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!isParent && selectedClass) loadClassData()
  }, [selectedSubject])

  function openAdd() {
    setEditing(null)
    setForm({
      ...emptyForm,
      student_id: students[0]?.student_id || '',
      subject_id: selectedSubject || subjects[0]?.id || '',
      grade_date: new Date().toISOString().slice(0, 10),
    })
    setFormOpen(true)
  }

  function openEdit(g: Grade) {
    setEditing(g)
    setForm({
      student_id: g.student_id,
      subject_id: g.subject_id,
      score: g.score != null ? String(g.score) : '',
      max_score: String(g.max_score),
      grade_type: g.grade_type,
      title: g.title || '',
      grade_date: g.grade_date,
      term: g.term || '1',
      comments: g.comments || '',
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = {
      school_id: user.school_id,
      student_id: form.student_id,
      subject_id: form.subject_id,
      class_id: selectedClass || null,
      teacher_id: user.id,
      grade_type: form.grade_type,
      title: form.title || null,
      score: form.score ? Number(form.score) : null,
      max_score: Number(form.max_score) || 20,
      grade_date: form.grade_date,
      term: form.term || null,
      comments: form.comments || null,
    }
    if (editing) {
      await supabase.from('grades').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('grades').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    if (isParent) {
      // refresh parent grades
    } else {
      loadClassData()
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('grades').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (!isParent) loadClassData()
  }

  function scoreColor(score: number | null, max: number) {
    if (score == null) return 'text-gray-400'
    return score / max >= 0.5 ? 'text-accent-600' : 'text-error-600'
  }

  if (isParent) {
    return (
      <div>
        <PageHeader title={t('grades.title')} subtitle={t('grades.student')} />
        {grades.length === 0 && !loading ? (
          <EmptyState icon={<GraduationCap size={32} />} title={t('common.noData')} description={t('grades.title')} />
        ) : (
          <DataTable<GradeRow>
            loading={loading}
            emptyMessage={t('common.noData')}
            data={grades}
            columns={[
              {
                key: 'student',
                label: t('grades.student'),
                render: (g) => (
                  <span className="font-medium text-gray-900">
                    {g.students ? `${g.students.last_name} ${g.students.first_name}` : '—'}
                  </span>
                ),
              },
              {
                key: 'subject',
                label: t('grades.subject'),
                render: (g) => g.subjects?.name || '—',
              },
              {
                key: 'score',
                label: t('grades.score'),
                render: (g) => (
                  <span className={`font-semibold ${scoreColor(g.score, g.max_score)}`}>
                    {g.score != null ? `${g.score}/${g.max_score}` : '—'}
                  </span>
                ),
              },
              {
                key: 'grade_type',
                label: t('grades.gradeType'),
                render: (g) => <Badge color="blue">{t(`grades.${g.grade_type}`, g.grade_type)}</Badge>,
              },
              {
                key: 'grade_date',
                label: t('grades.gradeDate'),
                render: (g) => new Date(g.grade_date).toLocaleDateString(),
              },
            ]}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('grades.title')}
        subtitle={t('grades.enterGrades')}
        action={
          canEdit && selectedClass ? (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('grades.addGrade')}
            </button>
          ) : undefined
        }
      />

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="block flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('homework.class')}</span>
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">{t('common.selectOption')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('grades.subject')}</span>
            <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!selectedClass ? (
        <EmptyState icon={<GraduationCap size={32} />} title={t('common.selectOption')} description={t('grades.enterGrades')} />
      ) : grades.length === 0 && !loading ? (
        <EmptyState
          icon={<GraduationCap size={32} />}
          title={t('common.noData')}
          description={t('grades.title')}
          action={
            canEdit ? (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('grades.addGrade')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable<GradeRow>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={grades}
          columns={[
            {
              key: 'student',
              label: t('grades.student'),
              render: (g) => (
                <span className="font-medium text-gray-900">
                  {g.students ? `${g.students.last_name} ${g.students.first_name}` : '—'}
                </span>
              ),
            },
            {
              key: 'subject',
              label: t('grades.subject'),
              render: (g) => g.subjects?.name || '—',
            },
            {
              key: 'score',
              label: t('grades.score'),
              render: (g) => (
                <span className={`font-semibold ${scoreColor(g.score, g.max_score)}`}>
                  {g.score != null ? `${g.score}/${g.max_score}` : '—'}
                </span>
              ),
            },
            {
              key: 'grade_type',
              label: t('grades.gradeType'),
              render: (g) => <Badge color="blue">{t(`grades.${g.grade_type}`, g.grade_type)}</Badge>,
            },
            {
              key: 'grade_date',
              label: t('grades.gradeDate'),
              render: (g) => new Date(g.grade_date).toLocaleDateString(),
            },
          ]}
          actions={(g) =>
            canEdit ? (
              <>
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
            ) : undefined
          }
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('grades.editGrade') : t('grades.addGrade')}
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('grades.student')}>
              <select
                className="input"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                required
              >
                <option value="">{t('common.selectOption')}</option>
                {students.map((r) => (
                  <option key={r.student_id} value={r.student_id}>
                    {r.students.last_name} {r.students.first_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('grades.subject')}>
              <select
                className="input"
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                required
              >
                <option value="">{t('common.selectOption')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('grades.score')}>
              <input
                type="number"
                step="0.25"
                className="input"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
              />
            </Field>
            <Field label={t('grades.maxScore')}>
              <input
                type="number"
                className="input"
                value={form.max_score}
                onChange={(e) => setForm({ ...form, max_score: e.target.value })}
              />
            </Field>
            <Field label={t('grades.gradeType')}>
              <select
                className="input"
                value={form.grade_type}
                onChange={(e) => setForm({ ...form, grade_type: e.target.value })}
              >
                {GRADE_TYPES.map((gt) => (
                  <option key={gt} value={gt}>
                    {t(`grades.${gt}`, gt)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('grades.gradeDate')}>
              <input
                type="date"
                className="input"
                value={form.grade_date}
                onChange={(e) => setForm({ ...form, grade_date: e.target.value })}
                required
              />
            </Field>
            <Field label={t('grades.term')}>
              <select
                className="input"
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </Field>
            <Field label={t('common.name')}>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('grades.comments')}>
            <textarea
              className="input min-h-[80px]"
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
            />
          </Field>
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
        message={t('common.confirmDelete')}
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
