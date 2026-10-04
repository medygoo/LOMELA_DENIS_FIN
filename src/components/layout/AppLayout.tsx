import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth, hasAnyRole } from '@/hooks/useAuth'
import { ROLE_LABELS, ROLE_COLORS, initials, fullName } from '@/lib/constants'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  Wallet,
  ShieldCheck,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Rocket,
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin_principal', 'direction', 'enseignant', 'surveillant', 'gardien', 'caisse', 'parent_tuteur'] },
  { to: '/setup', label: 'Configuration', icon: Rocket, roles: ['admin_principal', 'direction'] },
  { to: '/students', label: 'Élèves', icon: Users, roles: ['admin_principal', 'direction', 'enseignant', 'parent_tuteur'] },
  { to: '/classes', label: 'Classes', icon: GraduationCap, roles: ['admin_principal', 'direction', 'enseignant'] },
  { to: '/attendance', label: 'Présences', icon: CalendarCheck, roles: ['admin_principal', 'direction', 'enseignant', 'surveillant'] },
  { to: '/grades', label: 'Notes & Devoirs', icon: ClipboardList, roles: ['admin_principal', 'direction', 'enseignant', 'parent_tuteur'] },
  { to: '/finance', label: 'Finances', icon: Wallet, roles: ['admin_principal', 'direction', 'caisse'] },
  { to: '/security', label: 'Sécurité', icon: ShieldCheck, roles: ['admin_principal', 'direction', 'surveillant', 'gardien'] },
  { to: '/staff', label: 'Personnel', icon: UserCog, roles: ['admin_principal', 'direction'] },
  { to: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin_principal', 'direction'] },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, school, roles, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!profile) return null

  const visibleItems = NAV_ITEMS.filter((item) => hasAnyRole(roles, ...item.roles))
  const currentItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
          <img src="/schoolsafe-logo.jpg" alt="SchoolSafe" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">SchoolSafe</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Gestion scolaire</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
              {initials(profile.first_name, profile.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {fullName(profile.first_name, profile.last_name)}
              </p>
              <span className={`badge ${ROLE_COLORS[profile.role] ?? ''} mt-0.5`}>
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-error-50 hover:text-error-600 rounded-lg transition-all"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden text-slate-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">
            {currentItem?.label ?? 'SchoolSafe'}
          </h2>
          {school && (
            <span className="hidden md:inline text-sm text-slate-400 ml-2">
              · {school.name}
            </span>
          )}
          {school?.status === 'setup' && (
            <span className="badge bg-amber-100 text-amber-700 ml-2">
              Configuration en cours
            </span>
          )}
          <div className="ml-auto hidden sm:block">
            <p className="text-sm text-slate-500 italic">
              « Chaque enfant protégé, chaque parent informé »
            </p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
