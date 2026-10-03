import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import QRCode from 'qrcode'
import type { Student, QrCode, StudentGuardian } from '../../types'
import { DataTable, PageHeader, Badge, SearchBar, EmptyState } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { QrCode as QrIcon, RefreshCw, Plus, Eye } from 'lucide-react'

interface StudentWithQR extends Student {
  qr_codes: QrCode | null
}

function randomToken() {
  return `qr_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`
}

export function QRControlPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentWithQR[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [qrModal, setQrModal] = useState<{ student: Student; token: string; qrDataUrl: string } | null>(null)
  const [generating, setGenerating] = useState(false)

  const isParent = user?.role === 'parent_tuteur'

  useEffect(() => {
    loadStudents()
  }, [user])

  async function loadStudents() {
    if (!user) return
    setLoading(true)

    if (isParent) {
      const { data: links } = await supabase
        .from('student_guardians')
        .select('student_id, students(*)')
        .eq('guardians.user_id', user.id)
      const childIds = ((links as unknown as (StudentGuardian & { students: Student })[]) || [])
        .map((l) => l.students?.id)
        .filter(Boolean) as string[]

      if (childIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      const { data: qrData } = await supabase
        .from('qr_codes')
        .select('*')
        .in('student_id', childIds)
        .eq('is_active', true)

      const qrMap = new Map<string, QrCode>()
      for (const q of (qrData as QrCode[]) || []) {
        qrMap.set(q.student_id, q)
      }

      const childStudents = ((links as unknown as (StudentGuardian & { students: Student })[]) || [])
        .map((l) => l.students)
        .filter(Boolean) as Student[]

      setStudents(childStudents.map((s) => ({ ...s, qr_codes: qrMap.get(s.id) || null })))
      setLoading(false)
      return
    }

    const { data: studs } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    const { data: qrData } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('school_id', user.school_id)
      .eq('is_active', true)

    const qrMap = new Map<string, QrCode>()
    for (const q of (qrData as QrCode[]) || []) {
      qrMap.set(q.student_id, q)
    }

    setStudents(((studs as Student[]) || []).map((s) => ({ ...s, qr_codes: qrMap.get(s.id) || null })))
    setLoading(false)
  }

  async function generateQR(student: Student) {
    if (!user) return
    setGenerating(true)
    const token = randomToken()

    // Deactivate old codes
    await supabase.from('qr_codes').update({ is_active: false }).eq('student_id', student.id)

    // Insert new code
    const { data } = await supabase
      .from('qr_codes')
      .insert({
        school_id: user.school_id,
        student_id: student.id,
        token,
        is_active: true,
      })
      .select()
      .single()

    const qrDataUrl = await QRCode.toDataURL(token)
    setGenerating(false)
    setQrModal({ student, token, qrDataUrl })
    loadStudents()
  }

  async function showQR(student: StudentWithQR) {
    if (!student.qr_codes) return
    const qrDataUrl = await QRCode.toDataURL(student.qr_codes.token)
    setQrModal({ student, token: student.qr_codes.token, qrDataUrl })
  }

  async function regenerate(student: Student) {
    await generateQR(student)
  }

  const filtered = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader title={t('qr.title')} subtitle={t('qr.studentQR')} />

      {!isParent && (
        <div className="mb-4 max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />
        </div>
      )}

      {students.length === 0 && !loading ? (
        <EmptyState icon={<QrIcon size={32} />} title={t('common.noData')} description={t('qr.title')} />
      ) : (
        <DataTable<StudentWithQR>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={filtered}
          columns={[
            {
              key: 'name',
              label: t('grades.student'),
              render: (s) => (
                <span className="font-medium text-gray-900">
                  {s.last_name} {s.first_name}
                </span>
              ),
            },
            {
              key: 'enrollment_number',
              label: t('students.enrollmentNumber'),
              render: (s) => s.enrollment_number || '—',
            },
            {
              key: 'qr_status',
              label: t('common.status'),
              render: (s) =>
                s.qr_codes ? (
                  <Badge color="green">{t('qr.active')}</Badge>
                ) : (
                  <Badge color="gray">{t('qr.inactive')}</Badge>
                ),
            },
            {
              key: 'token',
              label: t('qr.token'),
              render: (s) => (s.qr_codes ? s.qr_codes.token.slice(0, 16) + '…' : '—'),
            },
          ]}
          actions={(s) => (
            <>
              {s.qr_codes && (
                <button
                  onClick={() => showQR(s)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                  title={t('common.view')}
                >
                  <Eye size={18} />
                </button>
              )}
              {!isParent && (
                s.qr_codes ? (
                  <button
                    onClick={() => regenerate(s)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                    title={t('qr.regenerate')}
                  >
                    <RefreshCw size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => generateQR(s)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-accent-600 hover:bg-accent-50"
                    title={t('qr.generate')}
                  >
                    <Plus size={18} />
                  </button>
                )
              )}
            </>
          )}
        />
      )}

      <Modal
        open={!!qrModal}
        onClose={() => setQrModal(null)}
        title={qrModal ? `${t('qr.studentQR')} — ${qrModal.student.first_name} ${qrModal.student.last_name}` : ''}
        size="sm"
      >
        {qrModal && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-200">
              <img src={qrModal.qrDataUrl} alt="QR Code" className="w-56 h-56" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {qrModal.student.first_name} {qrModal.student.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-1">{qrModal.student.enrollment_number || '—'}</p>
              <p className="text-xs text-gray-400 mt-2 break-all">{qrModal.token}</p>
            </div>
            {!isParent && (
              <button
                onClick={() => regenerate(qrModal.student)}
                disabled={generating}
                className="btn-secondary"
              >
                <RefreshCw size={18} className="inline -mt-0.5 mr-1" />
                {t('qr.regenerate')}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
