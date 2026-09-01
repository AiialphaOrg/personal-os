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
  FileText,
  Tag,
  Wallet,
  Calendar,
  User,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [copied, setCopied] = useState(false)

  const transaction = useMemo(() => {
    return transactions.find((t) => t.id === id)
  }, [transactions, id])

  const wallet = useMemo(() => {
    if (!transaction) return null
    const wId = (transaction as any).walletId || (transaction as any).wallet
    return wallets.find((w) => w.id === wId)
  }, [transaction, wallets])

  const handleDelete = () => {
    if (!transaction) return
    if (confirm("Are you sure you want to delete this transaction?")) {
      mutations.deleteTransaction.mutate(transaction.id, {
        onSuccess: () => {
          toast.success("Transaction deleted")
          navigate("/transactions")
        },
        onError: () => {
          toast.error("Failed to delete transaction")
        },
      })
    }
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

  const userNote = useMemo(() => {
    if (chargeData) return chargeData.text || ""
    const rawNote = (transaction as any).note || transaction.detail || ""
    return rawNote
  }, [chargeData, transaction])

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

        {/* Itemized Base Amount & Fees if applicable */}
        {chargeData && (chargeData.bankCharge > 0 || chargeData.stampDuty > 0) && (
          <>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-muted-foreground font-medium">Base Amount</span>
              <span className="font-semibold text-foreground tabular-nums">
                {currency}{Number(chargeData.base || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {chargeData.bankCharge > 0 && (
              <div className="flex items-center justify-between p-3.5">
                <span className="text-muted-foreground font-medium">Bank Transfer Charge</span>
                <span className="font-semibold text-foreground tabular-nums">
                  +{currency}{Number(chargeData.bankCharge).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {chargeData.stampDuty > 0 && (
              <div className="flex items-center justify-between p-3.5">
                <span className="text-muted-foreground font-medium">Stamp Duty (≥ {currency}10,000)</span>
                <span className="font-semibold text-foreground tabular-nums">
                  +{currency}{Number(chargeData.stampDuty).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Tag className="size-4" />
            <span>Category</span>
          </div>
          <span className="font-semibold capitalize text-foreground">{transaction.category || "General"}</span>
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

        {userNote && (
          <div className="p-3.5 space-y-1.5">
            <span className="text-muted-foreground font-medium block">Additional Notes</span>
            <p className="font-medium text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
              {userNote}
            </p>
          </div>
        )}

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
          onClick={handleDelete}
          className="w-full h-11 rounded-xl text-xs font-semibold gap-1.5 border-border bg-card text-red-500 hover:text-red-600 hover:bg-red-500/10 shadow-2xs"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Transaction</span>
        </Button>
      </div>


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
            title: transaction.title,
            amount: transaction.amount != null ? String(transaction.amount) : undefined,
            category: transaction.category,
            walletId: (transaction as any).walletId || (transaction as any).wallet,
          }}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}
