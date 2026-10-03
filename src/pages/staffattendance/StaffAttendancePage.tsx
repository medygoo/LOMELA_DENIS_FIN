import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Staff, StaffAttendance } from '../../types'
import { PageHeader, EmptyState, Badge } from '../../components/ui/DataTable'
import { Save, CalendarCheck, Briefcase } from 'lucide-react'

type Status = 'present' | 'absent' | 'late' | 'leave'

const STATUS_OPTIONS: Status[] = ['present', 'absent', 'late', 'leave']

const statusColors: Record<Status, string> = {
  present: 'bg-accent-100 text-accent-700 border-accent-300',
  absent: 'bg-error-100 text-error-700 border-error-300',
  late: 'bg-warning-100 text-warning-700 border-warning-300',
  leave: 'bg-primary-100 text-primary-700 border-primary-300',
}

const statusDot: Record<Status, string> = {
  present: 'bg-accent-500',
  absent: 'bg-error-500',
  late: 'bg-warning-500',
  leave: 'bg-primary-500',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function StaffAttendancePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [staff, setStaff] = useState<Staff[]>([])
  const [attendance, setAttendance] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const canEdit = user?.role === 'admin_principal' || user?.role === 'direction'

  useEffect(() => {
    loadStaff()
  }, [user])

  useEffect(() => {
    if (user) loadAttendance()
  }, [date, user])

  async function loadStaff() {
    if (!user) return
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('is_active', true)
      .order('last_name', { ascending: true })
    setStaff((data as Staff[]) || [])
  }

  async function loadAttendance() {
    if (!user) return
    setLoading(true)
    setSavedMsg(false)

    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('date', date)

    const map: Record<string, Status> = {}
    for (const rec of (existing as StaffAttendance[]) || []) {
      map[rec.staff_id] = rec.status
    }

    const initial: Record<string, Status> = {}
    for (const s of staff) {
      initial[s.id] = map[s.id] || 'present'
    }
    setAttendance(initial)
    setLoading(false)
  }

  function setStatus(staffId: string, status: Status) {
    setAttendance((prev) => ({ ...prev, [staffId]: status }))
  }

  async function save() {
    if (!user) return
    setSaving(true)

    const records = staff.map((s) => ({
      school_id: user.school_id,
      staff_id: s.id,
      date,
      status: attendance[s.id] || 'present',
      check_in_time: (attendance[s.id] || 'present') === 'present' ? new Date().toISOString() : null,
      check_out_time: null,
      notes: null,
    }))

    await supabase
      .from('staff_attendance')
      .upsert(records, { onConflict: 'staff_id,date' })

    setSaving(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  // i18n keys for staff attendance statuses reuse attendance keys where available
  const statusLabel = (s: Status) => {
    if (s === 'leave') return t('staffAttendance.leave', 'Congé')
    return t(`attendance.${s}`)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.staffAttendance')}
        subtitle={t('attendance.takeAttendance')}
        action={
          canEdit && staff.length > 0 ? (
            <button onClick={save} disabled={saving || loading} className="btn-primary">
              <Save size={18} className="inline -mt-0.5 mr-1" />
              {saving ? t('common.loading') : t('attendance.saveAttendance')}
            </button>
          ) : undefined
        }
      />

      <div className="card p-4 mb-6">
        <label className="block max-w-xs">
          <span className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.selectDate')}</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {savedMsg && (
        <div className="mb-4 rounded-xl bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-accent-700">
          {t('attendance.attendanceSaved')}
        </div>
      )}

      {loading ? (
        <div className="card py-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
      ) : staff.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title={t('common.noData')} description={t('staff.title')} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('staff.name')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('staff.role')}
                  </th>
                  {STATUS_OPTIONS.map((s) => (
                    <th key={s} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {statusLabel(s)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">
                        {s.last_name} {s.first_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color="blue">{t(`roles.${s.role}`, s.role)}</Badge>
                    </td>
                    {STATUS_OPTIONS.map((s_opt) => {
                      const active = attendance[s.id] === s_opt
                      return (
                        <td key={s_opt} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setStatus(s.id, s_opt)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                              active ? statusColors[s_opt] : 'border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${active ? statusDot[s_opt] : 'bg-gray-300'}`} />
                            {statusLabel(s_opt)}
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
