import React from 'react'

interface LogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const WGLogo: React.FC<LogoProps> = ({ size = 48, className = '', style }) => (
  <img
    src="/logo-warung-gadis.png"
    alt="Warung Gadis"
    width={size}
    height={size}
    className={className}
    style={{ borderRadius: '50%', objectFit: 'cover', ...style }}
  />
)

export const AppLogo: React.FC<{ size?: number; showName?: boolean }> = ({
  size = 40,
  showName = true,
}) => (
  <div className="flex items-center gap-3">
    <WGLogo size={size} />
    {showName && (
      <div>
        <p className="font-bold text-lg leading-none" style={{ color: 'var(--text-sidebar)' }}>
          Warung Gadis
        </p>
        <p className="text-xs opacity-70" style={{ color: 'var(--text-sidebar)' }}>
          Ngopi • Nongkrong • Karaoke • Nobar
        </p>
      </div>
    )}
  </div>
)
