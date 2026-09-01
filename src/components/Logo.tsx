interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
  textClassName?: string
}

export function Logo({
  className = "",
  size = 40,
  showText = false,
  textClassName = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        <defs>
          {/* Inner Glow Gradient */}
          <radialGradient
            id="center-glow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          {/* Central Sphere Gradient */}
          <linearGradient id="center-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" /> {/* Sky blue */}
            <stop offset="50%" stopColor="#3b82f6" /> {/* Primary Blue */}
            <stop offset="100%" stopColor="#1d4ed8" /> {/* Dark Blue */}
          </linearGradient>

          {/* Orbit Gradients with different opacities */}
          <linearGradient id="orbit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" /> {/* Indigo */}
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.6" /> {/* Purple */}
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" /> {/* Sky */}
          </linearGradient>

          <linearGradient id="orbit-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="orbit-grad-3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer Glow Background */}
        <circle cx="50" cy="50" r="48" fill="url(#center-glow)" />

        {/* Central Core Outer Glow */}
        <circle
          cx="50"
          cy="50"
          r="16"
          fill="#3b82f6"
          opacity="0.15"
          className="animate-pulse"
          style={{ animationDuration: "3s" }}
        />

        {/* Orbit 1: Diagonal Right (Purple-Indigo) */}
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="15"
          stroke="url(#orbit-grad-1)"
          strokeWidth="2.5"
          fill="none"
          transform="rotate(35 50 50)"
          strokeDasharray="200"
          style={{
            strokeDashoffset: 0,
            animation: "dash-anim 8s linear infinite",
          }}
        />

        {/* Orbit 2: Diagonal Left (Sky-Blue) */}
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="15"
          stroke="url(#orbit-grad-2)"
          strokeWidth="2.5"
          fill="none"
          transform="rotate(110 50 50)"
          strokeDasharray="200"
          style={{
            strokeDashoffset: 0,
            animation: "dash-anim-rev 10s linear infinite",
          }}
        />

        {/* Orbit 3: Vertical-ish (Glowing Cyan) */}
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="15"
          stroke="url(#orbit-grad-3)"
          strokeWidth="2.5"
          fill="none"
          transform="rotate(165 50 50)"
          strokeDasharray="200"
          style={{
            strokeDashoffset: 0,
            animation: "dash-anim 12s linear infinite",
          }}
        />

        {/* Orbiting particles */}
        <circle cx="50" cy="12" r="3.5" fill="#60a5fa" className="animate-ping" style={{ animationDuration: "2s" }} />

        {/* Central Core (The Source of Truth) */}
        <circle
          cx="50"
          cy="50"
          r="11"
          fill="url(#center-grad)"
          stroke="#ffffff"
          strokeWidth="1.5"
          className="shadow-lg"
        />

        {/* Core Highlight Dot */}
        <circle cx="47" cy="47" r="3" fill="#ffffff" opacity="0.8" />
      </svg>

      {showText && (
        <span className={`font-semibold tracking-tight text-foreground ${textClassName}`}>
          Personal <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">OS</span>
        </span>
      )}

      {/* Embedded animation styles */}
      <style>{`
        @keyframes dash-anim {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes dash-anim-rev {
          0% { stroke-dashoffset: -200; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
