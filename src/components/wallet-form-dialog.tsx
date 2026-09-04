import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
import {
  type WalletKind,
  getDefaultWalletId,
  setDefaultWalletId,
} from "@/lib/storage"
import { cacheManualQuote, fetchQuote } from "@/lib/quotes"
import { useUiStore } from "@/stores/ui-store"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { toast } from "sonner"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Wallet, PiggyBank, TrendingUp, Sparkles, Trash2 } from "lucide-react"

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Name required"),
    kind: z.enum(["spending", "savings", "investment"]),
    balance: z.string(),
    symbol: z.string().optional(),
    shares: z.string().optional(),
    lastPrice: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "investment") {
      const bal = Number(v.balance)
      if (!Number.isFinite(bal) || bal < 0) {
        ctx.addIssue({ code: "custom", message: "Enter a valid balance", path: ["balance"] })
      }
    } else {
      if (!v.symbol?.trim()) {
        ctx.addIssue({ code: "custom", message: "Ticker required", path: ["symbol"] })
      }
      const shares = Number(v.shares)
      if (!Number.isFinite(shares) || shares < 0) {
        ctx.addIssue({ code: "custom", message: "Enter shares", path: ["shares"] })
      }
    }
  })

const ACCOUNT_PRESETS: Record<WalletKind, string[]> = {
  spending: ["Main Bank", "Cash Wallet", "OPay", "Kuda", "Moniepoint", "GTBank"],
  savings: ["Emergency Fund", "Target Savings", "SafeLock", "PiggyVest", "Car Fund"],
  investment: ["Risevest", "Bamboo", "Trove", "Crypto Wallet", "Binance"],
}

const TICKER_PRESETS = ["AAPL", "TSLA", "NVDA", "BTC-USD", "ETH-USD"]

type Props = {
  onSaved?: () => void
}

export function WalletFormDialog({ onSaved }: Props) {
  const isMobile = useIsMobile()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { wallets } = usePosQuery()
  const mutations = usePosMutations()
  const { walletFormOpen, editingWalletId, closeWalletForm } = useUiStore()
  const [fetching, setFetching] = useState(false)
  const [name, setName] = useState("")
  const [kind, setKind] = useState<WalletKind>("spending")
  const [balance, setBalance] = useState("0")
  const [symbol, setSymbol] = useState("")
  const [shares, setShares] = useState("")
  const [lastPrice, setLastPrice] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (!walletFormOpen) return
    const currentDefaultId = getDefaultWalletId(wallets)
    if (editingWalletId) {
      const w = wallets.find((x) => x.id === editingWalletId)
      if (w) {
        setName(w.name)
        setKind(w.kind)
        setBalance(String(w.balance))
        setSymbol(w.symbol || "")
        setShares(w.shares != null ? String(w.shares) : "")
        setLastPrice(w.lastPrice != null ? String(w.lastPrice) : "")
        setIsDefault(w.id === currentDefaultId)
      }
    } else {
      setName("")
      setKind("spending")
      setBalance("0")
      setSymbol("")
      setShares("")
      setLastPrice("")
      setIsDefault(wallets.length === 0)
    }
    setError("")
  }, [walletFormOpen, editingWalletId, wallets])

  const save = async () => {
    setError("")
    const parsed = formSchema.safeParse({
      name,
      kind,
      balance,
      symbol,
      shares,
      lastPrice,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid input")
      return
    }

    const v = parsed.data
    const sym = v.symbol?.trim().toUpperCase()
    let price = v.lastPrice ? Number(v.lastPrice) : undefined
    let cur = "USD"

    if (v.kind === "investment" && sym && price == null) {
      setFetching(true)
      try {
        const quote = await fetchQuote(sym)
        price = quote.price
        cur = quote.currency
        cacheManualQuote(sym, quote.price, quote.currency)
      } catch {
        setError("Could not fetch price. Enter last price manually, then save.")
        setFetching(false)
        return
      }
      setFetching(false)
    }

    if (v.kind === "investment" && sym && price != null) {
      cacheManualQuote(sym, price, cur)
    }

    const targetWalletId = editingWalletId || `w-${Date.now()}`

    try {
      await mutations.addWallet.mutateAsync({
        id: targetWalletId,
        name: v.name,
        kind: v.kind,
        balance: v.kind === "investment" ? Number(v.shares || 0) * (price || 1) : Number(v.balance),
        symbol: sym,
        shares: v.kind === "investment" ? Number(v.shares) : undefined,
        lastPrice: v.kind === "investment" ? price : undefined,
        lastPriceCurrency: cur,
      })

      if (isDefault) {
        setDefaultWalletId(targetWalletId)
      } else if (editingWalletId === getDefaultWalletId(wallets)) {
        const fallback = wallets.find((w) => w.id !== editingWalletId)?.id || "w-cash"
        setDefaultWalletId(fallback)
      }

      toast.success("Account saved successfully")
      closeWalletForm()
      onSaved?.()
    } catch (err: any) {
      setError(err.message || "Failed to save wallet")
    }
  }

  const remove = async () => {
    if (!editingWalletId) return
    try {
      await mutations.deleteWallet.mutateAsync(editingWalletId)
      toast.success("Account removed")
      closeWalletForm()
      onSaved?.()
    } catch (err: any) {
      setError(err.message || "Failed to delete wallet")
    }
  }

  const body = (
    <div className="space-y-4">
      {/* 1. Account Type Selector - 3 Clean Cards */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Account Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              kind: "spending" as const,
              label: "Spending",
              desc: "Checking & Cash",
              icon: Wallet,
            },
            {
              kind: "savings" as const,
              label: "Savings",
              desc: "Emergency & Goals",
              icon: PiggyBank,
            },
            {
              kind: "investment" as const,
              label: "Investment",
              desc: "Stocks & Crypto",
              icon: TrendingUp,
            },
          ].map((item) => {
            const Icon = item.icon
            const isSelected = kind === item.kind
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => setKind(item.kind)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className={`size-4 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold leading-tight">{item.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Account Name & 1-Tap Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Account Name</label>
          {name && (
            <button
              type="button"
              onClick={() => setName("")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            kind === "spending"
              ? "e.g. Main Bank, Cash Wallet, OPay"
              : kind === "savings"
              ? "e.g. Emergency Fund, SafeLock"
              : "e.g. Risevest, Bamboo, Binance"
          }
          className="h-10 rounded-lg text-sm font-medium"
        />

        {/* 1-Tap Quick Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="size-3 text-muted-foreground" />
            Quick:
          </span>
          {ACCOUNT_PRESETS[kind].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setName(preset)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                name === preset
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Balance or Investment Details */}
      {kind !== "investment" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Current Balance</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-base font-bold text-muted-foreground pointer-events-none">
              {currency}
            </span>
            <FormattedNumberInput
              value={balance}
              onValueChange={setBalance}
              placeholder="0.00"
              className="h-11 pl-8 text-base font-bold rounded-lg tabular-nums"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Ticker Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL, NVDA, BTC-USD"
              className="h-10 rounded-lg text-sm font-semibold uppercase tracking-wider"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TICKER_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSymbol(t)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                    symbol === t
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Shares / Units</label>
              <FormattedNumberInput
                value={shares}
                onValueChange={setShares}
                placeholder="0"
                className="h-10 rounded-lg text-sm font-medium tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Last Price (USD)</label>
              <FormattedNumberInput
                value={lastPrice}
                onValueChange={setLastPrice}
                placeholder="Auto-fetch"
                className="h-10 rounded-lg text-sm font-medium tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Default Wallet Toggle - Modern Switch Surface */}
      <div
        onClick={() => setIsDefault(!isDefault)}
        className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
      >
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">Set as Primary Account</p>
          <p className="text-[11px] text-muted-foreground">Auto-selected for new transactions and quick capture</p>
        </div>
        <div
          role="switch"
          aria-checked={isDefault}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
            isDefault ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
              isDefault ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )

  const footer = (
    <div className="flex w-full items-center justify-between gap-2 pt-2">
      {editingWalletId ? (
        <Button
          type="button"
          variant="destructive"
          size="default"
          onClick={() => setDeleteConfirmOpen(true)}
          className="h-11 rounded-xl px-4 text-xs font-semibold"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          <span>Delete</span>
        </Button>
      ) : <div />}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={closeWalletForm}
          className="h-11 rounded-xl px-4 text-xs font-medium"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="default"
          onClick={save}
          disabled={fetching}
          className="h-11 rounded-xl px-5 text-xs font-semibold shadow-xs"
        >
          {fetching ? "Fetching Price…" : editingWalletId ? "Save Changes" : "Create Account"}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {isMobile ? (
        <Drawer open={walletFormOpen} onOpenChange={(o) => !o && closeWalletForm()}>
          <DrawerContent className="p-0">
            <DrawerHeader className="px-5 pt-4 pb-2">
              <DrawerTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <span>{editingWalletId ? "Edit Account" : "Add Account"}</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                {editingWalletId
                  ? "Update your account details and current balance"
                  : "Set up a new bank, cash, savings, or investment account"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-6">
              {body}
            </div>
            <DrawerFooter className="p-4 border-t border-border/40">{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={walletFormOpen} onOpenChange={(o) => !o && closeWalletForm()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <span>{editingWalletId ? "Edit Account" : "Add Account"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingWalletId
                  ? "Update your account details and current balance"
                  : "Set up a new bank, cash, savings, or investment account"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-1">{body}</div>
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Any associated transactions will remain intact, but the account balance will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90 font-semibold">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
