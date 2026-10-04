import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useStudents } from '@/hooks/useData'
import { Loader2, Wallet, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { formatFCFA, formatDate, FEE_STATUS_LABELS, FEE_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { FeeStructure, StudentFee, Payment } from '@/lib/types'

export default function FinancePage() {
  const { profile } = useAuth()
  const { data: students } = useStudents()
  const [tab, setTab] = useState<'fees' | 'structures' | 'payments'>('fees')

  const { data: fees, isLoading: feesLoading } = useQuery<StudentFee[]>({
    queryKey: ['student-fees', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('student_fees')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as StudentFee[]
    },
    enabled: !!profile?.school_id,
  })

  const { data: structures } = useQuery<FeeStructure[]>({
    queryKey: ['fee-structures', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as FeeStructure[]
    },
    enabled: !!profile?.school_id,
  })

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ['payments', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return []
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!profile?.school_id,
  })

  const totalDue = (fees ?? []).reduce((sum, f) => sum + Number(f.amount), 0)
  const totalPaid = (fees ?? []).reduce((sum, f) => sum + Number(f.amount_paid), 0)
  const totalPayments = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total dû</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatFCFA(totalDue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total encaissé</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{formatFCFA(totalPaid)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Paiements</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{formatFCFA(totalPayments)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'fees' as const, label: 'Frais par élève' },
          { key: 'structures' as const, label: 'Structures de frais' },
          { key: 'payments' as const, label: 'Paiements' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Fees tab */}
      {tab === 'fees' && (
        feesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
        ) : (fees ?? []).length === 0 ? (
          <div className="card p-12 text-center">
            <Wallet size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Aucun frais assigné.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Élève</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Montant</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Payé</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(fees ?? []).map((f) => {
                  const student = (students ?? []).find((s) => s.id === f.student_id)
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{student ? `${student.first_name} ${student.last_name}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatFCFA(Number(f.amount))}</td>
                      <td className="px-4 py-3 text-right text-success-600">{formatFCFA(Number(f.amount_paid))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${FEE_STATUS_COLORS[f.status] ?? ''}`}>{FEE_STATUS_LABELS[f.status] ?? f.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(f.due_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Structures tab */}
      {tab === 'structures' && (
        (structures ?? []).length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-400 text-sm">Aucune structure de frais. Créez-en une pour générer les frais par élève.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(structures ?? []).map((s) => (
              <div key={s.id} className="card p-5">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">{formatFCFA(Number(s.amount))}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="badge bg-primary-50 text-primary-600">{s.fee_type}</span>
                  {s.is_recurring && <span className="badge bg-accent-50 text-accent-600">Récurrent</span>}
                </div>
                {s.due_date && <p className="text-xs text-slate-400 mt-2">Échéance: {formatDate(s.due_date)}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* Payments tab */}
      {tab === 'payments' && (
        (payments ?? []).length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-400 text-sm">Aucun paiement enregistré.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Élève</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Montant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Méthode</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Référence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payments ?? []).map((p) => {
                  const student = (students ?? []).find((s) => s.id === p.student_id)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{student ? `${student.first_name} ${student.last_name}` : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-success-600">{formatFCFA(Number(p.amount))}</td>
                      <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 text-slate-500">{p.reference ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
