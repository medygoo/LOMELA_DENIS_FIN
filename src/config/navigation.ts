import { type Role } from '../types'
import {
  LayoutDashboard, Building2, Users, GraduationCap, BookOpen, CalendarDays,
  ClipboardList, Wallet, Shield, QrCode, LogOut, FileText, UsersRound,
  Library, NotebookPen, FileCheck2, ScrollText, UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  labelKey: string
  icon: LucideIcon
  path: string
  roles: Role[]
}

export const navItems: NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['admin_principal', 'direction', 'enseignant', 'parent_tuteur', 'gardien', 'caisse'],
  },
  // Admin
  {
    labelKey: 'nav.school',
    icon: Building2,
    path: '/school',
    roles: ['admin_principal'],
  },
  {
    labelKey: 'nav.users',
    icon: UserCog,
    path: '/users',
    roles: ['admin_principal'],
  },
  {
    labelKey: 'nav.auditLog',
    icon: ScrollText,
    path: '/audit',
    roles: ['admin_principal'],
  },
  // Direction + Admin
  {
    labelKey: 'nav.staff',
    icon: Users,
    path: '/staff',
    roles: ['admin_principal', 'direction'],
  },
  {
    labelKey: 'nav.students',
    icon: GraduationCap,
    path: '/students',
    roles: ['admin_principal', 'direction', 'enseignant'],
  },
  {
    labelKey: 'nav.guardians',
    icon: UsersRound,
    path: '/guardians',
    roles: ['admin_principal', 'direction'],
  },
  {
    labelKey: 'nav.classes',
    icon: Library,
    path: '/classes',
    roles: ['admin_principal', 'direction', 'enseignant'],
  },
  {
    labelKey: 'nav.subjects',
    icon: BookOpen,
    path: '/subjects',
    roles: ['admin_principal', 'direction', 'enseignant'],
  },
  {
    labelKey: 'nav.schoolYears',
    icon: CalendarDays,
    path: '/school-years',
    roles: ['admin_principal', 'direction'],
  },
  {
    labelKey: 'nav.assignments',
    icon: ClipboardList,
    path: '/assignments',
    roles: ['admin_principal', 'direction', 'enseignant'],
  },
  {
    labelKey: 'nav.attendance',
    icon: FileCheck2,
    path: '/attendance',
    roles: ['admin_principal', 'direction', 'enseignant'],
  },
  {
    labelKey: 'nav.staffAttendance',
    icon: FileCheck2,
    path: '/staff-attendance',
    roles: ['admin_principal', 'direction'],
  },
  {
    labelKey: 'nav.homework',
    icon: NotebookPen,
    path: '/homework',
    roles: ['admin_principal', 'direction', 'enseignant', 'parent_tuteur'],
  },
  {
    labelKey: 'nav.grades',
    icon: FileText,
    path: '/grades',
    roles: ['admin_principal', 'direction', 'enseignant', 'parent_tuteur'],
  },
  // Cashier
  {
    labelKey: 'nav.fees',
    icon: Wallet,
    path: '/fees',
    roles: ['admin_principal', 'direction', 'caisse', 'parent_tuteur'],
  },
  {
    labelKey: 'nav.payments',
    icon: Wallet,
    path: '/payments',
    roles: ['admin_principal', 'caisse', 'parent_tuteur'],
  },
  // Guard
  {
    labelKey: 'nav.entriesExits',
    icon: Shield,
    path: '/entries-exits',
    roles: ['admin_principal', 'direction', 'gardien', 'parent_tuteur'],
  },
  {
    labelKey: 'nav.qrControl',
    icon: QrCode,
    path: '/qr-control',
    roles: ['admin_principal', 'direction', 'gardien', 'parent_tuteur'],
  },
  {
    labelKey: 'nav.authorizedPersons',
    icon: UsersRound,
    path: '/authorized-persons',
    roles: ['admin_principal', 'direction', 'gardien', 'parent_tuteur'],
  },
]

export function getNavItemsForRole(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role))
}
