import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { AuditLog, Profile } from '../../types'
import { DataTable, PageHeader, Badge, EmptyState } from '../../components/ui/DataTable'
import { ScrollText } from 'lucide-react'

interface AuditRow extends AuditLog {
  profiles: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null
}

export function AuditPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [entries, setEntries] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'admin_principal'

  useEffect(() => {
    async function loadAudit() {
      if (!user) return
      setLoading(true)
      const { data } = await supabase
        .from('audit_log')
        .select('*, profiles(first_name, last_name, email)')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })
        .limit(200)
      setEntries((data as AuditRow[]) || [])
      setLoading(false)
    }
    if (isAdmin) loadAudit()
  }, [user])

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title={t('audit.title')} />
        <EmptyState icon={<ScrollText size={32} />} title={t('common.error')} description={t('audit.title')} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('audit.title')} subtitle={t('audit.details')} />

      {entries.length === 0 && !loading ? (
        <EmptyState icon={<ScrollText size={32} />} title={t('common.noData')} description={t('audit.title')} />
      ) : (
        <DataTable<AuditRow>
          loading={loading}
          emptyMessage={t('common.noData')}
          data={entries}
          columns={[
            {
              key: 'action',
              label: t('audit.action'),
              render: (e) => <Badge color="blue">{e.action}</Badge>,
            },
            {
              key: 'entity_type',
              label: t('audit.entity'),
              render: (e) => e.entity_type,
            },
            {
              key: 'actor',
              label: t('audit.actor'),
              render: (e) =>
                e.profiles ? (
                  <span className="font-medium text-gray-900">
                    {e.profiles.last_name} {e.profiles.first_name}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              key: 'created_at',
              label: t('audit.timestamp'),
              render: (e) => new Date(e.created_at).toLocaleString(),
            },
            {
              key: 'details',
              label: t('audit.details'),
              render: (e) => {
                if (!e.details) return <span className="text-gray-400">—</span>
                const str = JSON.stringify(e.details)
                return (
                  <span className="text-xs text-gray-500 font-mono" title={str}>
                    {str.length > 60 ? str.slice(0, 60) + '…' : str}
                  </span>
                )
              },
            },
          ]}
        />
      )}
    </div>
  )
}
