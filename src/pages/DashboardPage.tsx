import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/DataTable'
import { Users, GraduationCap, Library, Wallet, TrendingUp, FileCheck2, Shield, NotebookPen } from 'lucide-react'
import { Badge } from '../components/ui/DataTable'

interface DashboardStats {
  totalStudents: number
  totalClasses: number
  totalStaff: number
  totalCollected: number
  pendingFees: number
  presentToday: number
  absentToday: number
  movementsToday: number
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [children, setChildren] = useState<any[]>([])
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [recentGrades, setRecentGrades] = useState<any[]>([])
  const [upcomingHomework, setUpcomingHomework] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [todayMovements, setTodayMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return
      const today = new Date().toISOString().split('T')[0]

      if (user.role === 'admin_principal' || user.role === 'direction') {
        const [students, classes, staff, payments, fees, attendance, movements] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', user.school_id).eq('is_active', true),
          supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', user.school_id).eq('is_active', true),
          supabase.from('staff').select('id', { count: 'exact', head: true }).eq('school_id', user.school_id).eq('is_active', true),
          supabase.from('payments').select('amount').eq('school_id', user.school_id).gte('payment_date', today),
          supabase.from('student_fees').select('amount, amount_paid').eq('school_id', user.school_id).in('status', ['unpaid', 'partial', 'overdue']),
          supabase.from('attendance').select('status').eq('school_id', user.school_id).eq('date', today),
          supabase.from('entries_exits').select('*').eq('school_id', user.school_id).gte('timestamp', today),
        ])

        const collected = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0
        const pending = fees.data?.reduce((s, f) => s + (Number(f.amount) - Number(f.amount_paid)), 0) || 0
        const present = attendance.data?.filter((a) => a.status === 'present').length || 0
        const absent = attendance.data?.filter((a) => a.status === 'absent').length || 0

        setStats({
          totalStudents: students.count || 0,
          totalClasses: classes.count || 0,
          totalStaff: staff.count || 0,
          totalCollected: collected,
          pendingFees: pending,
          presentToday: present,
          absentToday: absent,
          movementsToday: movements.data?.length || 0,
        })
        setTodayMovements(movements.data || [])
      } else if (user.role === 'enseignant') {
        const [assignments, homework] = await Promise.all([
          supabase.from('teacher_assignments').select('class_id, subject_id, classes(name), subjects(name)').eq('teacher_id', user.id).eq('is_active', true),
          supabase.from('homework').select('*').eq('teacher_id', user.id).gte('due_date', today).order('due_date', { ascending: true }).limit(5),
        ])

        setMyClasses(assignments.data || [])
        setUpcomingHomework(homework.data || [])
      } else if (user.role === 'parent_tuteur') {
        const { data: guardianLinks } = await supabase
          .from('student_guardians')
          .select('student_id, students(id, first_name, last_name, enrollment_number)')
          .eq('guardian_id', user.id)

        const studentIds = guardianLinks?.map((g) => g.student_id) || []

        if (studentIds.length > 0) {
          const [grades, fees, movements] = await Promise.all([
            supabase.from('grades').select('*, subjects(name)').in('student_id', studentIds).order('created_at', { ascending: false }).limit(5),
            supabase.from('student_fees').select('*, students(first_name, last_name)').in('student_id', studentIds).in('status', ['unpaid', 'partial', 'overdue']),
            supabase.from('entries_exits').select('*, students(first_name, last_name)').in('student_id', studentIds).order('timestamp', { ascending: false }).limit(5),
          ])

          setRecentGrades(grades.data || [])
          setRecentPayments(fees.data || [])
          setTodayMovements(movements.data || [])
        }

        setChildren(guardianLinks?.map((g: any) => g.students).filter(Boolean) || [])
      } else if (user.role === 'caisse') {
        const [payments, fees] = await Promise.all([
          supabase.from('payments').select('*, students(first_name, last_name)').eq('school_id', user.school_id).order('created_at', { ascending: false }).limit(5),
          supabase.from('student_fees').select('amount, amount_paid, status').eq('school_id', user.school_id).in('status', ['unpaid', 'partial', 'overdue']),
        ])

        const collected = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0
        const pending = fees.data?.reduce((s, f) => s + (Number(f.amount) - Number(f.amount_paid)), 0) || 0

        setStats({
          totalStudents: 0,
          totalClasses: 0,
          totalStaff: 0,
          totalCollected: collected,
          pendingFees: pending,
          presentToday: 0,
          absentToday: 0,
          movementsToday: 0,
        })
        setRecentPayments(payments.data || [])
      } else if (user.role === 'gardien') {
        const { data: movements } = await supabase
          .from('entries_exits')
          .select('*, students(first_name, last_name)')
          .eq('school_id', user.school_id)
          .gte('timestamp', today)
          .order('timestamp', { ascending: false })
          .limit(10)

        setTodayMovements(movements || [])
      }

      setLoading(false)
    }

    loadDashboard()
  }, [user])

  if (!user) return null
  if (loading) return <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcome', { name: user.first_name })}
        </h1>
        <p className="text-gray-500 mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Stats grid for admin/direction */}
      {(user.role === 'admin_principal' || user.role === 'direction') && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('dashboard.totalStudents')} value={stats.totalStudents} icon={<GraduationCap size={24} />} color="primary" />
            <StatCard label={t('dashboard.totalClasses')} value={stats.totalClasses} icon={<Library size={24} />} color="accent" />
            <StatCard label={t('dashboard.totalStaff')} value={stats.totalStaff} icon={<Users size={24} />} color="warning" />
            <StatCard label={t('dashboard.movementsToday')} value={stats.movementsToday} icon={<Shield size={24} />} color="error" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('dashboard.totalCollected')} value={`${stats.totalCollected.toLocaleString()} FCFA`} icon={<Wallet size={24} />} color="accent" />
            <StatCard label={t('dashboard.pendingFees')} value={`${stats.pendingFees.toLocaleString()} FCFA`} icon={<TrendingUp size={24} />} color="warning" />
            <StatCard label={t('dashboard.studentsPresent')} value={stats.presentToday} icon={<FileCheck2 size={24} />} color="accent" />
            <StatCard label={t('dashboard.studentsAbsent')} value={stats.absentToday} icon={<FileCheck2 size={24} />} color="error" />
          </div>
        </>
      )}

      {/* Cashier stats */}
      {user.role === 'caisse' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatCard label={t('dashboard.totalCollected')} value={`${stats.totalCollected.toLocaleString()} FCFA`} icon={<Wallet size={24} />} color="accent" />
          <StatCard label={t('dashboard.pendingFees')} value={`${stats.pendingFees.toLocaleString()} FCFA`} icon={<TrendingUp size={24} />} color="warning" />
        </div>
      )}

      {/* Teacher dashboard */}
      {user.role === 'enseignant' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatCard label={t('dashboard.assignedClasses')} value={myClasses.length} icon={<Library size={24} />} color="primary" />
            <StatCard label={t('dashboard.upcomingHomework')} value={upcomingHomework.length} icon={<NotebookPen size={24} />} color="accent" />
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{t('dashboard.myClasses')}</h3>
            {myClasses.length === 0 ? (
              <p className="text-sm text-gray-400">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {myClasses.map((item: any, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{item.classes?.name}</span>
                      {item.subjects?.name && <span className="text-sm text-gray-400 ml-2">— {item.subjects.name}</span>}
                    </div>
                    <Badge color="blue">{t('roles.enseignant')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{t('dashboard.upcomingHomework')}</h3>
            {upcomingHomework.length === 0 ? (
              <p className="text-sm text-gray-400">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {upcomingHomework.map((hw) => (
                  <div key={hw.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{hw.title}</span>
                    <span className="text-xs text-gray-400">{hw.due_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parent dashboard */}
      {user.role === 'parent_tuteur' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.myChildren')}</h2>
            {children.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">{t('common.noData')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child: any) => (
                  <div key={child.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                        {child.first_name[0]}{child.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{child.first_name} {child.last_name}</p>
                        <p className="text-xs text-gray-400">{child.enrollment_number || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{t('dashboard.recentGrades')}</h3>
              {recentGrades.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {recentGrades.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-sm text-gray-700">{g.subjects?.name || '—'}</span>
                        {g.title && <span className="text-xs text-gray-400 ml-2">{g.title}</span>}
                      </div>
                      <Badge color={Number(g.score) >= Number(g.max_score) / 2 ? 'green' : 'red'}>
                        {g.score}/{g.max_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{t('dashboard.unpaidFees')}</h3>
              {recentPayments.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {recentPayments.map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-sm text-gray-700">{f.students?.first_name} {f.students?.last_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-error-600">{(Number(f.amount) - Number(f.amount_paid)).toLocaleString()} FCFA</p>
                        <Badge color={f.status === 'overdue' ? 'red' : 'yellow'}>{t('fees.' + f.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guard dashboard */}
      {user.role === 'gardien' && (
        <div className="space-y-6">
          <StatCard label={t('dashboard.movementsToday')} value={todayMovements.length} icon={<Shield size={24} />} color="primary" />

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{t('entriesExits.todayMovements')}</h3>
            {todayMovements.length === 0 ? (
              <p className="text-sm text-gray-400">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {todayMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge color={m.type === 'entry' ? 'green' : 'yellow'}>
                        {t('entriesExits.' + m.type)}
                      </Badge>
                      <span className="text-sm text-gray-700">{m.students?.first_name} {m.students?.last_name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin/direction movements */}
      {(user.role === 'admin_principal' || user.role === 'direction') && todayMovements.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">{t('entriesExits.todayMovements')}</h3>
          <div className="space-y-2">
            {todayMovements.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Badge color={m.type === 'entry' ? 'green' : 'yellow'}>
                    {t('entriesExits.' + m.type)}
                  </Badge>
                  <span className="text-sm text-gray-700">{m.students?.first_name} {m.students?.last_name}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashier recent payments */}
      {user.role === 'caisse' && recentPayments.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">{t('dashboard.recentPayments')}</h3>
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{p.students?.first_name} {p.students?.last_name}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.payment_date}</span>
                </div>
                <span className="text-sm font-medium text-accent-600">{Number(p.amount).toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
