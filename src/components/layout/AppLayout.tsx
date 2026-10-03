import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, LogOut, ChevronDown, Globe, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getNavItemsForRole } from '../../config/navigation'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  if (!user) return null

  const items = getNavItemsForRole(user.role)
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en'

  function toggleLang() {
    const newLang = currentLang === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(newLang)
    setLangOpen(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const Sidebar = (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-64">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
          SS
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">SchoolSafe</p>
          <p className="text-xs text-gray-400">{t('roles.' + user.role)}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {items.map((item: { labelKey: string; icon: LucideIcon; path: string }) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path)
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
              {t(item.labelKey)}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 p-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-error-50 hover:text-error-600 transition-all"
        >
          <LogOut size={18} className="text-gray-400" />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{Sidebar}</div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 animate-slide-in">{Sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Globe size={16} />
                <span className="uppercase">{currentLang}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  <button
                    onClick={() => { i18n.changeLanguage('fr'); setLangOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Français
                  </button>
                  <button
                    onClick={() => { i18n.changeLanguage('en'); setLangOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            {/* Avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-primary-300 transition-all"
            >
              {user.first_name[0]}{user.last_name[0]}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Close mobile sidebar button */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-lg bg-white shadow-lg"
        >
          <X size={20} />
        </button>
      )}
    </div>
  )
}
