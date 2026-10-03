import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { EntryExit, Student, AuthorizedPerson, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Plus, LogIn, LogOut, DoorOpen } from 'lucide-react'

interface EntryExitRow extends EntryExit {
  students: Student | null
  authorized_persons: AuthorizedPerson | null
}

interface RecordForm {
  student_id: string
  method: string
  notes: string
  authorized_person_id: string
}

const emptyForm: RecordForm = {
  student_id: '',
  method: 'manual',
  notes: '',
  authorized_person_id: '',
}

export function EntriesExitsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [movements, setMovements] = useState<EntryExitRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<RecordForm>(emptyForm)
  const [recordType, setRecordType] = useState<'entry' | 'exit'>('entry')
  const [saving, setSaving] = useState(false)

  const isParent = user?.role === 'parent_tuteur'
  const canRecord = !isParent

  useEffect(() => {
    loadMovements()
    loadStudents()
  }, [user])

  async function loadMovements() {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    let query = supabase
      .from('entries_exits')
      .select('*, students(*), authorized_persons(*)')
      .eq('school_id', user.school_id)
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`)
      .order('timestamp', { ascending: false })

    if (isParent) {
      const { data: links } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardians.user_id', user.id)
      const ids = ((links as unknown as (StudentGuardian & { student_id: string })[]) || []).map((l) => l.student_id)
      if (ids.length > 0) {
        query = query.in('student_id', ids)
      }
    }

    const { data } = await query
    setMovements((data as EntryExitRow[]) || [])
    setLoading(false)
  }

  async function loadStudents() {
    if (!user || isParent) return
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('is_active', true)
      .order('last_name', { ascending: true })
    setStudents((data as Student[]) || [])
  }

  async function loadAuthorizedPersons(studentId: string) {
    const { data } = await supabase
      .from('authorized_persons')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
    setAuthorizedPersons((data as AuthorizedPerson[]) || [])
  }

  function openRecord(type: 'entry' | 'exit') {
    setRecordType(type)
    setForm({ ...emptyForm, student_id: students[0]?.id || '' })
    setFormOpen(true)
    if (students[0]?.id) loadAuthorizedPersons(students[0].id)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { data } = await supabase
      .from('entries_exits')
      .insert({
        school_id: user.school_id,
        student_id: form.student_id,
        type: recordType,
        timestamp: new Date().toISOString(),
        recorded_by: user.id,
        method: form.method,
        notes: form.notes || null,
        authorized_person_id: recordType === 'exit' && form.authorized_person_id ? form.authorized_person_id : null,
      })
      .select()
    setSaving(false)
    setFormOpen(false)
    loadMovements()
  }

  return (
    <div>
      <PageHeader
        title={t('entriesExits.title')}
        subtitle={t('entriesExits.todayMovements')}
        action={
          canRecord ? (
            <div className="flex gap-2">
              <button onClick={() => openRecord('entry')} className="btn-primary">
                <LogIn size={18} className="inline -mt-0.5 mr-1" />
                {t('entriesExits.recordEntry')}
              </button>
              <button onClick={() => openRecord('exit')} className="btn-secondary">
                <LogOut size={18} className="inline -mt-0.5 mr-1" />
                {t('entriesExits.recordExit')}
              </button>
            </div>
          ) : undefined
        }
      />

      {movements.length === 0 && !loading ? (
        <EmptyState icon={<DoorOpen size={32} />} title={t('common.noData')} description={t('entriesExits.todayMovements')} />
      ) : (
        <DataTable<EntryExitRow>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={movements}
          columns={[
            {
              key: 'student',
              label: t('grades.student'),
              render: (m) => (
                <span className="font-medium text-gray-900">
                  {m.students ? `${m.students.last_name} ${m.students.first_name}` : '—'}
                </span>
              ),
            },
            {
              key: 'type',
              label: t('entriesExits.title'),
              render: (m) =>
                m.type === 'entry' ? (
                  <Badge color="green">
                    <LogIn size={12} className="inline mr-1" />
                    {t('entriesExits.entry')}
                  </Badge>
                ) : (
                  <Badge color="red">
                    <LogOut size={12} className="inline mr-1" />
                    {t('entriesExits.exit')}
                  </Badge>
                ),
            },
            {
              key: 'timestamp',
              label: t('entriesExits.time'),
              render: (m) => new Date(m.timestamp).toLocaleTimeString(),
            },
            {
              key: 'method',
              label: t('entriesExits.method'),
              render: (m) => (
                <Badge color={m.method === 'qr' ? 'blue' : 'gray'}>
                  {m.method === 'qr' ? t('entriesExits.qr') : t('entriesExits.manual')}
                </Badge>
              ),
            },
            {
              key: 'authorized_person',
              label: t('entriesExits.authorizedPerson'),
              render: (m) =>
                m.authorized_persons
                  ? `${m.authorized_persons.first_name} ${m.authorized_persons.last_name}`
                  : '—',
            },
          ]}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={recordType === 'entry' ? t('entriesExits.recordEntry') : t('entriesExits.recordExit')}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <Field label={t('grades.student')}>
            <select
              className="input"
              value={form.student_id}
              onChange={(e) => {
                setForm({ ...form, student_id: e.target.value, authorized_person_id: '' })
                loadAuthorizedPersons(e.target.value)
              }}
              required
            >
              <option value="">{t('common.selectOption')}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name} {s.first_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('entriesExits.method')}>
            <select
              className="input"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option value="manual">{t('entriesExits.manual')}</option>
              <option value="qr">{t('entriesExits.qr')}</option>
            </select>
          </Field>
          {recordType === 'exit' && (
            <Field label={t('entriesExits.authorizedPerson')}>
              <select
                className="input"
                value={form.authorized_person_id}
                onChange={(e) => setForm({ ...form, authorized_person_id: e.target.value })}
              >
                <option value="">{t('common.none')}</option>
                {authorizedPersons.map((ap) => (
                  <option key={ap.id} value={ap.id}>
                    {ap.first_name} {ap.last_name} ({ap.relationship})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t('grades.comments')}>
            <textarea
              className="input min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
