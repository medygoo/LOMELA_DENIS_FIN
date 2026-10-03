import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { FeeStructure, StudentFee, Student, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'

const FEE_TYPES = ['scolarite', 'inscription', 'canteen', 'transport', 'activite', 'autre']
const RECURRING_PERIODS = ['monthly', 'quarterly', 'annual']

interface StudentFeeRow extends StudentFee {
  students: Student | null
  fee_structures: FeeStructure | null
}

interface FeeStructureForm {
  name: string
  fee_type: string
  amount: string
  due_date: string
  is_recurring: boolean
  recurring_period: string
  description: string
}

interface StudentFeeForm {
  student_id: string
  fee_structure_id: string
  due_date: string
}

const emptyStructureForm: FeeStructureForm = {
  name: '',
  fee_type: 'scolarite',
  amount: '',
  due_date: '',
  is_recurring: false,
  recurring_period: 'monthly',
  description: '',
}

const emptyStudentFeeForm: StudentFeeForm = {
  student_id: '',
  fee_structure_id: '',
  due_date: '',
}

function formatFCFA(n: number) {
  return Number(n).toLocaleString() + ' FCFA'
}

export function FeesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab] = useState<'structures' | 'studentFees'>('structures')
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [studentFees, setStudentFees] = useState<StudentFeeRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [childStudentIds, setChildStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [structureFormOpen, setStructureFormOpen] = useState(false)
  const [studentFeeFormOpen, setStudentFeeFormOpen] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [structureForm, setStructureForm] = useState<FeeStructureForm>(emptyStructureForm)
  const [studentFeeForm, setStudentFeeForm] = useState<StudentFeeForm>(emptyStudentFeeForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | StudentFee | null>(null)

  const isParent = user?.role === 'parent_tuteur'
  const canEdit = user?.role === 'admin_principal' || user?.role === 'direction' || user?.role === 'caisse'

  useEffect(() => {
    async function loadAll() {
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
        await loadStudentFees(ids)
        setLoading(false)
        return
      }

      const { data: structs } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true })
      setStructures((structs as FeeStructure[]) || [])

      const { data: studs } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('last_name', { ascending: true })
      setStudents((studs as Student[]) || [])

      await loadStudentFees()
      setLoading(false)
    }
    loadAll()
  }, [user])

  async function loadStudentFees(ids?: string[]) {
    if (!user) return
    let query = supabase
      .from('student_fees')
      .select('*, students(*), fee_structures(*)')
      .eq('school_id', user.school_id)
      .order('created_at', { ascending: false })
    if (ids && ids.length > 0) {
      query = query.in('student_id', ids)
    }
    const { data } = await query
    setStudentFees((data as StudentFeeRow[]) || [])
  }

  function openAddStructure() {
    setEditingStructure(null)
    setStructureForm(emptyStructureForm)
    setStructureFormOpen(true)
  }

  function openEditStructure(fs: FeeStructure) {
    setEditingStructure(fs)
    setStructureForm({
      name: fs.name,
      fee_type: fs.fee_type,
      amount: String(fs.amount),
      due_date: fs.due_date || '',
      is_recurring: fs.is_recurring,
      recurring_period: fs.recurring_period || 'monthly',
      description: fs.description || '',
    })
    setStructureFormOpen(true)
  }

  async function saveStructure(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = {
      school_id: user.school_id,
      name: structureForm.name,
      fee_type: structureForm.fee_type,
      amount: Number(structureForm.amount),
      due_date: structureForm.due_date || null,
      is_recurring: structureForm.is_recurring,
      recurring_period: structureForm.is_recurring ? structureForm.recurring_period : null,
      description: structureForm.description || null,
      is_active: true,
    }
    if (editingStructure) {
      await supabase.from('fee_structures').update(payload).eq('id', editingStructure.id)
    } else {
      await supabase.from('fee_structures').insert(payload)
    }
    setSaving(false)
    setStructureFormOpen(false)
    reloadStructures()
  }

  async function reloadStructures() {
    if (!user) return
    const { data } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('school_id', user.school_id)
      .order('name', { ascending: true })
    setStructures((data as FeeStructure[]) || [])
  }

  function openAddStudentFee() {
    setStudentFeeForm({ ...emptyStudentFeeForm, due_date: new Date().toISOString().slice(0, 10) })
    setStudentFeeFormOpen(true)
  }

  async function saveStudentFee(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const struct = structures.find((s) => s.id === studentFeeForm.fee_structure_id)
    const payload = {
      school_id: user.school_id,
      student_id: studentFeeForm.student_id,
      fee_structure_id: studentFeeForm.fee_structure_id || null,
      amount: struct?.amount || 0,
      amount_paid: 0,
      due_date: studentFeeForm.due_date || null,
      status: 'unpaid',
    }
    await supabase.from('student_fees').insert(payload)
    setSaving(false)
    setStudentFeeFormOpen(false)
    loadStudentFees()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if ('fee_type' in deleteTarget) {
      await supabase.from('fee_structures').delete().eq('id', deleteTarget.id)
      reloadStructures()
    } else {
      await supabase.from('student_fees').delete().eq('id', deleteTarget.id)
      loadStudentFees()
    }
    setDeleteTarget(null)
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'paid':
        return <Badge color="green">{t('fees.paid')}</Badge>
      case 'partial':
        return <Badge color="yellow">{t('fees.partial')}</Badge>
      case 'overdue':
        return <Badge color="red">{t('fees.overdue')}</Badge>
      default:
        return <Badge color="gray">{t('fees.unpaid')}</Badge>
    }
  }

  return (
    <div>
      <PageHeader
        title={t('fees.title')}
        subtitle={t('fees.status')}
        action={
          canEdit ? (
            tab === 'structures' ? (
              <button onClick={openAddStructure} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('fees.addFee')}
              </button>
            ) : (
              <button onClick={openAddStudentFee} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('fees.assignToStudent')}
              </button>
            )
          ) : undefined
        }
      />

      {!isParent && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('structures')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'structures' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('fees.title')}
          </button>
          <button
            onClick={() => setTab('studentFees')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'studentFees' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('fees.studentFees')}
          </button>
        </div>
      )}

      {(isParent || tab === 'structures') && !isParent && (
        <DataTable<FeeStructure>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={structures}
          columns={[
            {
              key: 'name',
              label: t('common.name'),
              render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
            },
            {
              key: 'fee_type',
              label: t('fees.feeType'),
              render: (s) => <Badge color="blue">{t(`fees.${s.fee_type}`, s.fee_type)}</Badge>,
            },
            {
              key: 'amount',
              label: t('fees.amount'),
              render: (s) => <span className="font-semibold text-gray-900">{formatFCFA(s.amount)}</span>,
            },
            {
              key: 'due_date',
              label: t('fees.dueDate'),
              render: (s) => (s.due_date ? new Date(s.due_date).toLocaleDateString() : '—'),
            },
            {
              key: 'is_recurring',
              label: t('fees.isRecurring'),
              render: (s) =>
                s.is_recurring ? (
                  <Badge color="green">
                    {t('common.yes')} · {t(`fees.${s.recurring_period || 'monthly'}`)}
                  </Badge>
                ) : (
                  <Badge color="gray">{t('common.no')}</Badge>
                ),
            },
          ]}
          actions={(s) =>
            canEdit ? (
              <>
                <button
                  onClick={() => openEditStructure(s)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                  title={t('common.edit')}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
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

      {(isParent || tab === 'studentFees') && (
        <>
          {studentFees.length === 0 && !loading ? (
            <EmptyState icon={<Wallet size={32} />} title={t('common.noData')} description={t('fees.studentFees')} />
          ) : (
            <DataTable<StudentFeeRow>
              loading={loading}
              emptyMessage={t('common.noData')}
              data={studentFees}
              columns={[
                {
                  key: 'student',
                  label: t('grades.student'),
                  render: (f) => (
                    <span className="font-medium text-gray-900">
                      {f.students ? `${f.students.last_name} ${f.students.first_name}` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'fee',
                  label: t('fees.title'),
                  render: (f) => f.fee_structures?.name || '—',
                },
                {
                  key: 'amount',
                  label: t('fees.amount'),
                  render: (f) => formatFCFA(f.amount),
                },
                {
                  key: 'amount_paid',
                  label: t('fees.amountPaid'),
                  render: (f) => <span className="text-accent-600">{formatFCFA(f.amount_paid)}</span>,
                },
                {
                  key: 'remaining',
                  label: t('fees.remaining'),
                  render: (f) => (
                    <span className={f.amount - f.amount_paid > 0 ? 'text-error-600 font-medium' : 'text-gray-400'}>
                      {formatFCFA(f.amount - f.amount_paid)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: t('fees.status'),
                  render: (f) => statusBadge(f.status),
                },
              ]}
              actions={(f) =>
                canEdit && !isParent ? (
                  <button
                    onClick={() => setDeleteTarget(f)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                    title={t('common.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                ) : undefined
              }
            />
          )}
        </>
      )}

      {/* Fee Structure Modal */}
      <Modal
        open={structureFormOpen}
        onClose={() => setStructureFormOpen(false)}
        title={editingStructure ? t('fees.editFee') : t('fees.addFee')}
        size="lg"
      >
        <form onSubmit={saveStructure} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('common.name')}>
              <input
                className="input"
                value={structureForm.name}
                onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label={t('fees.feeType')}>
              <select
                className="input"
                value={structureForm.fee_type}
                onChange={(e) => setStructureForm({ ...structureForm, fee_type: e.target.value })}
              >
                {FEE_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {t(`fees.${ft}`, ft)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('fees.amount')}>
              <input
                type="number"
                className="input"
                value={structureForm.amount}
                onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
                required
              />
            </Field>
            <Field label={t('fees.dueDate')}>
              <input
                type="date"
                className="input"
                value={structureForm.due_date}
                onChange={(e) => setStructureForm({ ...structureForm, due_date: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={structureForm.is_recurring}
              onChange={(e) => setStructureForm({ ...structureForm, is_recurring: e.target.checked })}
              className="rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700">{t('fees.isRecurring')}</span>
          </label>
          {structureForm.is_recurring && (
            <Field label={t('fees.recurringPeriod')}>
              <select
                className="input"
                value={structureForm.recurring_period}
                onChange={(e) => setStructureForm({ ...structureForm, recurring_period: e.target.value })}
              >
                {RECURRING_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {t(`fees.${p}`, p)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t('subjects.description')}>
            <textarea
              className="input min-h-[80px]"
              value={structureForm.description}
              onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setStructureFormOpen(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Fee Modal */}
      <Modal
        open={studentFeeFormOpen}
        onClose={() => setStudentFeeFormOpen(false)}
        title={t('fees.assignToStudent')}
        size="md"
      >
        <form onSubmit={saveStudentFee} className="space-y-4">
          <Field label={t('grades.student')}>
            <select
              className="input"
              value={studentFeeForm.student_id}
              onChange={(e) => setStudentFeeForm({ ...studentFeeForm, student_id: e.target.value })}
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
          <Field label={t('fees.title')}>
            <select
              className="input"
              value={studentFeeForm.fee_structure_id}
              onChange={(e) => setStudentFeeForm({ ...studentFeeForm, fee_structure_id: e.target.value })}
              required
            >
              <option value="">{t('common.selectOption')}</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatFCFA(s.amount)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('fees.dueDate')}>
            <input
              type="date"
              className="input"
              value={studentFeeForm.due_date}
              onChange={(e) => setStudentFeeForm({ ...studentFeeForm, due_date: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setStudentFeeFormOpen(false)} className="btn-secondary">
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
