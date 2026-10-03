import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Payment, Receipt, StudentFee, Student, School, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Plus, Receipt as ReceiptIcon, Printer, CreditCard } from 'lucide-react'

const PAYMENT_METHODS = ['cash', 'check', 'transfer', 'card', 'mobile']

interface PaymentRow extends Payment {
  students: Student | null
}

interface StudentFeeRow extends StudentFee {
  students: Student | null
  fee_structures: { name: string | null } | null
}

interface ReceiptRow extends Receipt {
  payments: Payment | null
}

interface PaymentForm {
  student_fee_id: string
  amount: string
  payment_method: string
  payment_date: string
  reference: string
  notes: string
}

const emptyForm: PaymentForm = {
  student_fee_id: '',
  amount: '',
  payment_method: 'cash',
  payment_date: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
}

function formatFCFA(n: number) {
  return Number(n).toLocaleString() + ' FCFA'
}

export function PaymentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [unpaidFees, setUnpaidFees] = useState<StudentFeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<PaymentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [receiptData, setReceiptData] = useState<{ payment: PaymentRow; receipt: Receipt; school: School | null } | null>(null)
  const [school, setSchool] = useState<School | null>(null)

  const isParent = user?.role === 'parent_tuteur'
  const canRecord = user?.role === 'admin_principal' || user?.role === 'direction' || user?.role === 'caisse'

  useEffect(() => {
    async function loadAll() {
      if (!user) return
      setLoading(true)

      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .maybeSingle()
      setSchool((schoolData as School) || null)

      let query = supabase
        .from('payments')
        .select('*, students(*)')
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false })
        .limit(50)

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
      setPayments((data as PaymentRow[]) || [])

      if (canRecord) {
        const { data: fees } = await supabase
          .from('student_fees')
          .select('*, students(*), fee_structures(name)')
          .eq('school_id', user.school_id)
          .in('status', ['unpaid', 'partial', 'overdue'])
          .order('created_at', { ascending: false })
        setUnpaidFees((fees as StudentFeeRow[]) || [])
      }

      setLoading(false)
    }
    loadAll()
  }, [user])

  function openAdd() {
    setForm({
      ...emptyForm,
      student_fee_id: unpaidFees[0]?.id || '',
      amount: unpaidFees[0] ? String(unpaidFees[0].amount - unpaidFees[0].amount_paid) : '',
      payment_date: new Date().toISOString().slice(0, 10),
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const fee = unpaidFees.find((f) => f.id === form.student_fee_id)
    if (!fee) return

    setSaving(true)
    const amount = Number(form.amount)
    const newAmountPaid = fee.amount_paid + amount
    const newStatus = newAmountPaid >= fee.amount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid'

    // 1. Create payment
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        school_id: user.school_id,
        student_fee_id: fee.id,
        student_id: fee.student_id,
        amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference: form.reference || null,
        received_by: user.id,
        notes: form.notes || null,
      })
      .select()
      .single()

    if (payErr || !payment) {
      setSaving(false)
      return
    }

    // 2. Update student_fee
    await supabase
      .from('student_fees')
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq('id', fee.id)

    // 3. Create receipt with auto-generated number
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    const { data: receipt, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        school_id: user.school_id,
        payment_id: payment.id,
        receipt_number: receiptNumber,
        issued_by: user.id,
      })
      .select()
      .single()

    setSaving(false)
    setFormOpen(false)

    // Refresh
    const { data: freshPayments } = await supabase
      .from('payments')
      .select('*, students(*)')
      .eq('school_id', user.school_id)
      .order('payment_date', { ascending: false })
      .limit(50)
    setPayments((freshPayments as PaymentRow[]) || [])

    const { data: freshFees } = await supabase
      .from('student_fees')
      .select('*, students(*), fee_structures(name)')
      .eq('school_id', user.school_id)
      .in('status', ['unpaid', 'partial', 'overdue'])
      .order('created_at', { ascending: false })
    setUnpaidFees((freshFees as StudentFeeRow[]) || [])

    // Show receipt
    if (!receiptErr && receipt) {
      const payRow = (freshPayments as PaymentRow[])?.find((p) => p.id === payment.id) || (payment as PaymentRow)
      setReceiptData({ payment: payRow, receipt: receipt as Receipt, school })
    }
  }

  async function showReceipt(payment: PaymentRow) {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('payment_id', payment.id)
      .maybeSingle()
    if (receipt) {
      setReceiptData({ payment, receipt: receipt as Receipt, school })
    }
  }

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        subtitle={t('payments.receivedBy')}
        action={
          canRecord ? (
            <button onClick={openAdd} className="btn-primary" disabled={unpaidFees.length === 0}>
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('payments.recordPayment')}
            </button>
          ) : undefined
        }
      />

      {payments.length === 0 && !loading ? (
        <EmptyState icon={<CreditCard size={32} />} title={t('common.noData')} description={t('payments.title')} />
      ) : (
        <DataTable<PaymentRow>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={payments}
          columns={[
            {
              key: 'student',
              label: t('payments.student'),
              render: (p) => (
                <span className="font-medium text-gray-900">
                  {p.students ? `${p.students.last_name} ${p.students.first_name}` : '—'}
                </span>
              ),
            },
            {
              key: 'amount',
              label: t('payments.amount'),
              render: (p) => <span className="font-semibold text-gray-900">{formatFCFA(p.amount)}</span>,
            },
            {
              key: 'payment_method',
              label: t('payments.paymentMethod'),
              render: (p) => <Badge color="blue">{t(`payments.${p.payment_method}`, p.payment_method)}</Badge>,
            },
            {
              key: 'payment_date',
              label: t('payments.paymentDate'),
              render: (p) => new Date(p.payment_date).toLocaleDateString(),
            },
            {
              key: 'reference',
              label: t('payments.reference'),
              render: (p) => p.reference || '—',
            },
          ]}
          actions={(p) => (
            <button
              onClick={() => showReceipt(p)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
              title={t('payments.receipt')}
            >
              <ReceiptIcon size={18} />
            </button>
          )}
        />
      )}

      {/* Record Payment Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t('payments.recordPayment')} size="md">
        <form onSubmit={save} className="space-y-4">
          <Field label={t('payments.fee')}>
            <select
              className="input"
              value={form.student_fee_id}
              onChange={(e) => {
                const fee = unpaidFees.find((f) => f.id === e.target.value)
                setForm({
                  ...form,
                  student_fee_id: e.target.value,
                  amount: fee ? String(fee.amount - fee.amount_paid) : '',
                })
              }}
              required
            >
              <option value="">{t('common.selectOption')}</option>
              {unpaidFees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.students ? `${f.students.last_name} ${f.students.first_name}` : '—'} —{' '}
                  {f.fee_structures?.name || t('fees.title')} ({formatFCFA(f.amount - f.amount_paid)} {t('fees.remaining')})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('payments.amount')}>
            <input
              type="number"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('payments.paymentMethod')}>
              <select
                className="input"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`payments.${m}`, m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('payments.paymentDate')}>
              <input
                type="date"
                className="input"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label={t('payments.reference')}>
            <input
              className="input"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
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

      {/* Receipt Modal */}
      <Modal
        open={!!receiptData}
        onClose={() => setReceiptData(null)}
        title={t('payments.receipt')}
        size="md"
      >
        {receiptData && (
          <div>
            <div id="receipt-print" className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-center mb-6">
                {receiptData.school?.logo_url && (
                  <img src={receiptData.school.logo_url} alt="logo" className="h-12 mx-auto mb-2" />
                )}
                <h2 className="text-lg font-bold text-gray-900">{receiptData.school?.name || '—'}</h2>
                {receiptData.school?.address && <p className="text-xs text-gray-500">{receiptData.school.address}</p>}
                {receiptData.school?.phone && (
                  <p className="text-xs text-gray-500">{t('common.phone')}: {receiptData.school.phone}</p>
                )}
              </div>
              <div className="border-t border-b border-gray-200 py-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{t('payments.receiptNumber')}</span>
                  <span className="text-sm font-bold text-gray-900">{receiptData.receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{t('payments.student')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {receiptData.payment.students
                      ? `${receiptData.payment.students.last_name} ${receiptData.payment.students.first_name}`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{t('payments.amount')}</span>
                  <span className="text-sm font-bold text-accent-600">{formatFCFA(receiptData.payment.amount)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{t('payments.paymentMethod')}</span>
                  <span className="text-sm text-gray-900">
                    {t(`payments.${receiptData.payment.payment_method}`, receiptData.payment.payment_method)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{t('payments.paymentDate')}</span>
                  <span className="text-sm text-gray-900">
                    {new Date(receiptData.payment.payment_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400">
                {t('payments.receivedBy')}: {receiptData.payment.received_by ? '✓' : '—'}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setReceiptData(null)} className="btn-secondary">
                {t('common.close')}
              </button>
              <button onClick={() => window.print()} className="btn-primary">
                <Printer size={18} className="inline -mt-0.5 mr-1" />
                {t('payments.printReceipt')}
              </button>
            </div>
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
