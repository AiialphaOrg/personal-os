import { useCallback, useState } from "react"
import { useHeader } from "@/hooks/use-header"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
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
import { useIsMobile } from "@/hooks/use-mobile"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { useVoiceCapture } from "@/hooks/use-voice-capture"
import { toast } from "sonner"
import type { CaptureIntent } from "@/lib/ai/on-device"
import { applyCaptureSubmit } from "@/lib/capture-apply"

import {
  availableBalance,
  investmentBalance,
  netWorth,
  openDebts,
  savingsBalance,
  getDefaultWalletId,
  type CaptureType,
  type DebtItem,
} from "@/lib/storage"


import { useInvestmentQuotes } from "@/hooks/use-quotes"
import { useUiStore } from "@/stores/ui-store"
import {
  Wallet,
  PiggyBank,
  HandCoins,
  Plus,
  ArrowRightLeft,
  LineChart,
  ChevronRight,
  ChevronDown,
} from "lucide-react"

import { useNavigate } from "react-router"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"

export function MoneyPage() {
  useHeader({ title: "Finances" })
  const navigate = useNavigate()
  const keyboardInset = useKeyboardInset()
  const isMobile = useIsMobile()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const openWalletForm = useUiStore((s) => s.openWalletForm)
  useInvestmentQuotes(true)
  const mutations = usePosMutations()

  const { wallets, debts } = usePosQuery()

  const [activeWallet] = useState(() => wallets[0]?.id || "w-cash")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formType, setFormType] = useState<CaptureType>("expense")
  const [presets, setPresets] = useState<
    { title?: string; amount?: string; fromWallet?: string; toWallet?: string; person?: string; walletId?: string } | undefined
  >()

  const [settleOpen, setSettleOpen] = useState(false)
  const [settleDebtItem, setSettleDebtItem] = useState<DebtItem | null>(null)
  const [settleAmount, setSettleAmount] = useState("")
  const [settleWallet, setSettleWallet] = useState("w-cash")
  const [settleError, setSettleError] = useState("")

  const [mainTab, setMainTab] = useState<"wallets" | "debts">("wallets")
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)

  const [debtFilter, setDebtFilter] = useState<"all" | "payables" | "receivables">("all")

  const available = availableBalance(wallets)
  const savings = savingsBalance(wallets)
  const invested = investmentBalance(wallets)
  const worth = netWorth(wallets, debts)
  const youOwe = openDebts(debts).filter((d) => d.direction === "i_owe")
  const owedToYou = openDebts(debts).filter((d) => d.direction === "owed_to_me")

  const filteredWallets = wallets


  const filteredDebts =
    debtFilter === "payables"
      ? youOwe
      : debtFilter === "receivables"
      ? owedToYou
      : openDebts(debts)




  const openCapture = useCallback(
    (
      type: CaptureType,
      pre?: { title?: string; amount?: string; fromWallet?: string; toWallet?: string; person?: string; walletId?: string }
    ) => {
      setFormType(type)
      setPresets(pre)
      setIsFormOpen(true)
    },
    []
  )

  const onVoiceCapture = useCallback(
    (intent: CaptureIntent) => {
      if (intent.type === "unknown") return
      openCapture(intent.type, {
        amount: intent.amount != null ? String(intent.amount) : undefined,
        title: intent.title || intent.person || undefined,
        person: intent.person || undefined,
        walletId: activeWallet,
      })
    },
    [openCapture, activeWallet]
  )

  const { listening, hint, aiProgress } = useVoiceCapture({
    onCapture: onVoiceCapture,
  })

  const applyCapture = (data: CaptureSubmit) => {
    const res = applyCaptureSubmit(data)
    if (res.ok) {
      toast.success("Saved")
    } else {
      toast.error(res.error)
    }
  }

  const openSettle = (d: DebtItem) => {
    setSettleDebtItem(d)
    setSettleAmount(String(d.remaining))
    setSettleWallet(activeWallet || "cash")
    setSettleError("")
    setSettleOpen(true)
  }

  const confirmSettle = async () => {

    if (!settleDebtItem) return
    const amt = Number(settleAmount)
    try {
      await mutations.settleDebt.mutateAsync({
        id: settleDebtItem.id,
        amount: amt,
        walletId: settleWallet,
      })
      setSettleOpen(false)
      toast.success(settleDebtItem.direction === "i_owe" ? "Payment logged online" : "Receipt logged online")
    } catch (err: any) {
      setSettleError(err.message || "Failed to settle debt")
    }
  }



  const debtRow = (d: DebtItem) => (
    <div
      key={d.id}
      onClick={() => navigate(`/debts/${d.id}`)}
      className="flex items-center justify-between px-3.5 py-3 rounded-lg border border-border bg-card/70 hover:bg-card transition-colors mb-2 shadow-2xs cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
          <HandCoins className="size-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{d.person}</p>
          <p className="truncate text-xs text-muted-foreground capitalize mt-0.5">
            {d.kind} {d.dueDate ? `· due ${d.dueDate}` : ""} {d.status === "partial" ? "· partial" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div className="text-right mr-1">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {currency}{d.remaining.toLocaleString()}
          </p>
          {d.remaining < d.amount && (
            <p className="text-[10px] text-muted-foreground">
              of {currency}{d.amount.toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openSettle(d)
          }}
          className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          {d.direction === "i_owe" ? "Pay" : "Receive"}
        </button>
      </div>
    </div>
  )



  const settleForm = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {settleDebtItem?.direction === "i_owe" ? "Pay" : "Receive from"}{" "}
        <span className="font-medium text-foreground">{settleDebtItem?.person}</span>
        {" · remaining "}
        {currency}
        {(settleDebtItem?.remaining || 0).toLocaleString()}
      </p>
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          inputMode="decimal"
          value={settleAmount}
          onChange={(e) => setSettleAmount(e.target.value)}
          className="text-lg font-semibold tabular-nums"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Wallet</label>
        <div className="flex gap-2">
          {wallets
            .filter((w) => w.kind !== "investment")
            .map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSettleWallet(w.id)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                settleWallet === w.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>
      {settleError && <p className="text-sm text-destructive">{settleError}</p>}
      {isMobile ? (
        <DrawerFooter className="px-0">
          <Button className="w-full" onClick={confirmSettle}>
            Confirm
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setSettleOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => setSettleOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmSettle}>Confirm</Button>
        </DialogFooter>
      )}
    </div>
  )


  return (
    <div
      className="space-y-4 pb-10"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      {(listening || hint || aiProgress) && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
          <p className="font-semibold">{listening ? "Listening..." : "Voice Capture"}</p>
          <p className="mt-1 text-muted-foreground">{hint || aiProgress || "Say e.g. Paid 5000 from cash for groceries"}</p>
        </div>
      )}

      {/* Sleek Compact Net Worth & Wealth Stat */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Net Worth
            </span>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums mt-0.5">
              {currency}{worth.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => openCapture("transfer")}
              className="flex items-center gap-1 rounded-lg bg-muted border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all shadow-2xs"
            >
              <ArrowRightLeft className="size-3.5 text-primary" />
              <span>Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => openWalletForm()}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>New Wallet</span>
            </button>
          </div>
        </div>

        {/* Collapsible Accordion Breakdown */}
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setIsBreakdownOpen((open) => !open)}
            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group py-1"
          >
            <span>Wealth Breakdown</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-normal text-muted-foreground">
                {isBreakdownOpen ? "Hide" : "Show"}
              </span>
              <ChevronDown
                className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                  isBreakdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {/* Collapsed/Expanded Accordion Content: Single-line row with label on left and amount next to it on right */}
          {isBreakdownOpen && (
            <div className="pt-2 pb-0.5 space-y-2 animate-in fade-in-50 divide-y divide-border/40">
              <div className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                <span className="text-muted-foreground font-medium">Available Cash & Spending</span>
                <span className="font-bold tabular-nums text-foreground">
                  {currency}{available.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5">
                <span className="text-muted-foreground font-medium">Emergency & Savings</span>
                <span className="font-bold tabular-nums text-foreground">
                  {currency}{savings.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5">
                <span className="text-muted-foreground font-medium">Investments & Portfolios</span>
                <span className="font-bold tabular-nums text-foreground">
                  {currency}{invested.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5">
                <span className="text-muted-foreground font-medium">Receivables (Owed to You)</span>
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{currency}{owedToYou.reduce((sum, d) => sum + (d.remaining || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5">
                <span className="text-muted-foreground font-medium">Payables (You Owe)</span>
                <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                  -{currency}{youOwe.reduce((sum, d) => sum + (d.remaining || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>






      {/* Asana-style Underline Tab Bar */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 px-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setMainTab("wallets")}
            className={`flex items-center gap-2 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              mainTab === "wallets"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Wallet className="size-3.5" />
            <span>Accounts & Wallets</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                mainTab === "wallets"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {wallets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab("debts")}
            className={`flex items-center gap-2 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              mainTab === "debts"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <HandCoins className="size-3.5" />
            <span>Debts & Borrowing</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                mainTab === "debts"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {openDebts(debts).length}
            </span>
          </button>
        </nav>
      </div>


      {/* TAB 1: ACCOUNTS & WALLETS */}
      {mainTab === "wallets" && (
        <section className="space-y-3">
          {/* Compact Sleek Wallet Rows */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">

            {filteredWallets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No accounts found in this category.
              </div>
            ) : (
              filteredWallets.map((w) => (
                <div
                  key={w.id}
                  onClick={() => navigate(`/wallet/${w.id}`)}
                  className="flex items-center justify-between px-3.5 py-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground group-hover:scale-105 transition-transform shrink-0">
                      {w.kind === "savings" ? (
                        <PiggyBank className="size-4 text-primary" />
                      ) : w.kind === "investment" ? (
                        <LineChart className="size-4 text-emerald-500" />
                      ) : (
                        <Wallet className="size-4 text-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{w.name}</p>
                        {w.id === getDefaultWalletId(wallets) && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize font-medium">{w.kind} account</span>
                    </div>

                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {currency}{w.balance.toLocaleString()}
                    </p>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 2: DEBTS & BORROWING */}
      {mainTab === "debts" && (
        <section className="space-y-3">
          {/* Filter Dropdown & Action Button */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xs">
              <select
                value={debtFilter}
                onChange={(e: any) => setDebtFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer pr-8 shadow-2xs hover:bg-muted/40 transition-colors"
              >
                <option value="all">All Debts ({openDebts(debts).length})</option>
                <option value="payables">Payables - I Owe ({youOwe.length})</option>
                <option value="receivables">Receivables - Owed to Me ({owedToYou.length})</option>
              </select>
              <ChevronDown className="size-3.5 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => openCapture(debtFilter === "receivables" ? "owed_to_me" : "i_owe")}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>Add Debt</span>
            </button>
          </div>


          <div className="space-y-2 pt-0.5">
            {filteredDebts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-lg border border-dashed border-border">
                No debts or payables logged.
              </div>
            ) : (
              filteredDebts.map(debtRow)
            )}
          </div>
        </section>
      )}

      <CaptureSheet

        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        type={formType}
        wallets={wallets.filter((w) => w.kind !== "investment")}
        currency={currency}
        defaultWalletId={activeWallet}
        presets={presets}
        onSubmit={applyCapture}
      />

      {/* Settle Debt Modal / Drawer */}
      {isMobile ? (
        <Drawer open={settleOpen} onOpenChange={setSettleOpen}>
          <DrawerContent className="p-0">
            <DrawerHeader>
              <DrawerTitle>Settle Debt</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
              {settleForm}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Settle debt</DialogTitle>
            </DialogHeader>
            {settleForm}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

