import React from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export const WGLogo: React.FC<LogoProps> = ({ size = 48, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer circle */}
    <circle cx="50" cy="50" r="48" fill="#2563eb" />

    {/* Coffee cup */}
    <path
      d="M28 45h28l-3 18H31l-3-18z"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M56 49h6a4 4 0 0 1 0 8h-6" fill="none" stroke="white" strokeWidth="2.5" />
    <path d="M31 63h22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M35 43c0-3 2-5 2-8"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M41 43c0-3 2-5 2-8"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Microphone */}
    <rect x="67" y="33" width="6" height="10" rx="3" fill="white" />
    <path
      d="M64 40a6 6 0 0 0 12 0"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line x1="70" y1="46" x2="70" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="67" y1="50" x2="73" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />

    {/* Soccer ball (simplified) */}
    <circle cx="70" cy="67" r="8" fill="none" stroke="white" strokeWidth="2" />
    <path d="M70 59l2 4h-4l2-4z" fill="white" />
    <path d="M70 75l-2-4h4l-2 4z" fill="white" />
    <path d="M62 67l4-2v4l-4-2z" fill="white" />
    <path d="M78 67l-4 2v-4l4 2z" fill="white" />

    {/* WG text */}
    <text
      x="50"
      y="88"
      textAnchor="middle"
      fill="white"
      fontFamily="Poppins, sans-serif"
      fontWeight="800"
      fontSize="12"
      letterSpacing="2"
    >
      WG
    </text>
  </svg>
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
          WG POS
        </p>
        <p className="text-xs opacity-70" style={{ color: 'var(--text-sidebar)' }}>
          Warung Gadis
        </p>
      </div>
    )}
  </div>
)
