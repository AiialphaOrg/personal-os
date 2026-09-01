import { useState } from "react"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { type PlannedPurchaseItem, WISHLIST_CATEGORIES } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  CheckSquare,
  ShoppingCart,
  CreditCard,
  Banknote,
} from "lucide-react"


export function PlannedPurchasesChecklist() {
  const isMobile = useIsMobile()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { plannedPurchases, wallets } = usePosQuery()
  const mutations = usePosMutations()

  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PlannedPurchaseItem | null>(null)
  
  // New / Edit Form State
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<"once" | "weekly" | "monthly">("once")
  const [category, setCategory] = useState("goods")
  const [error, setError] = useState("")

  // Checkout Dialog State
  const [checkoutItem, setCheckoutItem] = useState<PlannedPurchaseItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [actualAmount, setActualAmount] = useState("")
  const [walletId, setWalletId] = useState(wallets[0]?.id || "w-cash")
  const [person, setPerson] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [checkoutError, setCheckoutError] = useState("")

  const plannedList = plannedPurchases.filter((p) => p.status !== "purchased")
  const purchasedList = plannedPurchases.filter((p) => p.status === "purchased")

  const totalPlannedAmt = plannedPurchases
    .filter((p) => p.status !== "purchased")
    .reduce((sum, p) => sum + p.estimatedAmount, 0)



  const openAdd = () => {
    setEditingItem(null)
    setTitle("")
    setAmount("")
    setFrequency("once")
    setCategory("goods")
    setError("")
    setAddOpen(true)
  }

  const openEdit = (item: PlannedPurchaseItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setAmount(String(item.estimatedAmount))
    setFrequency(item.frequency)
    setCategory(item.category || "goods")
    setError("")
    setAddOpen(true)
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
      setError("Please enter a valid estimated amount")
      return
    }

    try {
      await mutations.addPlannedPurchase.mutateAsync({
        id: editingItem?.id,
        title: title.trim(),
        estimatedAmount: amt,
        frequency,
        category,
      })
      toast.success("Wishlist item saved online")
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

  const handleDelete = async (id: string) => {
    if (confirm("Delete this planned purchase?")) {
      try {
        await mutations.deletePlannedPurchase.mutateAsync(id)
        toast.success("Item removed from wishlist")
      } catch (err: any) {
        toast.error(err.message || "Failed to delete item")
      }
    }
  }

  const formBody = (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Item Name / Wish</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. New Running Shoes, Headphones, Rice Bag"
          className="h-9 rounded-lg"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Est. Budget ({currency})</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="h-9 rounded-lg tabular-nums"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Plan Frequency</label>
          <select
            value={frequency}
            onChange={(e: any) => setFrequency(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="once">One-time purchase</option>
            <option value="weekly">Weekly restock</option>
            <option value="monthly">Monthly purchase</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {WISHLIST_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold capitalize transition-all ${
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
        <Button type="submit" className="w-full h-10 rounded-lg text-xs font-semibold">
          {editingItem ? "Save Changes" : "Add to Wishlist"}
        </Button>
      </div>
    </form>
  )

  const checkoutBody = checkoutItem && (
    <form onSubmit={handleCheckoutSubmit} className="space-y-4">

      <div className="rounded-lg bg-muted/50 p-3 space-y-1 border border-border/40">
        <p className="text-xs font-semibold text-foreground">{checkoutItem?.title}</p>
        <p className="text-[11px] text-muted-foreground">
          Est. Budget: {currency}{checkoutItem?.estimatedAmount.toLocaleString()} • Category: {checkoutItem?.category}
        </p>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">How are you paying for this?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all text-left ${
              paymentMethod === "cash"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Banknote className="size-4 shrink-0" />
            <div>
              <p>Paid Now</p>
              <p className="text-[10px] font-normal text-muted-foreground">Logged as Expense</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("credit")}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all text-left ${
              paymentMethod === "credit"
                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-2xs"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="size-4 shrink-0" />
            <div>
              <p>Pay Later</p>
              <p className="text-[10px] font-normal text-muted-foreground">Logged as Debt (I Owe)</p>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Actual Amount Paid/Owed ({currency})</label>
        <Input
          type="number"
          value={actualAmount}
          onChange={(e) => setActualAmount(e.target.value)}
          placeholder="0"
          className="h-9 rounded-lg tabular-nums"
          required
        />
      </div>

      {paymentMethod === "cash" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Paid From Wallet</label>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({currency}{w.balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Person / Store Owed (Creditor)</label>
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="e.g. John, Mall Store, Vendor"
              className="h-9 rounded-lg"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Due Date (Optional)</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 rounded-lg"
            />
          </div>
        </div>
      )}

      {checkoutError && <p className="text-xs font-medium text-destructive">{checkoutError}</p>}

      <div className="pt-2">
        <Button type="submit" className="w-full h-10 rounded-lg text-xs font-semibold">
          {paymentMethod === "cash" ? "Confirm Purchase & Log Expense" : "Confirm Purchase & Log Payable"}
        </Button>
      </div>
    </form>
  )

  return (
    <section className="space-y-3">
      {/* Header Stat & Action */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground tracking-tight">Wishlist</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total planned: <strong className="text-foreground">{currency}{totalPlannedAmt.toLocaleString()}</strong> ({plannedList.length} items left)
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-2xs"
        >
          <Plus className="size-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Checklist Items */}


      {/* Checklist Items */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
        {plannedList.length === 0 && purchasedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">No planned purchases in your list</p>
            <p className="text-[11px]">Add items you plan to buy weekly, monthly, or once.</p>
          </div>
        ) : (
          <>
            {/* Planned Items */}
            {plannedList.map((p) => (
              <div key={p.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                {/* Top Row: Title, Badges & Estimated Price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{p.title}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                        {p.category}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                        {p.frequency === "once" ? "One-time" : p.frequency} plan
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums text-foreground block">
                      {currency}{p.estimatedAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Estimated</span>
                  </div>
                </div>

                {/* Bottom Row: Clear Action Buttons Underneath */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCheckout(p)}
                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
                  >
                    <ShoppingCart className="size-3.5 mr-1.5" />
                    <span>Buy / Checkout</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="size-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      className="h-8 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Purchased Items section */}
            {purchasedList.length > 0 && (
              <div className="bg-muted/10 divide-y divide-border/40">
                <div className="px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Purchased Items ({purchasedList.length})
                </div>
                {purchasedList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="line-through text-xs font-semibold text-foreground truncate">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">Bought {p.purchasedAt || "recently"}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {currency}{p.estimatedAmount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* Add / Edit Form Modal */}
      {isMobile ? (
        <Drawer open={addOpen} onOpenChange={setAddOpen}>
          <DrawerContent className="p-4 space-y-4">
            <DrawerHeader className="p-0">
              <DrawerTitle className="text-sm font-bold">
                {editingItem ? "Edit Planned Item" : "New Planned Item"}
              </DrawerTitle>
            </DrawerHeader>
            {formBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                {editingItem ? "Edit Planned Item" : "New Planned Item"}
              </DialogTitle>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      )}

      {/* Checkout Dialog */}
      {isMobile ? (
        <Drawer open={Boolean(checkoutItem)} onOpenChange={(open) => !open && setCheckoutItem(null)}>
          <DrawerContent className="p-4 space-y-4">
            <DrawerHeader className="p-0">
              <DrawerTitle className="text-sm font-bold">Complete Purchase</DrawerTitle>
            </DrawerHeader>
            {checkoutBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={Boolean(checkoutItem)} onOpenChange={(open) => !open && setCheckoutItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Complete Purchase</DialogTitle>
            </DialogHeader>
            {checkoutBody}
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
