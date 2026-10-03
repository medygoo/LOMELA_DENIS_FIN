import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Student, ClassRoom, Attendance, TeacherAssignment, ClassStudent } from '../../types'
import { PageHeader, EmptyState } from '../../components/ui/DataTable'
import { Save, CalendarCheck, ClipboardCheck } from 'lucide-react'

type Status = 'present' | 'absent' | 'late' | 'excused'

const STATUS_OPTIONS: Status[] = ['present', 'absent', 'late', 'excused']

const statusColors: Record<Status, string> = {
  present: 'bg-accent-100 text-accent-700 border-accent-300',
  absent: 'bg-error-100 text-error-700 border-error-300',
  late: 'bg-warning-100 text-warning-700 border-warning-300',
  excused: 'bg-primary-100 text-primary-700 border-primary-300',
}

const statusDot: Record<Status, string> = {
  present: 'bg-accent-500',
  absent: 'bg-error-500',
  late: 'bg-warning-500',
  excused: 'bg-primary-500',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

interface EnrollmentRow extends ClassStudent {
  students: Student
}

export function AttendancePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(todayISO())
  const [students, setStudents] = useState<EnrollmentRow[]>([])
  const [attendance, setAttendance] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const isTeacher = user?.role === 'enseignant'

  useEffect(() => {
    async function loadClasses() {
      if (!user) return
      let list: ClassRoom[] = []

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
            list.push(a.classes)
          }
        }
      } else {
        const { data } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .order('name', { ascending: true })
        list = (data as ClassRoom[]) || []
      }

      setClasses(list)
      if (list.length > 0) setSelectedClass(list[0].id)
    }
    loadClasses()
  }, [user])

  useEffect(() => {
    if (selectedClass) loadStudentsAndAttendance()
  }, [selectedClass, date])

  async function loadStudentsAndAttendance() {
    if (!user || !selectedClass) return
    setLoading(true)
    setSavedMsg(false)

    const { data: enrollments } = await supabase
      .from('class_students')
      .select('*, students(*)')
      .eq('class_id', selectedClass)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: true })

    const rows = (enrollments as unknown as EnrollmentRow[]) || []
    setStudents(rows)

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', selectedClass)
      .eq('date', date)
      .eq('school_id', user.school_id)

    const map: Record<string, Status> = {}
    for (const rec of (existing as Attendance[]) || []) {
      map[rec.student_id] = rec.status
    }
    // Default everyone to present if no record exists yet
    const initial: Record<string, Status> = {}
    for (const r of rows) {
      initial[r.student_id] = map[r.student_id] || 'present'
    }
    setAttendance(initial)
    setLoading(false)
  }

  function setStatus(studentId: string, status: Status) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  async function save() {
    if (!user || !selectedClass) return
    setSaving(true)

    const records = students.map((r) => ({
      school_id: user.school_id,
      student_id: r.student_id,
      class_id: selectedClass,
      date,
      status: attendance[r.student_id] || 'present',
      recorded_by: user.id,
    }))

    // Upsert all records at once keyed on class_id + student_id + date
    await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'class_id,student_id,date' })

    setSaving(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  const canEdit = user?.role === 'enseignant' || user?.role === 'admin_principal' || user?.role === 'direction'

  return (
    <div>
      <PageHeader
        title={t('attendance.title')}
        subtitle={t('attendance.takeAttendance')}
        action={
          canEdit && students.length > 0 ? (
            <button onClick={save} disabled={saving || loading} className="btn-primary">
              <Save size={18} className="inline -mt-0.5 mr-1" />
              {saving ? t('common.loading') : t('attendance.saveAttendance')}
            </button>
          ) : undefined
        }
      />

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="block flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.selectClass')}</span>
            <select
              className="input"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.length === 0 && <option value="">{t('common.selectOption')}</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.selectDate')}</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 rounded-xl bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-accent-700">
          {t('attendance.attendanceSaved')}
        </div>
      )}

      {!selectedClass ? (
        <EmptyState
          icon={<CalendarCheck size={32} />}
          title={t('attendance.selectClass')}
          description={t('attendance.takeAttendance')}
        />
      ) : loading ? (
        <div className="card py-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={32} />}
          title={t('common.noData')}
          description={t('students.title')}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('grades.student')}
                  </th>
                  {STATUS_OPTIONS.map((s) => (
                    <th key={s} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t(`attendance.${s}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((r) => (
                  <tr key={r.student_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">
                        {r.students.last_name} {r.students.first_name}
                      </span>
                    </td>
                    {STATUS_OPTIONS.map((s) => {
                      const active = attendance[r.student_id] === s
                      return (
                        <td key={s} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setStatus(r.student_id, s)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                              active ? statusColors[s] : 'border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${active ? statusDot[s] : 'bg-gray-300'}`} />
                            {t(`attendance.${s}`)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
