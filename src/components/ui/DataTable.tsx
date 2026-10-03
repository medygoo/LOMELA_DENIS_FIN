import { type ReactNode } from 'react'
import { Search } from 'lucide-react'

interface DataTableColumn<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  searchable?: boolean
  searchKeys?: (keyof T)[]
  actions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  emptyMessage = 'Aucune donnée disponible',
  searchable,
  searchKeys,
  actions,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm text-gray-700 ${col.className || ''}`}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: string
  trend?: string
}

export function StatCard({ label, value, icon, color = 'primary', trend }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  }

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10"
      />
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface BadgeProps {
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue'
  children: ReactNode
}

export function Badge({ color = 'gray', children }: BadgeProps) {
  const colorMap = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-accent-100 text-accent-700',
    yellow: 'bg-warning-100 text-warning-700',
    red: 'bg-error-100 text-error-700',
    blue: 'bg-primary-100 text-primary-700',
  }
  return <span className={`badge ${colorMap[color]}`}>{children}</span>
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-error-50 flex items-center justify-center text-error-400 mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-base font-semibold text-gray-700">{message}</h3>
    </div>
  )
}
