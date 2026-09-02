import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
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

type Props = {
  onSaved?: () => void
}

export function WalletFormDialog({ onSaved }: Props) {
  const isMobile = useIsMobile()
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
    let currency = "USD"

    if (v.kind === "investment" && sym && price == null) {
      setFetching(true)
      try {
        const quote = await fetchQuote(sym)
        price = quote.price
        currency = quote.currency
        cacheManualQuote(sym, quote.price, quote.currency)
      } catch {
        setError("Could not fetch price. Enter last price manually, then save.")
        setFetching(false)
        return
      }
      setFetching(false)
    }

    if (v.kind === "investment" && sym && price != null) {
      cacheManualQuote(sym, price, currency)
    }

    const targetWalletId = editingWalletId || `w-${Date.now()}`

    try {
      await mutations.addWallet.mutateAsync({
        id: targetWalletId,
        name: v.name,
        kind: v.kind,
        balance: v.kind === "investment" ? (Number(v.shares || 0) * (price || 1)) : Number(v.balance),
        symbol: sym,
        shares: v.kind === "investment" ? Number(v.shares) : undefined,
        lastPrice: v.kind === "investment" ? price : undefined,
        lastPriceCurrency: currency,
      })

      if (isDefault) {
        setDefaultWalletId(targetWalletId)
      } else if (editingWalletId === getDefaultWalletId(wallets)) {
        const fallback = wallets.find((w) => w.id !== editingWalletId)?.id || "w-cash"
        setDefaultWalletId(fallback)
      }

      toast.success("Wallet saved online")
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
      toast.success("Wallet removed")
      closeWalletForm()
      onSaved?.()
    } catch (err: any) {
      setError(err.message || "Failed to delete wallet")
    }
  }

  const body = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Account Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Bank, Cash, Savings…"
          className="h-11 rounded-lg text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Account Type</label>
        <div className="flex gap-2">
          {(["spending", "savings", "investment"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              variant={kind === k ? "default" : "outline"}
              size="sm"
              className="capitalize flex-1 h-10 rounded-lg text-xs font-semibold"
              onClick={() => setKind(k)}
            >
              {k}
            </Button>
          ))}
        </div>
      </div>
      {kind !== "investment" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Current Balance</label>
          <FormattedNumberInput
            value={balance}
            onValueChange={setBalance}
            placeholder="0"
            className="h-11 rounded-lg text-sm font-semibold"
          />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Ticker Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL, NVDA, BTC-USD…"
              className="h-11 rounded-lg text-sm uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Shares / Units</label>
            <FormattedNumberInput
              value={shares}
              onValueChange={setShares}
              placeholder="0"
              className="h-11 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Last Price (USD)</label>
            <FormattedNumberInput
              value={lastPrice}
              onValueChange={setLastPrice}
              placeholder="Optional if auto-fetch works"
              className="h-11 rounded-lg text-sm"
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-3.5 bg-muted/20">
        <div>
          <p className="text-xs font-semibold text-foreground">Default Wallet</p>
          <p className="text-[11px] text-muted-foreground">Auto-selected for new transactions</p>
        </div>
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="size-4.5 rounded accent-primary cursor-pointer"
        />
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
          Delete
        </Button>
      ) : <div />}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={closeWalletForm}
          className="h-11 rounded-xl px-4 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="default"
          onClick={save}
          disabled={fetching}
          className="h-11 rounded-xl px-5 text-xs font-semibold"
        >
          {fetching ? "Fetching Price…" : "Save Account"}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {isMobile ? (
        <Drawer open={walletFormOpen} onOpenChange={(o) => !o && closeWalletForm()}>
          <DrawerContent className="p-0">
            <DrawerHeader>
              <DrawerTitle>
                {editingWalletId ? "Edit Account" : "Add Account"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-6">
              {body}
            </div>
            <DrawerFooter className="p-4">{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={walletFormOpen} onOpenChange={(o) => !o && closeWalletForm()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingWalletId ? "Edit Account" : "Add Account"}
              </DialogTitle>
            </DialogHeader>
            {body}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Any associated transactions will remain but the wallet balance will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
