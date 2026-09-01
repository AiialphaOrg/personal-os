import { useParams, useNavigate } from "react-router"
import { useHeader } from "@/hooks/use-header"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { useUiStore } from "@/stores/ui-store"
import {
  Wallet,
  Pencil,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Copy,
  Check,
  Receipt,
  ChevronLeft,
} from "lucide-react"

import { useAppSelector } from "@/store/hooks"
import { useState } from "react"
import { toast } from "sonner"

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const keyboardInset = useKeyboardInset()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const openWalletForm = useUiStore((s) => s.openWalletForm)
  const [copied, setCopied] = useState(false)

  const wallets = useAppSelector((state) => state.data.wallets)
  const timeline = useAppSelector((state) => state.data.transactions)

  const wallet = wallets.find((w) => w.id === id)

  useHeader({
    title: wallet ? wallet.name : "Wallet Detail",
  })

  if (!wallet) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Wallet not found.</p>
        <button
          type="button"
          onClick={() => navigate("/money")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Back to Finances
        </button>
      </div>
    )
  }

  const copyWalletId = () => {
    navigator.clipboard.writeText(wallet.id)
    setCopied(true)
    toast.success("Wallet ID copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const wName = wallet.name.toLowerCase()
  const wId = wallet.id
  const walletTransactions = timeline.filter(
    (t) =>
      t.type !== "task" &&
      (t.wallet === wId ||
        (t as any).walletId === wId ||
        (t.wallet && t.wallet.toLowerCase() === wName) ||
        (t.fromWallet && t.fromWallet.toLowerCase() === wName) ||
        (t.toWallet && t.toWallet.toLowerCase() === wName) ||
        (t.detail && t.detail.toLowerCase().includes(wName)))
  )


  return (
    <div
      className="mx-auto max-w-xl space-y-4 pb-12"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      {/* Top Account Card (Inspired by Kuda reference) */}
      <section className="rounded-lg border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-5 sm:p-6 text-center space-y-3 shadow-xs">
        {/* Account Identifier Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wallet className="size-3.5" />
            <span className="capitalize">{wallet.kind} Account</span>
            <span>•</span>
            <span className="font-mono text-foreground font-semibold">{wallet.id}</span>
          </span>
          <button
            type="button"
            onClick={copyWalletId}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Wallet ID"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Large Balance Display */}
        <div>
          <h1 className="text-[2.5rem] sm:text-5xl font-bold tracking-tight text-foreground tabular-nums leading-tight">
            {currency}{wallet.balance.toLocaleString()}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {wallet.name} · Real-time single source of truth
          </p>
        </div>

        {/* Top edit trigger */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => openWalletForm(wallet.id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-muted/80 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" />
            Edit Wallet Details
          </button>
        </div>
      </section>

      {/* Quick Access Action Shortcuts (Like Kuda reference) */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-tight text-foreground px-0.5">Quick Access</h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/capture/transfer?fromWallet=${wallet.name}`)}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/80 bg-card dark:bg-[#181720] p-3 sm:p-3.5 transition-all hover:bg-muted/40 dark:hover:bg-[#201e2b] active:scale-95 shadow-2xs"
          >
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
              <ArrowRightLeft className="size-4 sm:size-5 stroke-[2px]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground dark:text-white truncate w-full text-center">Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/capture/income?walletId=${wallet.id}`)}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/80 bg-card dark:bg-[#181720] p-3 sm:p-3.5 transition-all hover:bg-muted/40 dark:hover:bg-[#201e2b] active:scale-95 shadow-2xs"
          >
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-105">
              <ArrowDownLeft className="size-4 sm:size-5 stroke-[2px]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground dark:text-white truncate w-full text-center">Add Money</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/capture/expense?walletId=${wallet.id}`)}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/80 bg-card dark:bg-[#181720] p-3 sm:p-3.5 transition-all hover:bg-muted/40 dark:hover:bg-[#201e2b] active:scale-95 shadow-2xs"
          >
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400 transition-transform group-hover:scale-105">
              <ArrowUpRight className="size-4 sm:size-5 stroke-[2px]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground dark:text-white truncate w-full text-center">Expense</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/capture/bill?walletId=${wallet.id}`)}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/80 bg-card dark:bg-[#181720] p-3 sm:p-3.5 transition-all hover:bg-muted/40 dark:hover:bg-[#201e2b] active:scale-95 shadow-2xs"
          >
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-105">
              <Receipt className="size-4 sm:size-5 stroke-[2px]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground dark:text-white truncate w-full text-center">Pay Bill</span>
          </button>
        </div>
      </section>

      {/* Transaction Activity Section */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
            <History className="size-3.5 text-muted-foreground" />
            Wallet Activity
          </h3>
          <span className="text-xs text-muted-foreground">{walletTransactions.length} transactions</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-2xs">

          {walletTransactions.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No transactions logged for {wallet.name} yet.
            </div>
          ) : (
            walletTransactions.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  idx < walletTransactions.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.category || item.type} · {(item as any).date || item.time || "Today"}
                  </p>

                </div>
                {item.amount !== null && (
                  <p
                    className={`text-xs font-bold tabular-nums ${
                      item.type === "income" || (item.toWallet && item.toWallet.toLowerCase() === wName)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {item.type === "income" || (item.toWallet && item.toWallet.toLowerCase() === wName)
                      ? "+"
                      : "-"}
                    {currency}
                    {(item.amount || 0).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

