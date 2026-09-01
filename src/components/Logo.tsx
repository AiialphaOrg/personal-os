interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
  textClassName?: string
}

export function Logo({
  className = "",
  size = 36,
  showText = false,
  textClassName = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none shrink-0"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="logoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="logoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Minimal Squircle Frame */}
        <rect width="100" height="100" rx="24" fill="url(#logoBgGrad)" />
        <rect width="100" height="100" rx="24" stroke="#27272a" strokeWidth="1.5" fill="none" />

        {/* Outer Minimal Track */}
        <circle cx="50" cy="50" r="32" stroke="#3f3f46" strokeWidth="2.5" strokeDasharray="120 40" strokeLinecap="round" opacity="0.6" />
        
        {/* Active Orbit Glow Segment */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="url(#logoBlueGrad)"
          strokeWidth="3"
          strokeDasharray="70 130"
          strokeLinecap="round"
          className="origin-center animate-[spin_8s_linear_infinite]"
        />

        {/* Inner Ring */}
        <circle cx="50" cy="50" r="20" stroke="url(#logoRingGrad)" strokeWidth="2" opacity="0.6" />

        {/* Minimal Center Core */}
        <circle cx="50" cy="50" r="10" fill="url(#logoBlueGrad)" />
        <circle cx="47" cy="47" r="2.5" fill="#ffffff" opacity="0.9" />
      </svg>

      {showText && (
        <span className={`font-semibold tracking-tight text-foreground ${textClassName}`}>
          Personal <span className="text-primary font-bold">OS</span>
        </span>
      )}
    </div>
  )
}

