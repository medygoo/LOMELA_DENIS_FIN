import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Subject } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'

interface SubjectForm {
  name: string
  code: string
  coefficient: number
  description: string
}

const emptyForm: SubjectForm = { name: '', code: '', coefficient: 1, description: '' }

export function SubjectsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)

  const isTeacher = user?.role === 'enseignant'

  async function loadSubjects() {
    if (!user) return
    setLoading(true)

    if (isTeacher) {
      const { data } = await supabase
        .from('teacher_assignments')
        .select('subjects(*)')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
      const mapped = ((data || []) as unknown as { subjects: Subject | null }[])
        .map((a) => a.subjects)
        .filter((s): s is Subject => !!s)
      const unique = Array.from(new Map(mapped.map((s) => [s.id, s])).values())
      setSubjects(unique)
    } else {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true })
      setSubjects((data as Subject[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSubjects()
  }, [user])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditing(subject)
    setForm({
      name: subject.name,
      code: subject.code || '',
      coefficient: subject.coefficient,
      description: subject.description || '',
    })
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = { ...form, school_id: user.school_id }
    if (editing) {
      await supabase.from('subjects').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('subjects').insert(payload)
    }
    setSaving(false)
    setFormOpen(false)
    loadSubjects()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await supabase.from('subjects').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    loadSubjects()
  }

  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title={t('subjects.title')}
        subtitle={t('subjects.subtitle')}
        action={
          !isTeacher && (
            <button onClick={openAdd} className="btn-primary">
              <Plus size={18} className="inline -mt-0.5 mr-1" />
              {t('subjects.add')}
            </button>
          )
        }
      />

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder={t('subjects.search')} />
      </div>

      {subjects.length === 0 && !loading ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title={t('subjects.empty')}
          description={t('subjects.emptyDescription')}
          action={
            !isTeacher && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} className="inline -mt-0.5 mr-1" />
                {t('subjects.add')}
              </button>
            )
          }
        />
      ) : (
        <DataTable<Subject>
          loading={loading}
          emptyMessage={t('subjects.noResults')}
          data={filtered}
          columns={[
            {
              key: 'name',
              label: t('subjects.name'),
              render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
            },
            { key: 'code', label: t('subjects.code'), render: (s) => s.code || '—' },
            {
              key: 'coefficient',
              label: t('subjects.coefficient'),
              render: (s) => <Badge color="blue">{s.coefficient}</Badge>,
            },
          ]}
          actions={
            !isTeacher
              ? (s) => (
                  <>
                    <button
                      onClick={() => openEdit(s)}
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
                )
              : undefined
          }
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('subjects.edit') : t('subjects.add')}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t('subjects.name')}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label={t('subjects.code')}>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label={t('subjects.coefficient')}>
            <input
              type="number"
              min={0}
              step="0.5"
              className="input"
              value={form.coefficient}
              onChange={(e) => setForm({ ...form, coefficient: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('subjects.description')}>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
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
        title={t('subjects.deleteTitle')}
        message={t('subjects.deleteMessage', { name: deleteTarget?.name || '' })}
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
