import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { SchoolYear } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'

interface YearForm {
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

const emptyForm: YearForm = { name: '', start_date: '', end_date: '', is_current: false }

export function SchoolYearsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [years, setYears] = useState<SchoolYear[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolYear | null>(null)
  const [form, setForm] = useState<YearForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SchoolYear | null>(null)

  async function loadYears() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('school_years')
      .select('*')
      .eq('school_id', user.school_id)
      .order('start_date', { ascending: false })
    setYears((data as SchoolYear[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadYears()
  }, [user])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(year: SchoolYear) {
    setEditing(year)
    setForm({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
      is_current: year.is_current,
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    if (form.is_current) {
      await supabase.from('school_years').update({ is_current: false }).eq('school_id', user.school_id)
    }

    const payload = { ...form, school_id: user.school_id }
    if (editing) {
      await supabase.from('school_years').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('school_years').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadYears()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('school_years').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadYears()
  }

  return (
    <div>
      <PageHeader
        title={t('schoolYears.title')}
        subtitle={t('schoolYears.subtitle')}
        action={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} className="inline -mt-0.5 mr-1" />
            {t('schoolYears.add')}
          </button>
        }
      />

      {years.length === 0 && !loading ? (
        <EmptyState
          icon={<Calendar size={32} />}
          title={t('schoolYears.empty')}
          description={t('schoolYears.emptyDescription')}
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('schoolYears.add')}
            </button>
          }
        />
      ) : (
        <DataTable<SchoolYear>
          loading={loading}
          emptyMessage={t('schoolYears.noResults')}
          data={years}
          columns={[
            {
              key: 'name',
              label: t('schoolYears.name'),
              render: (y) => <span className="font-medium text-gray-900">{y.name}</span>,
            },
            {
              key: 'start_date',
              label: t('schoolYears.startDate'),
              render: (y) => (y.start_date ? new Date(y.start_date).toLocaleDateString() : '—'),
            },
            {
              key: 'end_date',
              label: t('schoolYears.endDate'),
              render: (y) => (y.end_date ? new Date(y.end_date).toLocaleDateString() : '—'),
            },
            {
              key: 'is_current',
              label: t('schoolYears.current'),
              render: (y) =>
                y.is_current ? <Badge color="green">{t('schoolYears.currentYear')}</Badge> : <Badge color="gray">—</Badge>,
            },
          ]}
          actions={(y) => (
            <>
              <button
                onClick={() => openEdit(y)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                title={t('common.edit')}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setDeleteTarget(y)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50"
                title={t('common.delete')}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('schoolYears.edit') : t('schoolYears.add')}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t('schoolYears.name')}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="2024-2025" />
          </Field>
          <Field label={t('schoolYears.startDate')}>
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          </Field>
          <Field label={t('schoolYears.endDate')}>
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
              className="rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700">{t('schoolYears.markCurrent')}</span>
          </label>
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
        title={t('schoolYears.deleteTitle')}
        message={t('schoolYears.deleteMessage', { name: deleteTarget?.name || '' })}
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
