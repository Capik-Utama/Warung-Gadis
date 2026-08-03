import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
)
