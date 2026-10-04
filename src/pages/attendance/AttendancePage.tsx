import { useState } from 'react'
import { useClasses, useStudents } from '@/hooks/useData'
import { useAuth, hasRole } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, CalendarCheck, Check, X, Clock } from 'lucide-react'
import { ATTENDANCE_STATUS_LABELS } from '@/lib/constants'
import type { Student } from '@/lib/types'

export default function AttendancePage() {
  const { profile } = useAuth()
  const { data: classes } = useClasses()
  const { data: students } = useStudents()
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canEdit = hasRole(profile, 'admin_principal', 'direction', 'enseignant')

  const classStudents: Student[] = (students ?? []).filter((s) => {
    // For now, show all students since class_students filtering needs class selection
    return s.is_active
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id || !selectedClass) return
    setSaving(true)
    setSaved(false)

    const rows = Object.entries(records).map(([studentId, status]) => ({
      school_id: profile.school_id!,
      student_id: studentId,
      class_id: selectedClass,
      date,
      status,
      recorded_by: profile.id,
    }))

    if (rows.length === 0) {
      setSaving(false)
      return
    }

    const { error } = await supabase.from('attendance').upsert(rows, {
      onConflict: 'student_id,class_id,date',
    })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Classe</label>
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Sélectionner...</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            {saved && (
              <span className="text-sm text-success-600 flex items-center gap-1">
                <Check size={16} /> Enregistré !
              </span>
            )}
          </div>
        </div>
      </div>

      {!selectedClass ? (
        <div className="card p-12 text-center">
          <CalendarCheck size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Sélectionnez une classe pour saisir les présences.</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">Aucun élève dans cette classe.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Élève</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {(['present', 'absent', 'late', 'excused'] as const).map((status) => {
                        const Icon = status === 'present' ? Check : status === 'absent' ? X : Clock
                        const isActive = (records[student.id] ?? 'present') === status
                        const colors: Record<string, string> = {
                          present: isActive ? 'bg-success-500 text-white' : 'text-success-600 bg-success-50',
                          absent: isActive ? 'bg-error-500 text-white' : 'text-error-600 bg-error-50',
                          late: isActive ? 'bg-warning-500 text-white' : 'text-warning-600 bg-warning-50',
                          excused: isActive ? 'bg-blue-500 text-white' : 'text-blue-600 bg-blue-50',
                        }
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setRecords((r) => ({ ...r, [student.id]: status }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${colors[status]}`}
                            disabled={!canEdit}
                          >
                            <Icon size={12} />
                            {ATTENDANCE_STATUS_LABELS[status]}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {canEdit && (
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Enregistrer les présences
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
