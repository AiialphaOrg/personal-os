import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { CaptureActions } from "@/components/capture-actions"
import { useHeader } from "@/hooks/use-header"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { useVoiceCapture } from "@/hooks/use-voice-capture"
import type { CaptureIntent } from "@/lib/ai/on-device"
import { applyCaptureSubmit } from "@/lib/capture-apply"
import {
  openDebts,
  type CaptureType,
} from "@/lib/storage"
import {
  Briefcase,
  FileText,
  Coins,
  ArrowRightLeft,
  ChevronRight,
  Bell,
  HandCoins,
  History,
} from "lucide-react"
import { usePosQuery } from "@/hooks/use-pos-query"


function formatTodayDate() {

  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatRelativeDue(dateStr?: string) {
  if (!dateStr) return "Due soon"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  if (isNaN(due.getTime())) return `due ${dateStr}`
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays === 2) return "Due in 2 days"
  if (diffDays > 2 && diffDays <= 7) return `Due in ${diffDays} days`
  if (diffDays > 7 && diffDays <= 14) return "Due next week"
  if (diffDays > 14) return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  if (diffDays === -1) return "Overdue (yesterday)"
  if (diffDays < -1 && diffDays >= -7) return `Overdue (${Math.abs(diffDays)}d ago)`
  if (diffDays < -7 && diffDays >= -14) return "Overdue (last week)"
  return `Overdue (${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
}

function SectionHeader({
  title,
  trailing,
}: {
  title: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-xs font-bold tracking-tight text-foreground">{title}</h2>
      {trailing}
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  useHeader({
    title: "Home",
  })
  const keyboardInset = useKeyboardInset()
  const currency = localStorage.getItem("pos_currency") || "₦"



  const { wallets, transactions: timelineItems, debts, metrics, isLoading } = usePosQuery()


  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formType, setFormType] = useState<CaptureType>("expense")
  const [presets, setPresets] = useState<
    | {
      title?: string
      amount?: string
      fromWallet?: string
      toWallet?: string
      person?: string
    }
    | undefined
  >()

  const defaultWalletId = wallets[0]?.id || "w-cash"

  const openCapture = useCallback(
    (
      type: CaptureType,
      nextPresets?: {
        title?: string
        amount?: string
        fromWallet?: string
        toWallet?: string
        person?: string
        walletId?: string
        category?: string
        dueDate?: string
      }
    ) => {
      setFormType(type)
      setPresets(nextPresets)
      setIsFormOpen(true)
    },
    []
  )

  const onIntent = useCallback(
    (intent: CaptureIntent) => {
      if (intent.type === "transfer") {
        openCapture("transfer", {
          title: intent.title,
          amount: intent.amount != null ? String(intent.amount) : undefined,
          fromWallet: intent.fromWallet || intent.wallet,
          toWallet: intent.toWallet,
        })
        return
      }
      if (intent.type === "task") {
        openCapture("task", { title: intent.title })
        return
      }
      if (intent.type === "i_owe" || intent.type === "owed_to_me") {
        openCapture(intent.type, {
          title: intent.title,
          person: intent.person || intent.title,
          amount: intent.amount != null ? String(intent.amount) : undefined,
          walletId: intent.wallet,
          category: intent.category,
          dueDate: intent.dueDate,
        })
        return
      }
      if (intent.type === "income") {
        openCapture("income", {
          title: intent.title,
          person: intent.person,
          amount: intent.amount != null ? String(intent.amount) : undefined,
          walletId: intent.wallet,
          category: intent.category,
          dueDate: intent.dueDate,
        })
        return
      }
      openCapture("expense", {
        title: intent.title,
        amount: intent.amount != null ? String(intent.amount) : undefined,
        walletId: intent.wallet,
        fromWallet: intent.wallet,
        category: intent.category,
        dueDate: intent.dueDate,
      })
    },
    [openCapture]
  )

  const { hint, aiProgress } = useVoiceCapture({
    onCapture: onIntent,
  })

  useEffect(() => {
    const onQuickAdd = () => openCapture("expense")
    const onTransfer = () => openCapture("transfer")
    const onDebt = () => openCapture("i_owe")
    const onBill = () => openCapture("bill")
    window.addEventListener("pos:quick-add", onQuickAdd)
    window.addEventListener("pos:quick-add-transfer", onTransfer)
    window.addEventListener("pos:quick-add-debt", onDebt)
    window.addEventListener("pos:quick-add-bill", onBill)
    return () => {
      window.removeEventListener("pos:quick-add", onQuickAdd)
      window.removeEventListener("pos:quick-add-transfer", onTransfer)
      window.removeEventListener("pos:quick-add-debt", onDebt)
      window.removeEventListener("pos:quick-add-bill", onBill)
    }
  }, [openCapture])

  const applyCapture = (data: CaptureSubmit) => {
    const result = applyCaptureSubmit(data)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
  }

  const getCategoryIcon = (category: string, type: string) => {
    if (type === "transfer") return <ArrowRightLeft className="size-4 text-primary" />
    if (type === "i_owe" || type === "owed_to_me")
      return <HandCoins className="size-4 text-amber-600" />
    if (category === "food") return <Coins className="size-4 text-red-500" />
    if (category === "work" || category === "salary")
      return <Briefcase className="size-4 text-emerald-600" />
    if (category === "utilities") return <FileText className="size-4 text-amber-500" />
    return <Coins className="size-4 text-muted-foreground" />
  }

  const spentToday = metrics?.spentToday ?? timelineItems
    .filter((i) => i.type === "expense" || i.type === "bill")
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  const incomeToday = metrics?.inflowToday ?? timelineItems
    .filter((i) => i.type === "income" || i.type === "owed_to_me")
    .reduce((sum, i) => sum + (i.amount || 0), 0)


  const bills = timelineItems.filter((i) => i.type === "bill")

  const activeDebts = openDebts(debts)
  const youOweList = activeDebts.filter((d) => d.direction === "i_owe")
  const owedToYouList = activeDebts.filter((d) => d.direction === "owed_to_me")

  const dueDebts = activeDebts.filter((d) => d.dueDate).slice(0, 5)

  const moneyItems = timelineItems.filter((i) => i.type !== "task")
  const visibleActivity = moneyItems.slice(0, 4)


  return (
    <div
      className="space-y-3.5"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      {(hint || aiProgress) && (
        <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
          {hint || aiProgress}
        </p>
      )}

      {/* TOP PRIMARY HERO: Daily Spending & Inflow Review Card */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-4 sm:p-4.5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Today</span>
            <span className="text-[11px] text-muted-foreground">• {formatTodayDate()}</span>
            {/* <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                budgetUsed > 85
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : budgetUsed > 60
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {budgetUsed}% Used
            </span> */}
          </div>

          <Link
            to="/transactions"
            className="flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <History className="size-3.5" />
            <span>History</span>
          </Link>
        </div>


        {/* Big Spending & Income stats */}
        {isLoading && timelineItems.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-md bg-muted/40 p-3 space-y-2 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-7 w-28 bg-muted rounded" />
            </div>
            <div className="rounded-md bg-muted/40 p-3 space-y-2 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-7 w-28 bg-muted rounded" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-md bg-muted/40 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span>Spent Today</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {currency}{spentToday.toLocaleString()}
              </p>
            </div>

            <div className="rounded-md bg-muted/40 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span>Income / Inflow</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{currency}{incomeToday.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Daily budget progress */}
        {/* <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Daily Limit: {currency}{budget.toLocaleString()}</span>
            <span className="font-semibold text-foreground tabular-nums">
              {currency}{remainingBudget.toLocaleString()} left
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetUsed > 85
                  ? "bg-red-500"
                  : budgetUsed > 60
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
              style={{ width: `${budgetUsed}%` }}
            />
          </div>
        </div> */}
      </section>

      {/* Quick Access Action Shortcuts */}
      <CaptureActions
        onSelect={(type) => navigate(`/capture/${type}`)}
      />

      {/* Borrowing (I Owe) Section */}
      <section className="space-y-2">
        <SectionHeader
          title="Borrowing (I Owe)"
          trailing={
            <Link to="/money" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              View more
              <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
          {youOweList.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground">
              No active borrowings or payables.
            </p>
          ) : (
            youOweList.slice(0, 3).map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/debts/${d.id}`)}
                className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <HandCoins className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{d.person}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Remaining: {currency}{d.remaining.toLocaleString()} · <span className="font-semibold text-amber-600 dark:text-amber-400">{formatRelativeDue(d.dueDate)}</span>
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                  -{currency}{d.remaining.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Receivables (Owed to You) Section */}
      <section className="space-y-2">
        <SectionHeader
          title="Receivables (Owed to You)"
          trailing={
            <Link to="/money" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              View more
              <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
          {owedToYouList.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground">
              No active receivables.
            </p>
          ) : (
            owedToYouList.slice(0, 3).map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/debts/${d.id}`)}
                className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <HandCoins className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{d.person}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Remaining: {currency}{d.remaining.toLocaleString()} · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRelativeDue(d.dueDate)}</span>
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{currency}{d.remaining.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>


      {/* Due Soon Section with Human Relative Dates */}
      {(bills.length > 0 || dueDebts.length > 0) && (
        <section className="space-y-2">
          <SectionHeader
            title="Due Soon"
            trailing={
              <span className="text-xs text-muted-foreground font-medium">
                {bills.length + dueDebts.length} pending
              </span>
            }
          />
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
            {dueDebts.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/debts/${d.id}`)}
                className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >

                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                  <HandCoins className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{d.person}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.direction === "i_owe" ? "You owe" : "Owed to you"} · <span className="font-semibold text-amber-600 dark:text-amber-400">{formatRelativeDue(d.dueDate)}</span>
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                  {currency}
                  {d.remaining.toLocaleString()}
                </p>
              </div>
            ))}
            {bills.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/transactions/${item.id}`)}
                className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.detail} · <span className="font-semibold text-amber-600 dark:text-amber-400">{formatRelativeDue(item.time)}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {currency}
                    {(item.amount || 0).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCapture("expense", {
                        amount: String(item.amount || ""),
                        title: item.title,
                      })
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Pay now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="space-y-2">
        <SectionHeader
          title="Recent Transactions"
          trailing={
            <Link to="/transactions" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              View all
              <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
          {isLoading && moneyItems.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="size-8 rounded-md bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 bg-muted rounded" />
                    <div className="h-2.5 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : moneyItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nothing logged yet — use quick access above.
            </p>
          ) : (
            visibleActivity.map((item) => {
              let text = item.detail ? String(item.detail).trim() : ""
              if (text.includes("__POS_META__") || text.toLowerCase().includes("pos_meta") || text.toLowerCase().includes("pos meta")) {
                try {
                  const jsonPart = text.replace(/.*?(__POS_META__|pos_meta|POS_META)/i, "")
                  const parsed = JSON.parse(jsonPart)
                  text = parsed.text || parsed.note || parsed.title || ""
                } catch {
                  text = ""
                }
              } else if (text.startsWith("{") && text.endsWith("}")) {
                try {
                  const parsed = JSON.parse(text)
                  text = parsed.text || parsed.note || ""
                } catch {
                  text = ""
                }
              }

              const lower = text.toLowerCase()
              if (
                !text ||
                lower === "meta" ||
                lower === "pos meta" ||
                lower === "pos_meta" ||
                lower === "undefined" ||
                lower === "null" ||
                lower.startsWith("__pos_meta__")
              ) {
                text = ""
              }

              const cleanDetail = text || (item.type === "transfer" ? "Account Transfer" : (item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "General"))

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/transactions/${item.id}`)}
                  className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/80">
                    {getCategoryIcon(item.category, item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {cleanDetail} · {item.time}
                    </p>
                  </div>
                  {item.amount !== null && (
                    <p
                      className={`text-xs sm:text-sm font-bold tabular-nums ${item.type === "income" || item.type === "owed_to_me"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : item.type === "transfer"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                    >
                      {item.type === "income" || item.type === "owed_to_me"
                        ? "+"
                        : item.type === "transfer"
                          ? ""
                          : "-"}
                      {currency}
                      {item.amount.toLocaleString()}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>


      <CaptureSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        type={formType}
        wallets={wallets.filter((w) => w.kind !== "investment")}
        currency={currency}
        defaultWalletId={defaultWalletId}
        presets={presets}
        onSubmit={applyCapture}
      />
    </div>
  )
}

/** @deprecated Use HomePage */
export const TodayPage = HomePage
