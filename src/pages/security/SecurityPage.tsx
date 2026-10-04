import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useStudents } from '@/hooks/useData'
import { Loader2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { formatDateTime, ENTRY_EXIT_LABELS } from '@/lib/constants'
import type { EntryExit, AuthorizedPerson } from '@/lib/types'

export default function SecurityPage() {
  const { profile } = useAuth()
  const { data: students } = useStudents()

  const { data: entries, isLoading } = useQuery<EntryExit[]>({
    queryKey: ['entries-exits', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('entries_exits')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('timestamp', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as EntryExit[]
    },
    enabled: !!profile?.school_id,
  })

  const { data: authPersons } = useQuery<AuthorizedPerson[]>({
    queryKey: ['authorized-persons', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('authorized_persons')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
      if (error) throw error
      return data as AuthorizedPerson[]
    },
    enabled: !!profile?.school_id,
  })

  return (
    <div className="space-y-6">
      {/* Entries/exits */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Entrées et sorties récentes</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
        ) : (entries ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucune entrée/sortie enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {(entries ?? []).map((e) => {
              const student = (students ?? []).find((s) => s.id === e.student_id)
              const isEntry = e.type === 'entry'
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isEntry ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'
                  }`}>
                    {isEntry ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {student ? `${student.first_name} ${student.last_name}` : 'Élève inconnu'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ENTRY_EXIT_LABELS[e.type] ?? e.type} · {e.method}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(e.timestamp)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Authorized persons */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Personnes autorisées</h3>
        {(authPersons ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucune personne autorisée enregistrée.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(authPersons ?? []).map((p) => {
              const student = (students ?? []).find((s) => s.id === p.student_id)
              return (
                <div key={p.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center text-sm font-semibold">
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-500">{p.relationship ?? '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    {student && <p>Élève: {student.first_name} {student.last_name}</p>}
                    {p.phone && <p>Tél: {p.phone}</p>}
                    {p.id_number && <p>Pièce: {p.id_number}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
