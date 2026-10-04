import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Building2, GraduationCap, Users, UserCog, Wallet, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'

interface ChecklistItem {
  label: string
  description: string
  icon: typeof Building2
  done: boolean
  link?: string
}

export default function SetupPage() {
  const { profile, school } = useAuth()
  const navigate = useNavigate()

  if (!profile) return null

  const checklist: ChecklistItem[] = [
    {
      label: 'Informations de l\'école',
      description: 'Vérifiez le nom, l\'adresse, le logo et les contacts',
      icon: Building2,
      done: false,
      link: '/settings',
    },
    {
      label: 'Classes',
      description: 'Créez les classes de votre établissement',
      icon: GraduationCap,
      done: false,
      link: '/classes',
    },
    {
      label: 'Personnel',
      description: 'Ajoutez les enseignants et le personnel administratif',
      icon: UserCog,
      done: false,
      link: '/staff',
    },
    {
      label: 'Élèves',
      description: 'Inscrivez les élèves et générez leurs QR codes',
      icon: Users,
      done: false,
      link: '/students',
    },
    {
      label: 'Familles',
      description: 'Associez les parents et tuteurs aux élèves',
      icon: ShieldCheck,
      done: false,
    },
    {
      label: 'Affectations des enseignants',
      description: 'Assignez les enseignants aux classes et matières',
      icon: Wallet,
      done: false,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="card p-8 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-0">
        <h1 className="text-2xl font-bold mb-2">Bienvenue dans SchoolSafe</h1>
        <p className="text-primary-100">
          Configurons votre établissement{school ? ` — ${school.name}` : ''}.
        </p>
        <p className="text-primary-200 text-sm mt-2">
          « Chaque enfant protégé, chaque parent informé »
        </p>
      </div>

      {/* Progress overview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Progression de la configuration</h3>
          <span className="text-sm text-slate-500">0 / {checklist.length}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {checklist.map((item, i) => {
          const Icon = item.icon
          return (
            <div
              key={i}
              className={`card p-4 flex items-center gap-4 ${item.link ? 'hover:shadow-md cursor-pointer transition-shadow' : 'opacity-60'}`}
              onClick={() => item.link && navigate(item.link)}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                item.done ? 'bg-success-100 text-success-600' : 'bg-primary-50 text-primary-600'
              }`}>
                {item.done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 text-sm">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              {item.link && !item.done && (
                <ArrowRight size={18} className="text-slate-300" />
              )}
            </div>
          )
        })}
      </div>

      {/* Note */}
      <div className="card p-4 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-800">
          Vous pouvez quitter cette configuration à tout moment et y revenir plus tard.
          Votre école reste accessible même si la configuration n'est pas terminée.
        </p>
      </div>
    </div>
  )
}
