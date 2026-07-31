import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
)

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = {
    paid: { label: 'Lunas', variant: 'green' },
    pending: { label: 'Pending', variant: 'yellow' },
    debt: { label: 'Member', variant: 'red' },
    cancelled: { label: 'Batal', variant: 'gray' },
    active: { label: 'Aktif', variant: 'green' },
    inactive: { label: 'Nonaktif', variant: 'gray' },
    unpaid: { label: 'Belum Bayar', variant: 'red' },
    partial: { label: 'Sebagian', variant: 'yellow' },
  }
  const config = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function roleBadge(role: string) {
  const map: Record<string, { label: string; variant: 'blue' | 'purple' | 'green' }> = {
    owner: { label: 'Owner', variant: 'blue' },
    manager: { label: 'Manager', variant: 'purple' },
    staff: { label: 'Staff', variant: 'green' },
  }
  const config = map[role] ?? { label: role, variant: 'blue' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
