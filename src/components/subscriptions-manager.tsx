import { useState } from "react"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { type SubscriptionItem, SUBSCRIPTION_CATEGORIES } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Edit3,

  Repeat,
  Zap,
  Check,
  AlertCircle,
  Calendar,
  Wallet,
} from "lucide-react"

export function SubscriptionsManager() {
  const isMobile = useIsMobile()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { subscriptions, wallets } = usePosQuery()
  const mutations = usePosMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null)
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<"monthly" | "weekly" | "yearly">("monthly")
  const [billingDay, setBillingDay] = useState("1")
  const [walletId, setWalletId] = useState(wallets[0]?.id || "w-cash")
  const [category, setCategory] = useState("services")
  const [error, setError] = useState("")

  const today = new Date()
  const currentDay = today.getDate()
  const todayISO = today.toISOString().split("T")[0]
  const currentMonthStr = todayISO.slice(0, 7) // "YYYY-MM"
  const currentYearStr = todayISO.slice(0, 4) // "YYYY"

  // Subscriptions due today
  const dueToday = subscriptions.filter((s) => {
    if (!s.enabled) return false
    if (s.lastChargedAt === todayISO) return false
    if (s.frequency === "monthly" && s.billingDay === currentDay) return true
    return false
  })

  const isChargedForCycle = (s: SubscriptionItem) => {
    if (!s.lastChargedAt) return false
    if (s.lastChargedAt === todayISO) return true
    if (s.frequency === "monthly" && s.lastChargedAt.startsWith(currentMonthStr)) return true
    if (s.frequency === "yearly" && s.lastChargedAt.startsWith(currentYearStr)) return true
    if (s.frequency === "weekly") {
      const last = new Date(s.lastChargedAt).getTime()
      const diffDays = (today.getTime() - last) / (1000 * 3600 * 24)
      if (diffDays < 7) return true
    }
    return false
  }

  const openAdd = () => {
    setEditingSub(null)
    setTitle("")
    setAmount("")
    setFrequency("monthly")
    setBillingDay(String(currentDay))
    setWalletId(wallets[0]?.id || "w-cash")
    setCategory("services")
    setError("")
    setFormOpen(true)
  }

  const openEdit = (s: SubscriptionItem) => {
    setEditingSub(s)
    setTitle(s.title)
    setAmount(String(s.amount))
    setFrequency(s.frequency)
    setBillingDay(s.billingDay ? String(s.billingDay) : "1")
    setWalletId(s.walletId || wallets[0]?.id || "w-cash")
    setCategory(s.category || "services")
    setError("")
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!title.trim()) {
      setError("Please enter subscription title")
      return
    }
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError("Please enter a valid amount")
      return
    }

    try {
      await mutations.addSubscription.mutateAsync({
        id: editingSub?.id,
        title: title.trim(),
        amount: amt,
        frequency,
        billingDay: Number(billingDay) || 1,
        walletId,
        category,
      })
      toast.success("Subscription saved online")
      setFormOpen(false)
    } catch (err: any) {
      setError(err.message || "Failed to save subscription")
    }
  }

  const handleCharge = async (s: SubscriptionItem) => {
    try {
      await mutations.chargeSubscription.mutateAsync({
        id: s.id,
        walletId: s.walletId || wallets[0]?.id,
      })
      toast.success(`Charged ${currency}${s.amount.toLocaleString()} for ${s.title}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to log charge")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this subscription?")) {
      try {
        await mutations.deleteSubscription.mutateAsync(id)
        toast.success("Subscription removed")
      } catch (err: any) {
        toast.error(err.message || "Failed to delete subscription")
      }
    }
  }

  const formBody = (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Subscription Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Netflix, Spotify, Internet Fibre"
          className="h-11 rounded-lg text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Amount ({currency})</label>
          <FormattedNumberInput
            value={amount}
            onValueChange={setAmount}
            placeholder="0"
            className="h-11 rounded-lg text-sm font-semibold tabular-nums"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Frequency</label>
          <select
            value={frequency}
            onChange={(e: any) => setFrequency(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Payment Account</label>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            {wallets.filter((w) => w.kind !== "investment").map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({currency}{w.balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Billing Day (1-31)</label>
          <Input
            type="number"
            min={1}
            max={31}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            className="h-11 rounded-lg text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SUBSCRIPTION_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-lg border px-2.5 py-2 text-xs font-semibold capitalize transition-all ${
                category === c.id
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="pt-2">
        <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs">
          {editingSub ? "Save Changes" : "Create Subscription"}
        </Button>
      </div>
    </form>
  )

  return (
    <section className="space-y-3">
      {/* Header Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="size-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground tracking-tight">Active Subscriptions ({subscriptions.length})</h3>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-2xs"
        >
          <Plus className="size-3.5" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Due Today Prompt Alert */}
      {dueToday.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertCircle className="size-4" />
            <span>Subscriptions Due Today ({dueToday.length})</span>
          </div>
          <div className="space-y-1.5">
            {dueToday.map((s) => {
              const assignedWallet = wallets.find((w) => w.id === s.walletId)
              return (
                <div key={s.id} className="flex items-center justify-between bg-card/80 rounded-md p-2 text-xs border border-border/40">
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {currency}{s.amount.toLocaleString()} from {assignedWallet?.name || "Wallet"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCharge(s)}
                    className="h-7 text-[11px] px-2.5 rounded-md font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Charge Now
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">No recurring subscriptions yet</p>
            <p className="text-[11px]">Track your Netflix, Spotify, iCloud, or Internet bills here.</p>
          </div>
        ) : (
          subscriptions.map((s) => {
            const assignedWallet = wallets.find((w) => w.id === s.walletId)
            const isChargedToday = s.lastChargedAt === todayISO
            const isChargedCycle = isChargedForCycle(s)

            return (
              <div key={s.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                {/* Top Row: Title, Badges & Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{s.title}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                        {s.category || "General"}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                        {s.frequency}
                      </span>
                      {isChargedCycle && (
                        <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                          <Check className="size-3" />
                          <span>
                            {isChargedToday
                              ? "Charged today"
                              : s.frequency === "weekly"
                              ? "Paid this week"
                              : "Paid this month"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums text-foreground block">
                      {currency}{s.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.frequency === "weekly" ? "per week" : s.frequency === "yearly" ? "per year" : "per month"}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Schedule & Wallet */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>
                      {s.frequency === "monthly" && s.billingDay
                        ? `Billing on ${s.billingDay}${s.billingDay === 1 ? "st" : s.billingDay === 2 ? "nd" : s.billingDay === 3 ? "rd" : "th"} of month`
                        : "Recurring schedule"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-muted-foreground" />
                    <span>{assignedWallet?.name || "Default Wallet"}</span>
                  </div>
                </div>

                {/* Bottom Row: Clear Action Buttons Underneath */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
                  {isChargedCycle ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      className="h-8 px-3 text-xs font-medium rounded-lg bg-muted text-muted-foreground opacity-60 cursor-not-allowed shadow-none border border-border/50"
                    >
                      <Check className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Paid for {s.frequency === "weekly" ? "this week" : s.frequency === "yearly" ? "this year" : "this month"}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCharge(s)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
                    >
                      <Zap className="size-3.5 mr-1.5" />
                      <span>Charge ({currency}{s.amount.toLocaleString()})</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(s)}
                      className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="size-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s.id)}
                      className="h-8 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal / Drawer Form */}
      {isMobile ? (
        <Drawer open={formOpen} onOpenChange={setFormOpen}>
          <DrawerContent className="p-0">
            <DrawerHeader>
              <DrawerTitle>
                {editingSub ? "Edit Subscription" : "New Subscription"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
              {formBody}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingSub ? "Edit Subscription" : "New Subscription"}
              </DialogTitle>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
