import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hover = false }) => (
  <div
    className={`card ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg?: string
  trend?: { value: number; positive: boolean }
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, iconBg = 'bg-blue-100', trend }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
      {trend && (
        <span
          className={`text-xs font-semibold ${trend.positive ? 'text-green-500' : 'text-red-500'}`}
        >
          {trend.positive ? '+' : ''}{trend.value}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  </div>
)
