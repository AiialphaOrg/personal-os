import { useState, useMemo, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { useHeader } from "@/hooks/use-header"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { applyCaptureSubmit } from "@/lib/capture-apply"
import { formatCategoryLabel } from "@/lib/storage"
import { toast } from "sonner"
import {
  Edit3,
  Trash2,
  CheckCircle2,
  FileText,
  Tag,
  Wallet,
  Calendar,
  User,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

function formatTransactionDate(dateStr?: string, timeStr?: string) {
  if (!dateStr) return "Just now"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return `${dateStr} ${timeStr || ""}`
  
  const month = d.toLocaleDateString("en-US", { month: "short" })
  const day = d.getDate()
  const suffix = (day % 10 > 3 || Math.floor((day % 100) / 10) === 1) ? "th" : ["th", "st", "nd", "rd"][day % 10]
  const time = timeStr || d.toLocaleTimeString("en-US", { hour12: false })
  
  return `${month} ${day}${suffix}, ${time}`
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { transactions, wallets } = usePosQuery()
  const mutations = usePosMutations()

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const transaction = useMemo(() => {
    return transactions.find((t) => t.id === id)
  }, [transactions, id])

  // If transaction is deleted or not found, smoothly redirect back to transactions
  useEffect(() => {
    if (!transaction) {
      const timer = setTimeout(() => {
        navigate("/transactions", { replace: true })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [transaction, navigate])

  const wallet = useMemo(() => {
    if (!transaction) return null
    const wId = (transaction as any).walletId || (transaction as any).wallet
    return wallets.find((w) => w.id === wId)
  }, [transaction, wallets])

  const confirmDelete = () => {
    if (!transaction) return
    setIsDeleting(true)
    navigate("/transactions", { replace: true })
    mutations.deleteTransaction.mutate(transaction.id, {
      onSuccess: () => {
        toast.success("Transaction deleted")
      },
      onError: () => {
        setIsDeleting(false)
        toast.error("Failed to delete transaction")
      },
    })
  }

  // Set adaptive header title and action button
  const headerRight = useMemo(() => {
    if (!transaction) return undefined
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-2xs"
      >
        <Edit3 className="size-3.5" />
        <span>Edit</span>
      </button>
    )
  }, [transaction])

  useHeader({
    title: "Transaction Details",
    rightNode: headerRight,
  })

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-4">
        {isDeleting ? (
          <p className="text-xs text-muted-foreground">Deleting transaction…</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Transaction not found</p>
            <p className="text-xs text-muted-foreground">The transaction may have been removed or does not exist.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/transactions")}
              className="h-9 text-xs rounded-lg mt-2"
            >
              Back to Transactions
            </Button>
          </>
        )}
      </div>
    )
  }

  const isIncome = transaction.type === "income" || transaction.type === "owed_to_me"
  const rawDate = (transaction as any).date || (transaction as any).createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)

  const chargeData = useMemo(() => {
    const rawNote = (transaction as any).note || transaction.detail || ""
    if (typeof rawNote === "string" && rawNote.startsWith("__POS_META__")) {
      try {
        return JSON.parse(rawNote.replace("__POS_META__", ""))
      } catch {
        return null
      }
    }
    return null
  }, [transaction])

  const handleEditSubmit = (data: CaptureSubmit) => {
    const res = applyCaptureSubmit(data)
    if (res.ok) {
      setIsEditing(false)
      toast.success("Transaction updated")
    } else {
      toast.error(res.error)
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(transaction.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Reference ID copied")
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto pb-8">
      {/* Main Status & Amount Card */}
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2 shadow-2xs">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {transaction.type === "transfer" ? "Transfer Amount" : isIncome ? "Total Received" : "Total Paid"}
        </p>
        <p className={`text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
          {isIncome ? "+" : "-"}{currency}{Math.abs(transaction.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
          <CheckCircle2 className="size-4" />
          <span>Payment Successful</span>
        </div>
      </div>

      {/* Receipt Details Breakdown Card */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border/60 text-xs shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <FileText className="size-4" />
            <span>Title / Narration</span>
          </div>
          <span className="font-semibold text-foreground text-right">{transaction.title}</span>
        </div>

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Tag className="size-4" />
            <span>Category</span>
          </div>
          <span className="font-semibold text-foreground">{formatCategoryLabel(transaction.category)}</span>
        </div>


        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Wallet className="size-4" />
            <span>Wallet / Account</span>
          </div>
          <span className="font-semibold text-foreground">{wallet?.name || "Cash Wallet"}</span>
        </div>

        {(transaction as any).person && (
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <User className="size-4" />
              <span>Person / Beneficiary</span>
            </div>
            <span className="font-semibold text-foreground">{(transaction as any).person}</span>
          </div>
        )}

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Calendar className="size-4" />
            <span>Date & Time</span>
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {formatTransactionDate(rawDate, transaction.time)}
          </span>
        </div>

        {/* Cost / Payment Breakdown - Always displayed for full transparency */}
        <div className="p-3.5 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isIncome ? "Inflow Breakdown" : "Cost Breakdown"}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {wallet?.name || "Account"}
            </span>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{isIncome ? "Gross Amount" : "Base Amount"}</span>
              <span className="text-foreground tabular-nums font-semibold">
                {currency}
                {chargeData?.base != null
                  ? Number(chargeData.base).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : Math.abs(transaction.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {!isIncome && (
              <>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Bank Transfer Charge</span>
                  <span className={`tabular-nums ${chargeData?.bankCharge ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                    {chargeData?.bankCharge
                      ? `+${currency}${Number(chargeData.bankCharge).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : `${currency}0.00`}
                  </span>
                </div>

                {(Number(chargeData?.stampDuty) > 0 || Math.abs(transaction.amount || 0) >= 10000) && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Electronic Levy / Stamp Duty</span>
                    <span className={`tabular-nums ${chargeData?.stampDuty ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {chargeData?.stampDuty
                        ? `+${currency}${Number(chargeData.stampDuty).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : `${currency}0.00`}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-xs font-semibold">
              <span className="text-foreground">
                {isIncome ? "Total Credited" : "Total Debited"}
              </span>
              <span className={`tabular-nums font-bold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {currency}{Math.abs(transaction.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 text-muted-foreground">
          <span>Transaction ID</span>
          <button
            type="button"
            onClick={copyId}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{transaction.id}</span>
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>


      {/* Bottom Action */}
      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full h-11 rounded-xl text-xs font-semibold gap-1.5 border-border bg-card text-red-500 hover:text-red-600 hover:bg-red-500/10 shadow-2xs"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Transaction</span>
        </Button>
      </div>

      {/* Shadcn Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction and restore the balance to your wallet. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Drawer */}
      {isEditing && (
        <CaptureSheet
          open={isEditing}
          onOpenChange={setIsEditing}
          type={transaction.type}
          wallets={wallets.filter((w) => w.kind !== "investment")}
          currency={currency}
          defaultWalletId={(transaction as any).walletId || (transaction as any).wallet || "w-cash"}
          presets={{
            id: transaction.id,
            title: transaction.title,
            amount: chargeData?.base != null ? String(chargeData.base) : (transaction.amount != null ? String(transaction.amount) : undefined),
            category: transaction.category,
            walletId: (transaction as any).walletId || (transaction as any).wallet,
            dueDate: (transaction as any).date,
            bankCharge: chargeData?.bankCharge,
            stampDuty: chargeData?.stampDuty,
          }}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}
