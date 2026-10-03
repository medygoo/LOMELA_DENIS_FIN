import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { ClassRoom, Student, ClassStudent } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Library, UserPlus, UserMinus } from 'lucide-react'

interface ClassForm {
  name: string
  level: string
  capacity: number
  room: string
}

const emptyForm: ClassForm = { name: '', level: '', capacity: 0, room: '' }

export function ClassesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [classes, setClasses] = useState<(ClassRoom & { student_count?: number })[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClassRoom | null>(null)
  const [form, setForm] = useState<ClassForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClassRoom | null>(null)
  const [detail, setDetail] = useState<ClassRoom | null>(null)
  const [enrolled, setEnrolled] = useState<Student[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const isTeacher = user?.role === 'enseignant'

  async function loadClasses() {
    if (!user) return
    setLoading(true)

    if (isTeacher) {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id, classes(*)')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
      const mapped = ((assignments || []) as unknown as { class_id: string; classes: ClassRoom }[])
        .map((a) => a.classes)
        .filter(Boolean)
      await loadCounts(mapped)
    } else {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      await loadCounts((data as ClassRoom[]) || [])
    }
  }

  async function loadCounts(list: ClassRoom[]) {
    if (list.length === 0) {
      setClasses([])
      setLoading(false)
      return
    }
    const withCounts = await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from('class_students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', c.id)
          .eq('is_active', true)
        return { ...c, student_count: count || 0 }
      }),
    )
    setClasses(withCounts)
    setLoading(false)
  }

  useEffect(() => {
    loadClasses()
  }, [user])

  async function openDetail(cls: ClassRoom) {
    setDetail(cls)
    setDetailLoading(true)
    const [enrolledRes, studentsRes] = await Promise.all([
      supabase
        .from('class_students')
        .select('students(*)')
        .eq('class_id', cls.id)
        .eq('is_active', true),
      supabase.from('students').select('*').eq('school_id', user!.school_id).eq('is_active', true).order('last_name'),
    ])
    const enrolledList = ((enrolledRes.data || []) as unknown as (ClassStudent & { students: Student })[])
      .map((e) => e.students)
      .filter(Boolean)
    setEnrolled(enrolledList)
    setAllStudents((studentsRes.data as Student[]) || [])
    setDetailLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(cls: ClassRoom) {
    setEditing(cls)
    setForm({ name: cls.name, level: cls.level || '', capacity: cls.capacity, room: cls.room || '' })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = { ...form, school_id: user.school_id, is_active: true }
    if (editing) {
      await supabase.from('classes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('classes').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadClasses()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('classes').update({ is_active: false }).eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadClasses()
  }

  async function enroll(student: Student) {
    if (!detail) return
    if (!user) return
    await supabase.from('class_students').insert({
      class_id: detail.id,
      student_id: student.id,
      school_id: user.school_id,
      is_active: true,
      enrolled_at: new Date().toISOString(),
    })
    openDetail(detail)
  }

  async function unenroll(student: Student) {
    if (!detail) return
    await supabase
      .from('class_students')
      .update({ is_active: false })
      .eq('class_id', detail.id)
      .eq('student_id', student.id)
    openDetail(detail)
  }

  const enrolledIds = new Set(enrolled.map((s) => s.id))
  const available = allStudents.filter((s) => !enrolledIds.has(s.id))

  const filtered = classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title={t('classes.title')}
        subtitle={t('classes.subtitle')}
        action={
          !isTeacher && (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('classes.add')}
            </button>
          )
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('classes.search')} />
      </div>

      {classes.length === 0 && !loading ? (
        <EmptyState
          icon={<Library size={32} />}
          title={t('classes.empty')}
          description={t('classes.emptyDescription')}
          action={
            !isTeacher && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('classes.add')}
              </button>
            )
          }
        />
      ) : (
        <DataTable<ClassRoom & { student_count?: number }>
          loading={loading}
          emptyMessage={t('classes.noResults')}
          data={filtered}
          onRowClick={openDetail}
          columns={[
            {
              key: 'name',
              label: t('classes.name'),
              render: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
            },
            { key: 'level', label: t('classes.level'), render: (c) => c.level || '—' },
            { key: 'capacity', label: t('classes.capacity'), render: (c) => c.capacity },
            { key: 'room', label: t('classes.room'), render: (c) => c.room || '—' },
            {
              key: 'student_count',
              label: t('classes.studentCount'),
              render: (c) => <Badge color="blue">{c.student_count || 0}</Badge>,
            },
          ]}
          actions={
            !isTeacher
              ? (c) => (
                  <>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                      title={t('common.edit')}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                      title={t('common.delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )
              : undefined
          }
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('classes.edit') : t('classes.add')}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t('classes.name')}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label={t('classes.level')}>
            <input className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </Field>
          <Field label={t('classes.capacity')}>
            <input
              type="number"
              min={0}
              className="input"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('classes.room')}>
            <input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
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
        title={t('classes.deleteTitle')}
        message={t('classes.deleteMessage', { name: deleteTarget?.name || '' })}
        confirmLabel={t('common.delete')}
        danger
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.name : ''}
        size="xl"
      >
        {detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoField label={t('classes.level')} value={detail.level} />
              <InfoField label={t('classes.capacity')} value={String(detail.capacity)} />
              <InfoField label={t('classes.room')} value={detail.room} />
              <InfoField label={t('classes.enrolled')} value={String(enrolled.length)} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('classes.enrolledStudents')}</h3>
              {detailLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : enrolled.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {enrolled.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">
                        {s.last_name} {s.first_name}
                        <span className="text-xs text-gray-400 ml-2">{s.enrollment_number || ''}</span>
                      </span>
                      {!isTeacher && (
                        <button
                          onClick={() => unenroll(s)}
                          className="btn-secondary text-xs py-1 px-2"
                        >
                          <UserMinus size={14} className="inline -mt-0.5 mr-1" />
                          {t('classes.unenroll')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isTeacher && !detailLoading && available.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('classes.availableStudents')}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {available.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">
                        {s.last_name} {s.first_name}
                        <span className="text-xs text-gray-400 ml-2">{s.enrollment_number || ''}</span>
                      </span>
                      <button onClick={() => enroll(s)} className="btn-primary text-xs py-1 px-2">
                        <UserPlus size={14} className="inline -mt-0.5 mr-1" />
                        {t('classes.enroll')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
