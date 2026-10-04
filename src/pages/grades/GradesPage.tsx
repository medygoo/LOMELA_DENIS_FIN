import { Loader2, ClipboardList, BookOpen } from 'lucide-react'
import { useStudents } from '@/hooks/useData'
import { formatDate } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useAuth, hasRole } from '@/hooks/useAuth'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Grade, Homework } from '@/lib/types'

export default function GradesPage() {
  const { profile } = useAuth()
  const { data: students, isLoading: studentsLoading } = useStudents()
  const [selectedStudent, setSelectedStudent] = useState<string>('')

  const { data: grades, isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ['grades', profile?.school_id, selectedStudent],
    queryFn: async () => {
      if (!profile?.school_id) return []
      let q = supabase.from('grades').select('*').eq('school_id', profile.school_id)
      if (selectedStudent) q = q.eq('student_id', selectedStudent)
      const { data, error } = await q.order('grade_date', { ascending: false })
      if (error) throw error
      return data as Grade[]
    },
    enabled: !!profile?.school_id,
  })

  const { data: homeworks } = useQuery<Homework[]>({
    queryKey: ['homework', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('homework')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('due_date', { ascending: false })
      if (error) throw error
      return data as Homework[]
    },
    enabled: !!profile?.school_id,
  })

  if (studentsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
  }

  return (
    <div className="space-y-6">
      {/* Grades */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
        </div>

        {(students ?? []).length > 0 && (
          <div className="mb-4">
            <select className="input max-w-xs" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
              <option value="">Tous les élèves</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
        )}

        {gradesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
        ) : (grades ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucune note enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Élève</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Type</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Titre</th>
                <th className="text-center px-3 py-2 font-medium text-slate-600">Note</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(grades ?? []).map((g) => {
                const student = (students ?? []).find((s) => s.id === g.student_id)
                return (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900">{student ? `${student.first_name} ${student.last_name}` : '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{g.grade_type}</td>
                    <td className="px-3 py-2 text-slate-600">{g.title ?? '—'}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-900">{g.score}/{g.max_score}</td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(g.grade_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Homework */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Devoirs à faire</h3>
        </div>
        {(homeworks ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucun devoir programmé.</p>
        ) : (
          <div className="space-y-3">
            {(homeworks ?? []).map((hw) => (
              <div key={hw.id} className="border border-slate-200 rounded-lg p-4">
                <p className="font-medium text-slate-900">{hw.title}</p>
                {hw.description && <p className="text-sm text-slate-600 mt-1">{hw.description}</p>}
                <p className="text-xs text-slate-400 mt-2">À rendre le {formatDate(hw.due_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
