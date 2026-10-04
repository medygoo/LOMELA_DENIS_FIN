export const ROLE_LABELS: Record<string, string> = {
  admin_principal: 'Administrateur / Directeur',
  direction: 'Direction',
  enseignant: 'Enseignant',
  parent_tuteur: 'Parent / Tuteur',
}

export const ROLE_COLORS: Record<string, string> = {
  admin_principal: 'bg-primary-100 text-primary-700',
  direction: 'bg-accent-100 text-accent-700',
  enseignant: 'bg-amber-100 text-amber-700',
  parent_tuteur: 'bg-emerald-100 text-emerald-700',
}

export const FEE_TYPE_LABELS: Record<string, string> = {
  scolarite: 'Scolarité',
  inscription: 'Inscription',
  cantine: 'Cantine',
  transport: 'Transport',
  activite: 'Activité',
  autre: 'Autre',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Virement bancaire',
  cheque: 'Chèque',
  card: 'Carte bancaire',
}

export const FEE_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Non payé',
  partial: 'Partiel',
  paid: 'Payé',
}

export const FEE_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-error-100 text-error-700',
  partial: 'bg-warning-100 text-warning-700',
  paid: 'bg-success-100 text-success-700',
}

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'Retard',
  excused: 'Excusé',
}

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present: 'bg-success-100 text-success-700',
  absent: 'bg-error-100 text-error-700',
  late: 'bg-warning-100 text-warning-700',
  excused: 'bg-blue-100 text-blue-700',
}

export const GRADE_TYPE_LABELS: Record<string, string> = {
  devoir: 'Devoir',
  composition: 'Composition',
  controle: 'Contrôle',
  examen: 'Examen',
  oral: 'Oral',
}

export const ENTRY_EXIT_LABELS: Record<string, string> = {
  entry: 'Entrée',
  exit: 'Sortie',
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}
