import { useState } from "react"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { type SubscriptionItem, SUBSCRIPTION_CATEGORIES } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  Tv,
  Wifi,
  Sparkles,
} from "lucide-react"

const POPULAR_PRESETS = [
  { name: "Netflix", category: "streaming" },
  { name: "Spotify", category: "streaming" },
  { name: "YouTube", category: "streaming" },
  { name: "iCloud", category: "services" },
  { name: "Internet / Fibre", category: "internet_data" },
  { name: "Gym Membership", category: "services" },
  { name: "ChatGPT Plus", category: "services" },
]

function getSubscriptionIcon(category?: string) {
  switch (category) {
    case "streaming":
      return <Tv className="size-4 text-primary" />
    case "internet_data":
      return <Wifi className="size-4 text-primary" />
    case "utilities":
      return <Zap className="size-4 text-amber-500" />
    default:
      return <Repeat className="size-4 text-primary" />
  }
}

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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

  const applyPreset = (preset: { name: string; category: string }) => {
    setTitle(preset.name)
    setCategory(preset.category)
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
      toast.success("Subscription saved successfully")
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

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await mutations.deleteSubscription.mutateAsync(deleteConfirmId)
      toast.success("Subscription removed")
      setDeleteConfirmId(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete subscription")
    }
  }

  const formBody = (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Title & 1-Tap Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Subscription Name</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Netflix, Spotify, Internet Fibre"
          className="h-10 rounded-lg text-sm font-medium"
          required
        />
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="size-3" /> Popular:
          </span>
          {POPULAR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                title === p.name
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Amount & Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Amount</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-base font-bold text-muted-foreground pointer-events-none">
              {currency}
            </span>
            <FormattedNumberInput
              value={amount}
              onValueChange={setAmount}
              placeholder="0"
              className="h-10 pl-8 text-sm font-bold rounded-lg tabular-nums"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Billing Cycle</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl border border-border">
            {(["monthly", "weekly", "yearly"] as const).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setFrequency(freq)}
                className={`py-1.5 text-[11px] font-semibold capitalize rounded-lg transition-all ${
                  frequency === freq
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {freq === "monthly" ? "Mo" : freq === "weekly" ? "Wk" : "Yr"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Account & Billing Day */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Payment Account</label>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none"
          >
            {wallets.filter((w) => w.kind !== "investment").map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({currency}{w.balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            {frequency === "monthly" ? "Day of Month (1-31)" : "Billing Day"}
          </label>
          <Input
            type="number"
            min={1}
            max={31}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            className="h-10 rounded-lg text-sm font-semibold"
            required
          />
        </div>
      </div>

      {/* Category Selection */}
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
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="pt-2">
        <Button type="submit" className="w-full h-11 rounded-xl text-sm font-bold shadow-xs">
          {editingSub ? "Save Changes" : "Create Subscription"}
        </Button>
      </div>
    </form>
  )

  return (
    <section className="space-y-3">
      {/* Action Header: Just the button */}
      <div className="flex items-center justify-between pb-0.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {subscriptions.length} recurring {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </span>
        <Button
          type="button"
          onClick={openAdd}
          size="sm"
          className="h-8 px-3 text-xs font-semibold rounded-lg shadow-2xs"
        >
          <Plus className="size-3.5 mr-1" />
          <span>Add Subscription</span>
        </Button>
      </div>

      {/* Due Today Prompt Alert */}
      {dueToday.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertCircle className="size-4" />
            <span>Subscriptions Due Today ({dueToday.length})</span>
          </div>
          <div className="space-y-1.5">
            {dueToday.map((s) => {
              const assignedWallet = wallets.find((w) => w.id === s.walletId)
              return (
                <div key={s.id} className="flex items-center justify-between bg-card/90 rounded-lg p-2.5 text-xs border border-border/50">
                  <div>
                    <p className="font-bold text-foreground">{s.title}</p>
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

      {/* Subscriptions Card List */}
      <div className="space-y-2">
        {subscriptions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2 shadow-2xs">
            <div className="mx-auto size-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Repeat className="size-5" />
            </div>
            <p className="font-semibold text-sm text-foreground">No recurring subscriptions yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Track your Netflix, Spotify, iCloud, gym, or Internet bills here.
            </p>
            <Button type="button" onClick={openAdd} size="sm" variant="outline" className="h-8 text-xs mt-2">
              <Plus className="size-3 mr-1" /> Add Your First Subscription
            </Button>
          </div>
        ) : (
          subscriptions.map((s) => {
            const assignedWallet = wallets.find((w) => w.id === s.walletId)
            const isChargedToday = s.lastChargedAt === todayISO
            const isChargedCycle = isChargedForCycle(s)

            return (
              <div
                key={s.id}
                className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-2xs hover:border-primary/30 transition-all space-y-2.5"
              >
                {/* Top Row: Icon + Title + Meta & Amount */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      {getSubscriptionIcon(s.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground truncate">{s.title}</h4>
                        {isChargedCycle && (
                          <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                            <Check className="size-2.5" />
                            <span>{isChargedToday ? "Charged" : "Paid"}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                        <span className="capitalize">{s.category || "General"}</span>
                        <span>•</span>
                        <span>
                          {s.frequency === "monthly" && s.billingDay
                            ? `Day ${s.billingDay}`
                            : s.frequency}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{assignedWallet?.name || "Wallet"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-bold tabular-nums text-foreground block">
                      {currency}{s.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {s.frequency === "weekly" ? "/wk" : s.frequency === "yearly" ? "/yr" : "/mo"}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Row: Compact */}
                <div className="flex items-center justify-between pt-1.5 border-t border-border/40 gap-2">
                  <div>
                    {isChargedCycle ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-0.5">
                        <Check className="size-3" />
                        Paid for this cycle
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCharge(s)}
                        className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
                      >
                        <Zap className="size-3 mr-1" />
                        <span>Charge Now</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(s)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="size-3 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(s.id)}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3 mr-1" />
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
            <DrawerHeader className="px-5 pt-4 pb-2">
              <DrawerTitle className="text-base font-bold flex items-center gap-2">
                <Repeat className="size-4 text-primary" />
                <span>{editingSub ? "Edit Subscription" : "New Subscription"}</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                {editingSub
                  ? "Update recurring amount, billing day, or payment wallet"
                  : "Track regular monthly or weekly recurring commitments"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-8">
              {formBody}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Repeat className="size-4 text-primary" />
                <span>{editingSub ? "Edit Subscription" : "New Subscription"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingSub
                  ? "Update recurring amount, billing day, or payment wallet"
                  : "Track regular monthly or weekly recurring commitments"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-1">{formBody}</div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shadcn Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This subscription will be permanently removed from your recurring tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 font-semibold">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
