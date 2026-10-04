import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import VerifyEmail from '@/pages/VerifyEmail'
import ChangePassword from '@/pages/ChangePassword'
import SetupPage from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import StudentsPage from '@/pages/students/StudentsPage'
import ClassesPage from '@/pages/classes/ClassesPage'
import AttendancePage from '@/pages/attendance/AttendancePage'
import GradesPage from '@/pages/grades/GradesPage'
import FinancePage from '@/pages/finance/FinancePage'
import SecurityPage from '@/pages/security/SecurityPage'
import StaffPage from '@/pages/staff/StaffPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import { Loader2 } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
})

function ProtectedRoutes() {
  const { session, profile, school, loading, needsPasswordChange } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // If user must change password, force them to the change password page
  if (needsPasswordChange) {
    const isChangePwdRoute = window.location.pathname === '/change-password'
    if (!isChangePwdRoute) {
      return <Navigate to="/change-password" replace />
    }
    return <Routes><Route path="/change-password" element={<ChangePassword />} /></Routes>
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">
        Profil introuvable. Contactez l'administrateur de votre école.
      </div>
    )
  }

  const isSetupRoute = window.location.pathname === '/setup'
  const isChangePwdRoute = window.location.pathname === '/change-password'

  if (school?.status === 'setup' && !isSetupRoute && !isChangePwdRoute) {
    return (
      <AppLayout>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </AppLayout>
    )
  }

  if (school?.status !== 'setup' && isSetupRoute) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
