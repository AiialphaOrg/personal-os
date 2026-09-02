import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router"
import { useHeader } from "@/hooks/use-header"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { applyCaptureSubmit } from "@/lib/capture-apply"
import { toast } from "sonner"
import {
  Edit3,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  Copy,
  Check,
  HandCoins,
  CreditCard,
  FileText,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function DebtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { debts, wallets } = usePosQuery()
  const mutations = usePosMutations()


  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [settleAmount, setSettleAmount] = useState("")
  const [settleWallet, setSettleWallet] = useState("")
  const [isSettling, setIsSettling] = useState(false)

  const debt = useMemo(() => {
    return debts.find((d) => d.id === id)
  }, [debts, id])

  const handleDelete = () => {
    if (!debt) return
    if (confirm("Are you sure you want to delete this record?")) {
      mutations.deleteDebt.mutate(debt.id, {
        onSuccess: () => {
          toast.success("Record deleted")
          navigate("/money")
        },
        onError: () => {
          toast.error("Failed to delete record")
        },
      })
    }
  }

  useHeader({
    title: debt ? (debt.direction === "i_owe" ? "Payable Details" : "Receivable Details") : "Debt Details",
    rightNode: debt ? (
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="h-8 rounded-lg text-xs font-semibold gap-1 px-2.5 border-border bg-card shadow-2xs"
        >
          <Edit3 className="size-3.5 text-primary" />
          <span>Edit</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDelete}
          className="h-8 rounded-lg text-xs font-semibold gap-1 px-2.5 border-border bg-card text-red-500 hover:text-red-600 hover:bg-red-500/10 shadow-2xs"
        >
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </Button>
      </div>
    ) : undefined,
  })

  if (!debt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-4">
        <p className="text-sm font-semibold text-foreground">Record not found</p>
        <p className="text-xs text-muted-foreground">The debt or receivable may have been deleted or does not exist.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/money")}
          className="h-9 text-xs rounded-lg mt-2"
        >
          Back to Finances
        </Button>
      </div>
    )
  }

  const isIOwe = debt.direction === "i_owe"
  const isSettled = debt.status === "paid" || debt.remaining <= 0
  const paidAmount = Math.max(0, debt.amount - debt.remaining)

  const progressPct = debt.amount > 0 ? Math.min(100, Math.round((paidAmount / debt.amount) * 100)) : 0


  const handleEditSubmit = (data: CaptureSubmit) => {
    const res = applyCaptureSubmit(data)
    if (res.ok) {
      setIsEditing(false)
      toast.success("Record updated")
    } else {
      toast.error(res.error)
    }
  }

  const openSettleDialog = () => {
    setSettleAmount(String(debt.remaining))
    setSettleWallet(wallets[0]?.id || "w-cash")
    setIsSettleOpen(true)
  }

  const handleConfirmSettle = async () => {
    const amt = Number(settleAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }
    if (amt > debt.remaining) {
      toast.error(`Amount cannot exceed remaining balance of ${currency}${debt.remaining.toLocaleString()}`)
      return
    }

    setIsSettling(true)
    try {
      await mutations.settleDebt.mutateAsync({
        id: debt.id,
        amount: amt,
        walletId: settleWallet || wallets[0]?.id || "w-cash",
      })
      setIsSettleOpen(false)
      toast.success(isIOwe ? "Payment logged successfully" : "Receipt logged successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to process settlement")
    } finally {
      setIsSettling(false)
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(debt.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Reference ID copied")
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto pb-8">
      {/* Main Status & Amount Card */}
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3 shadow-2xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted border border-border">
          <HandCoins className={`size-3.5 ${isIOwe ? "text-amber-500" : "text-emerald-500"}`} />
          <span className="capitalize">{isIOwe ? "Borrowing (I Owe)" : "Receivable (Owed to Me)"}</span>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Remaining Balance
          </p>
          <p className={`text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${isSettled ? "text-emerald-600 dark:text-emerald-400" : isIOwe ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
            {currency}{debt.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 max-w-sm mx-auto pt-1">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Paid: {currency}{paidAmount.toLocaleString()}</span>
            <span>Total: {currency}{debt.amount.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isSettled ? "bg-emerald-500" : isIOwe ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{progressPct}% Settled</span>
            <span className={isSettled ? "text-emerald-600 font-semibold" : ""}>
              {isSettled ? "Fully Cleared" : debt.status === "partial" ? "Partially Paid" : "Unpaid"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isSettled && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="default"
            onClick={openSettleDialog}
            className="h-11 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <CreditCard className="size-4" />
            <span>{isIOwe ? "Pay / Settle" : "Record Receipt"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={openSettleDialog}
            className="h-11 rounded-xl text-xs font-semibold gap-1.5 border-border bg-card shadow-2xs"
          >
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Settle in Full</span>
          </Button>
        </div>
      )}

      {/* Details Breakdown Card */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border/60 text-xs shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <User className="size-4" />
            <span>{isIOwe ? "Creditor / Lent by" : "Debtor / Borrowed by"}</span>
          </div>
          <span className="font-semibold text-foreground text-right">{debt.person}</span>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <FileText className="size-4" />
            <span>Type / Purpose</span>
          </div>
          <span className="font-semibold capitalize text-foreground">{debt.kind || "General"}</span>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Calendar className="size-4" />
            <span>Due Date</span>
          </div>
          <span className={`font-semibold tabular-nums ${debt.dueDate ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {debt.dueDate || "No due date set"}
          </span>
        </div>

        {((debt as any).notes || (debt as any).note) && (
          <div className="p-3.5 space-y-1.5">
            <span className="text-muted-foreground font-medium block">Notes & Reason</span>
            <p className="font-medium text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
              {(debt as any).notes || (debt as any).note}
            </p>
          </div>
        )}


        <div className="flex items-center justify-between p-3.5 text-muted-foreground">
          <span>Record ID</span>
          <button
            type="button"
            onClick={copyId}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{debt.id}</span>
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Settlement Payment Dialog */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {isIOwe ? "Record Payment" : "Record Receipt"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Payment Amount ({currency})
              </label>
              <FormattedNumberInput
                value={settleAmount}
                onValueChange={setSettleAmount}
                placeholder="0.00"
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-card text-foreground font-semibold tabular-nums text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>Remaining: {currency}{debt.remaining.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => setSettleAmount(String(debt.remaining))}
                  className="font-semibold text-primary hover:underline"
                >
                  Pay full amount
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isIOwe ? "Pay from Wallet" : "Deposit to Wallet"}
              </label>
              <select
                value={settleWallet}
                onChange={(e) => setSettleWallet(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs outline-none cursor-pointer"
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

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettleOpen(false)}
                className="flex-1 h-10 rounded-lg text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSettle}
                disabled={isSettling}
                className="flex-1 h-10 rounded-lg text-xs font-semibold gap-1.5"
              >
                {isSettling ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Confirm Settlement"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Drawer */}
      {isEditing && (
        <CaptureSheet
          open={isEditing}
          onOpenChange={setIsEditing}
          type={debt.direction}
          wallets={wallets.filter((w) => w.kind !== "investment")}
          currency={currency}
          defaultWalletId={wallets[0]?.id || "w-cash"}
          presets={{
            title: debt.person,
            amount: String(debt.amount),
            person: debt.person,
          }}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}
