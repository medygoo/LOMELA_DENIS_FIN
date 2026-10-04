import { useAuth } from '@/hooks/useAuth'
import { useStats } from '@/hooks/useData'
import { Users, GraduationCap, UserCog, Calendar, TrendingUp, Wallet, ShieldCheck, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/constants'

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: stats, isLoading } = useStats()

  if (!profile) return null

  const cards = [
    { label: 'Élèves actifs', value: stats?.students ?? 0, icon: Users, color: 'bg-primary-500', bg: 'bg-primary-50' },
    { label: 'Classes', value: stats?.classes ?? 0, icon: GraduationCap, color: 'bg-accent-500', bg: 'bg-accent-50' },
    { label: 'Personnel', value: stats?.staff ?? 0, icon: UserCog, color: 'bg-amber-500', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-0">
        <h2 className="text-xl font-bold mb-1">
          Bienvenue, {profile.first_name} {profile.last_name}
        </h2>
        <p className="text-primary-100 text-sm">
          « Chaque enfant protégé, chaque parent informé »
        </p>
        {stats?.schoolYear && (
          <p className="text-primary-200 text-sm mt-3">
            Année scolaire : {stats.schoolYear.name} ({formatDate(stats.schoolYear.start_date)} — {formatDate(stats.schoolYear.end_date)})
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={22} className={card.color.replace('bg-', 'text-')} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {isLoading ? '—' : card.value}
                  </p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick access modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Présences', icon: Calendar, desc: 'Saisie et suivi', color: 'text-accent-600' },
          { label: 'Notes & Devoirs', icon: BookOpen, desc: 'Bulletins et évaluations', color: 'text-primary-600' },
          { label: 'Finances', icon: Wallet, desc: 'Frais et paiements', color: 'text-success-600' },
          { label: 'Sécurité', icon: ShieldCheck, desc: 'Entrées et sorties', color: 'text-error-600' },
        ].map((module, i) => {
          const Icon = module.icon
          return (
            <div key={i} className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
              <Icon size={24} className={module.color + ' mb-3'} />
              <p className="font-semibold text-slate-900 text-sm">{module.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{module.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Recent activity placeholder */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Activité récente</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-400 text-center py-8">
            Les activités récentes apparaîtront ici une fois les données saisies.
          </p>
        </div>
      </div>
    </div>
  )
}
