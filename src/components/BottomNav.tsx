import { NavLink } from "react-router"
import { Home, Wallet, Repeat, TrendingUp, User } from "lucide-react"

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className = "" }: BottomNavProps) {
  const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/money", label: "Finances", icon: Wallet },
    { to: "/subscriptions", label: "Subs & Plan", icon: Repeat },
    { to: "/insights", label: "Insights", icon: TrendingUp },
    { to: "/settings", label: "Profile", icon: User },
  ]



  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 flex h-[64px] items-center justify-around border-t border-zinc-200/80 bg-white/95 dark:border-white/[0.08] dark:bg-[#121118]/95 px-2 pb-safe backdrop-blur-xl md:hidden transition-colors ${className}`}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all duration-150 active:scale-90 ${
                isActive
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-400 dark:text-[#7d7c83] hover:text-zinc-600 dark:hover:text-zinc-300"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center">
                  {/* Subtle radiant active glow shade */}
                  {isActive && (
                    <span className="absolute -inset-1 rounded-full bg-primary/20 dark:bg-white/20 blur-md pointer-events-none" />
                  )}
                  <Icon
                    className={`size-[23px] relative z-10 transition-all duration-150 ${
                      isActive
                        ? "fill-current text-zinc-950 dark:text-white stroke-[2.25px] scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]"
                        : "fill-none text-zinc-400 dark:text-[#7d7c83] stroke-[1.6px]"
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] leading-none tracking-tight transition-all duration-150 ${
                    isActive
                      ? "font-bold text-zinc-950 dark:text-white scale-105"
                      : "font-normal text-zinc-500 dark:text-[#7d7c83]"
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}



