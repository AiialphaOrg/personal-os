import { useState } from "react"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { type PlannedPurchaseItem } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  CheckSquare,
  ShoppingCart,
  CreditCard,
  Banknote,
  Check,
  ShoppingBag,
  Smartphone,
  Sparkles,
} from "lucide-react"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"

const WISHLIST_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "gadget", label: "Tech / Gadget" },
  { id: "clothing", label: "Clothing" },
  { id: "home", label: "Home / Living" },
  { id: "groceries", label: "Bulk Stock" },
  { id: "vehicle", label: "Vehicle / Auto" },
  { id: "books", label: "Learning" },
  { id: "gift", label: "Gifts" },
]

const POPULAR_WISHLIST_PRESETS = [
  { name: "Running Shoes", category: "clothing" },
  { name: "Wireless Earbuds", category: "gadget" },
  { name: "Power Bank", category: "gadget" },
  { name: "Office Chair", category: "home" },
  { name: "Rice & Provisions", category: "groceries" },
  { name: "Perfume / Cologne", category: "general" },
]

function getWishlistIcon(category?: string) {
  switch (category) {
    case "gadget":
      return <Smartphone className="size-4 text-primary" />
    default:
      return <ShoppingBag className="size-4 text-primary" />
  }
}

export function PlannedPurchasesChecklist() {
  const isMobile = useIsMobile()
  const { plannedPurchases, wallets } = usePosQuery()
  const mutations = usePosMutations()
  const currency = localStorage.getItem("pos_currency") || "₦"

  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PlannedPurchaseItem | null>(null)
  const [checkoutItem, setCheckoutItem] = useState<PlannedPurchaseItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<"once" | "weekly" | "monthly">("once")
  const [category, setCategory] = useState("general")
  const [error, setError] = useState("")

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [actualAmount, setActualAmount] = useState("")
  const [walletId, setWalletId] = useState(wallets[0]?.id || "w-cash")
  const [person, setPerson] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [checkoutError, setCheckoutError] = useState("")

  const plannedList = plannedPurchases.filter((p) => p.status !== "purchased")
  const purchasedList = plannedPurchases.filter((p) => p.status === "purchased")

  const openAdd = () => {
    setEditingItem(null)
    setTitle("")
    setAmount("")
    setFrequency("once")
    setCategory("general")
    setError("")
    setAddOpen(true)
  }

  const openEdit = (item: PlannedPurchaseItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setAmount(String(item.estimatedAmount))
    setFrequency(item.frequency)
    setCategory(item.category || "general")
    setError("")
    setAddOpen(true)
  }

  const applyPreset = (preset: { name: string; category: string }) => {
    setTitle(preset.name)
    setCategory(preset.category)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!title.trim()) {
      setError("Please enter item name")
      return
    }
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError("Please enter estimated budget amount")
      return
    }

    try {
      await mutations.addPlannedPurchase.mutateAsync({
        id: editingItem?.id,
        title: title.trim(),
        estimatedAmount: amt,
        frequency,
        category,
        status: editingItem?.status || "planned",
      })
      toast.success("Saved to wishlist")
      setAddOpen(false)
    } catch (err: any) {
      setError(err.message || "Failed to save item")
    }
  }

  const openCheckout = (item: PlannedPurchaseItem) => {
    setCheckoutItem(item)
    setPaymentMethod("cash")
    setActualAmount(String(item.estimatedAmount))
    setWalletId(wallets[0]?.id || "w-cash")
    setPerson("")
    setDueDate(new Date().toISOString().split("T")[0])
    setCheckoutError("")
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutError("")
    if (!checkoutItem) return

    const amt = Number(actualAmount)
    if (!amt || amt <= 0) {
      setCheckoutError("Please enter valid amount paid or owed")
      return
    }

    if (paymentMethod === "credit" && !person.trim()) {
      setCheckoutError("Please enter creditor / seller name")
      return
    }

    try {
      await mutations.checkoutPlannedPurchase.mutateAsync({
        id: checkoutItem.id,
        payload: {
          paymentMethod,
          actualAmount: amt,
          walletId: paymentMethod === "cash" ? walletId : undefined,
          person: paymentMethod === "credit" ? person.trim() : undefined,
          dueDate: paymentMethod === "credit" && dueDate ? dueDate : undefined,
        },
      })

      if (paymentMethod === "cash") {
        toast.success(`Bought ${checkoutItem.title} for ${currency}${amt.toLocaleString()} (Logged as Expense)`)
      } else {
        toast.success(`Bought ${checkoutItem.title} on credit (Logged as Payable to ${person})`)
      }

      setCheckoutItem(null)
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to complete checkout")
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await mutations.deletePlannedPurchase.mutateAsync(deleteConfirmId)
      toast.success("Item removed from wishlist")
      setDeleteConfirmId(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item")
    }
  }

  const formBody = (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Title & Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Item Name / Wish</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Running Shoes, Headphones, Rice Bag"
          className="h-10 rounded-lg text-sm font-medium"
          required
        />
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="size-3" /> Quick:
          </span>
          {POPULAR_WISHLIST_PRESETS.map((p) => (
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

      {/* Budget & Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Est. Budget</label>
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
          <label className="text-xs font-semibold text-foreground">Plan Frequency</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl border border-border">
            {[
              { id: "once" as const, label: "Once" },
              { id: "weekly" as const, label: "Weekly" },
              { id: "monthly" as const, label: "Monthly" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrequency(f.id)}
                className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  frequency === f.id
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {WISHLIST_CATEGORIES.map((c) => (
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
          {editingItem ? "Save Changes" : "Add to Wishlist"}
        </Button>
      </div>
    </form>
  )

  const checkoutBody = checkoutItem && (
    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
      <div className="rounded-xl bg-muted/50 p-3.5 space-y-1 border border-border/50">
        <p className="text-xs font-bold text-foreground">{checkoutItem?.title}</p>
        <p className="text-[11px] text-muted-foreground">
          Est. Budget: {currency}{checkoutItem?.estimatedAmount.toLocaleString()} • Category: {checkoutItem?.category}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
              paymentMethod === "cash"
                ? "border-primary bg-primary/10 text-primary shadow-2xs font-bold"
                : "border-border text-muted-foreground hover:text-foreground bg-card"
            }`}
          >
            <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Paid Cash / Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("credit")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
              paymentMethod === "credit"
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-2xs font-bold"
                : "border-border text-muted-foreground hover:text-foreground bg-card"
            }`}
          >
            <CreditCard className="size-4 text-amber-600 dark:text-amber-400" />
            <span>Buy on Credit (I Owe)</span>
          </button>
        </div>
      </div>

      {paymentMethod === "cash" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Actual Amount Paid</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm font-bold text-muted-foreground pointer-events-none">
                {currency}
              </span>
              <FormattedNumberInput
                value={actualAmount}
                onValueChange={setActualAmount}
                placeholder="0"
                className="h-10 pl-7 text-sm font-bold rounded-lg tabular-nums"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Deduct from Wallet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none"
            >
              {wallets
                .filter((w) => w.kind !== "investment")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({currency}{w.balance.toLocaleString()})
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {paymentMethod === "credit" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Amount Owed</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-muted-foreground pointer-events-none">
                  {currency}
                </span>
                <FormattedNumberInput
                  value={actualAmount}
                  onValueChange={setActualAmount}
                  placeholder="0"
                  className="h-10 pl-7 text-sm font-bold rounded-lg tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Creditor / Shop</label>
              <Input
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="e.g. Mama Ngozi, Store"
                className="h-10 rounded-lg text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Due Date (Optional)</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10 rounded-lg text-sm font-medium"
            />
          </div>
        </div>
      )}

      {checkoutError && <p className="text-xs font-medium text-destructive">{checkoutError}</p>}

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full h-11 rounded-xl text-sm font-bold shadow-xs"
        >
          <Check className="size-4 mr-1.5" />
          <span>Confirm & Record Purchase</span>
        </Button>
      </div>
    </form>
  )

  return (
    <section className="space-y-3">
      {/* Action Header: Just the button */}
      <div className="flex items-center justify-between pb-0.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {plannedList.length} planned {plannedList.length === 1 ? "item" : "items"}
        </span>
        <Button
          type="button"
          onClick={openAdd}
          size="sm"
          className="h-8 px-3 text-xs font-semibold rounded-lg shadow-2xs"
        >
          <Plus className="size-3.5 mr-1" />
          <span>Add Item</span>
        </Button>
      </div>

      {/* Wishlist Cards */}
      <div className="space-y-2">
        {plannedList.length === 0 && purchasedList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2 shadow-2xs">
            <div className="mx-auto size-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="size-5" />
            </div>
            <p className="font-semibold text-sm text-foreground">No planned purchases yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Add future buys you want to save or plan for (tech, clothes, home, or restocking).
            </p>
            <Button type="button" onClick={openAdd} size="sm" variant="outline" className="h-8 text-xs mt-2">
              <Plus className="size-3 mr-1" /> Add Your First Wish
            </Button>
          </div>
        ) : (
          <>
            {plannedList.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-2xs hover:border-primary/30 transition-all space-y-2.5"
              >
                {/* Top Row: Icon + Title + Meta & Estimated Price */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      {getWishlistIcon(p.category)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{p.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                        <span className="capitalize">{p.category}</span>
                        <span>•</span>
                        <span className="capitalize">{p.frequency === "once" ? "One-time" : `${p.frequency} plan`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-bold tabular-nums text-foreground block">
                      {currency}{p.estimatedAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Est. budget</span>
                  </div>
                </div>

                {/* Bottom Action Row: Compact */}
                <div className="flex items-center justify-between pt-1.5 border-t border-border/40 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCheckout(p)}
                    className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
                  >
                    <ShoppingCart className="size-3 mr-1" />
                    <span>Buy / Checkout</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="size-3 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Purchased Items Section */}
            {purchasedList.length > 0 && (
              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2.5">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Purchased ({purchasedList.length})</span>
                  <span>{currency}{purchasedList.reduce((sum, p) => sum + p.estimatedAmount, 0).toLocaleString()} spent</span>
                </div>
                <div className="space-y-1.5">
                  {purchasedList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="line-through font-semibold text-foreground truncate">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground">Purchased</p>
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums text-muted-foreground">
                        {currency}{p.estimatedAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isMobile ? (
        <Drawer open={addOpen} onOpenChange={setAddOpen}>
          <DrawerContent className="p-0">
            <DrawerHeader className="px-5 pt-4 pb-2">
              <DrawerTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="size-4 text-primary" />
                <span>{editingItem ? "Edit Planned Item" : "New Wishlist Item"}</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                {editingItem ? "Update estimated budget or plan" : "Plan a future purchase and allocate a target budget"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-8">
              {formBody}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="size-4 text-primary" />
                <span>{editingItem ? "Edit Planned Item" : "New Wishlist Item"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingItem ? "Update estimated budget or plan" : "Plan a future purchase and allocate a target budget"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-1">{formBody}</div>
          </DialogContent>
        </Dialog>
      )}

      {/* Checkout Dialog */}
      {isMobile ? (
        <Drawer open={Boolean(checkoutItem)} onOpenChange={(open) => !open && setCheckoutItem(null)}>
          <DrawerContent className="p-0">
            <DrawerHeader className="px-5 pt-4 pb-2">
              <DrawerTitle className="text-base font-bold flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <span>Complete Purchase</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Record actual cost and choose whether you paid cash or took it on credit
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-8">
              {checkoutBody}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={Boolean(checkoutItem)} onOpenChange={(open) => !open && setCheckoutItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <span>Complete Purchase</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Record actual cost and choose whether you paid cash or took it on credit
              </DialogDescription>
            </DialogHeader>
            <div className="py-1">{checkoutBody}</div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shadcn Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this wishlist item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This item will be removed from your planned purchases wishlist.
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
