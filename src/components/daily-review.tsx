import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  isDailyReviewDone,
  markDailyReviewDone,
  openDebts,
  todayISODate,
  type CaptureType,
  type DebtItem,
  type GoalItem,
  type TimelineItem,
} from "@/lib/storage"
import {
  CheckCircle2,
  Sparkles,
  X,
  TrendingDown,
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

type Props = {
  timeline: TimelineItem[]
  debts: DebtItem[]
  goals: GoalItem[]
  currency: string
  forceShow?: boolean
  onQuickCapture?: (type: CaptureType) => void
}

function isEvening() {
  return new Date().getHours() >= 18
}

export function DailyReviewCard({
  timeline,
  debts,
  goals,
  currency,
  forceShow,
  onQuickCapture,
}: Props) {
  const [done, setDone] = useState(() => isDailyReviewDone())
  const [dismissed, setDismissed] = useState(false)
  const show = (forceShow || isEvening() || !done) && !dismissed

  const summary = useMemo(() => {
    const money = timeline.filter((t) => t.type !== "task")
    const spent = money
      .filter((t) => t.type === "expense" || t.type === "bill")
      .reduce((s, t) => s + (t.amount || 0), 0)
    const income = money
      .filter((t) => t.type === "income" || t.type === "owed_to_me")
      .reduce((s, t) => s + (t.amount || 0), 0)
    const tasksOpen = timeline.filter((t) => t.type === "task").length
    const billsOpen = timeline.filter((t) => t.type === "bill").length
    const openDebtList = openDebts(debts)
    const goalsBehind = goals.filter((g) => g.current < g.target && g.deadline)
    return {
      spent,
      income,
      tasksOpen,
      billsOpen,
      openDebt: openDebtList,
      goalsBehind,
      moneyCount: money.length,
    }
  }, [timeline, debts, goals])

  const pendingChips: { label: string; count: number; type?: CaptureType }[] = []
  if (summary.tasksOpen > 0) {
    pendingChips.push({ label: `${summary.tasksOpen} tasks`, count: summary.tasksOpen, type: "task" })
  }
  if (summary.billsOpen > 0) {
    pendingChips.push({ label: `${summary.billsOpen} bills`, count: summary.billsOpen, type: "bill" })
  }
  if (summary.openDebt.length > 0) {
    pendingChips.push({ label: `${summary.openDebt.length} debts`, count: summary.openDebt.length, type: "i_owe" })
  }

  if (!show && done) return null
  if (dismissed && !forceShow) return null

  const finish = () => {
    markDailyReviewDone(todayISODate())
    setDone(true)
  }

  // Completed State
  if (done && !forceShow) {
    return (
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Day Reviewed & Balanced</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {summary.moneyCount} entries logged today · Everything in sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            Review again
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card p-4 space-y-3.5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
              {isEvening() ? "Evening Financial Recap" : "Daily Pulse & Balance"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Verify your spending, income, and pending items for today
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Dismiss review"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <div className="rounded-md border border-border/70 bg-muted/30 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <TrendingDown className="size-3.5 text-red-500" />
            <span>Spent Today</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
            {currency}{summary.spent.toLocaleString()}
          </p>
        </div>

        <div className="rounded-md border border-border/70 bg-muted/30 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-500" />
            <span>Inflow Today</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{currency}{summary.income.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Pending Attention Chips */}
      {pendingChips.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Clock className="size-3.5 text-amber-500" />
            <span>Pending Attention</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => chip.type && onQuickCapture?.(chip.type)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all"
              >
                <span>{chip.label}</span>
                <ChevronRight className="size-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <Button
          type="button"
          onClick={finish}
          className="h-9 flex-1 rounded-md text-xs font-bold shadow-xs"
        >
          <ShieldCheck className="size-3.5 mr-1.5" />
          Looks Good, Mark Reviewed
        </Button>
        <button
          type="button"
          onClick={() => onQuickCapture?.("expense")}
          className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all"
        >
          + Add Missing
        </button>
      </div>
    </section>
  )
}
