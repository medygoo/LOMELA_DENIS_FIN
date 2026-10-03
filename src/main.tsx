import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './i18n'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { AuthPage } from './pages/auth/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { StudentsPage } from './pages/students/StudentsPage'
import { GuardiansPage } from './pages/guardians/GuardiansPage'
import { ClassesPage } from './pages/classes/ClassesPage'
import { SubjectsPage } from './pages/subjects/SubjectsPage'
import { SchoolYearsPage } from './pages/schoolyears/SchoolYearsPage'
import { AssignmentsPage } from './pages/assignments/AssignmentsPage'
import { StaffPage } from './pages/staff/StaffPage'
import { SchoolPage } from './pages/school/SchoolPage'
import { AttendancePage } from './pages/attendance/AttendancePage'
import { HomeworkPage } from './pages/homework/HomeworkPage'
import { GradesPage } from './pages/grades/GradesPage'
import { FeesPage } from './pages/fees/FeesPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { EntriesExitsPage } from './pages/entriesexits/EntriesExitsPage'
import { QRControlPage } from './pages/qrcontrol/QRControlPage'
import { AuthorizedPersonsPage } from './pages/authorizedpersons/AuthorizedPersonsPage'
import { UsersPage } from './pages/users/UsersPage'
import { AuditPage } from './pages/audit/AuditPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { StaffAttendancePage } from './pages/staffattendance/StaffAttendancePage'
import type { Role } from './types'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/school" element={<ProtectedRoute allowedRoles={['admin_principal']}><SchoolPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin_principal']}><UsersPage /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin_principal']}><AuditPage /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction']}><StaffPage /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant']}><StudentsPage /></ProtectedRoute>} />
        <Route path="/guardians" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction']}><GuardiansPage /></ProtectedRoute>} />
        <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant']}><ClassesPage /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant']}><SubjectsPage /></ProtectedRoute>} />
        <Route path="/school-years" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction']}><SchoolYearsPage /></ProtectedRoute>} />
        <Route path="/assignments" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant']}><AssignmentsPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant']}><AttendancePage /></ProtectedRoute>} />
        <Route path="/staff-attendance" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction']}><StaffAttendancePage /></ProtectedRoute>} />
        <Route path="/homework" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant', 'parent_tuteur']}><HomeworkPage /></ProtectedRoute>} />
        <Route path="/grades" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'enseignant', 'parent_tuteur']}><GradesPage /></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'caisse', 'parent_tuteur']}><FeesPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedRoles={['admin_principal', 'caisse', 'parent_tuteur']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/entries-exits" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'gardien', 'parent_tuteur']}><EntriesExitsPage /></ProtectedRoute>} />
        <Route path="/qr-control" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'gardien', 'parent_tuteur']}><QRControlPage /></ProtectedRoute>} />
        <Route path="/authorized-persons" element={<ProtectedRoute allowedRoles={['admin_principal', 'direction', 'gardien', 'parent_tuteur']}><AuthorizedPersonsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
