import { useEffect, useState } from "react"
import { Logo } from "@/components/Logo"

export function SplashScreen({ minDuration = 600 }: { minDuration?: number }) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Hide the initial HTML inline splash screen once React mounts
    const htmlSplash = document.getElementById("pos-inline-splash")
    if (htmlSplash) {
      htmlSplash.style.display = "none"
    }

    const timer = setTimeout(() => {
      setFading(true)
      const fadeTimer = setTimeout(() => {
        setVisible(false)
      }, 400)
      return () => clearTimeout(fadeTimer)
    }, minDuration)

    return () => clearTimeout(timer)
  }, [minDuration])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400 select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
        <Logo size={56} />
        
        <div className="text-center space-y-1">
          <h1 className="text-base font-bold tracking-tight text-foreground">
            Personal <span className="text-primary">OS</span>
          </h1>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
            Clarity & Wealth
          </p>
        </div>

        {/* Minimal Progress Line */}
        <div className="w-24 h-0.5 bg-muted rounded-full overflow-hidden mt-3">
          <div className="w-full h-full bg-primary animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
