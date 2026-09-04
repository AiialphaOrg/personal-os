import {
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react"
import { useNavigate } from "react-router"
import type { CaptureType } from "@/lib/storage"
import { cn } from "@/lib/utils"

type ActionDef = {
  type: CaptureType
  label: string
  icon: LucideIcon
}

const QUICK_ACTIONS: ActionDef[] = [
  { type: "expense", label: "Expense", icon: ArrowUpRight },
  { type: "income", label: "Income", icon: ArrowDownLeft },
  { type: "transfer", label: "Transfer", icon: ArrowRightLeft },
  { type: "i_owe", label: "Debt & Loan", icon: HandCoins },
]

type CaptureActionsProps = {
  onSelect?: (type: CaptureType) => void
  onVoice?: () => void
  className?: string
}

/** Quick Access grid matching the reference design */
export function CaptureActions({
  onSelect,
  className,
}: CaptureActionsProps) {
  const navigate = useNavigate()

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-xs font-bold tracking-tight text-foreground">Quick Access</h2>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.type}
              type="button"
              onClick={() => {
                if (onSelect) onSelect(action.type)
                else navigate(`/capture/${action.type}`)
              }}
              className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card dark:bg-[#181720] p-2.5 sm:p-3 transition-all hover:bg-muted/40 dark:hover:bg-[#201e2b] active:scale-95 shadow-2xs"
            >
              <div className="flex size-8 sm:size-9 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.08] text-foreground dark:text-white transition-transform group-hover:scale-105">
                <Icon className="size-4 sm:size-4.5 stroke-[2px]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground dark:text-white truncate w-full text-center tracking-tight">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}


