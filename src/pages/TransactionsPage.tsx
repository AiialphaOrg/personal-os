import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useHeader } from "@/hooks/use-header"
import { type TimelineItem, type CaptureType } from "@/lib/storage"
import { fetchTransactionsPaginatedApi } from "@/lib/api-client"
import { 
  ArrowUp, 
  ArrowDown, 
  Store, 
  Loader2,
  ChevronDown,
  Smartphone,
  Gift,
  ArrowRightLeft,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export interface DetailedTransactionItem extends TimelineItem {
  rawDate: string
  person?: string
  walletId?: string
}

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

function formatMonthLabel(monthStr?: string) {
  if (!monthStr) {
    const now = new Date()
    return now.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  const [y, m] = monthStr.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function TransactionsPage() {
  const navigate = useNavigate()
  const currency = localStorage.getItem("pos_currency") || "₦"

  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)) // e.g. "2026-09"


  // High-performance paginated infinite query with server filters
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["paginatedTransactions", typeFilter, categoryFilter, selectedMonth],
    queryFn: async ({ pageParam }) => {
      const res = await fetchTransactionsPaginatedApi({
        cursor: pageParam || undefined,
        limit: 30,
        type: typeFilter !== "all" ? typeFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        month: selectedMonth || undefined,
      })
      return res
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 15_000,
  })

  // Flatten all pages
  const allLoadedTransactions: DetailedTransactionItem[] = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) =>
      (page.transactions || []).map((t: any) => ({
        id: t.id,
        type: t.type || "expense",
        title: t.title || "Transaction",
        detail: t.note || t.person || "",
        time: t.time || "",
        amount: Number(t.amount) || 0,
        category: t.category || "general",
        wallet: t.walletId,
        walletId: t.walletId,
        person: t.person,
        rawDate: t.date || (t.createdAt ? t.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      }))
    )
  }, [data])

  const totalIn = useMemo(
    () =>
      allLoadedTransactions
        .filter((t) => t.type === "income" || t.type === "owed_to_me")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    [allLoadedTransactions]
  )

  const totalOut = useMemo(
    () =>
      allLoadedTransactions
        .filter((t) => t.type === "expense" || t.type === "bill" || t.type === "transfer")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    [allLoadedTransactions]
  )

  const exportCsvStatement = () => {
    if (allLoadedTransactions.length === 0) {
      toast.error("No transactions to export for this period")
      return
    }

    const headers = ["Date", "Time", "Type", "Title", "Category", "Amount", "Reference ID"]
    const rows = allLoadedTransactions.map((t) => [
      `"${t.rawDate}"`,
      `"${t.time || ""}"`,
      `"${t.type}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.category || "General"}"`,
      `"${t.amount}"`,
      `"${t.id}"`,
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Statement_${selectedMonth || "all"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Statement exported as CSV")
  }

  const exportButton = useMemo(() => (
    <button
      type="button"
      onClick={exportCsvStatement}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition-colors"
      title="Export CSV Statement"
    >
      <Download className="size-3.5 text-primary" />
      <span className="hidden sm:inline">Export</span>
    </button>
  ), [allLoadedTransactions, selectedMonth])

  useHeader({
    title: "Transactions",
    rightNode: exportButton,
  })


  const getRowIcon = (item: TimelineItem) => {
    if (item.type === "income" || item.type === "owed_to_me") {
      if (item.category === "bonus" || item.title.toLowerCase().includes("bonus")) {
        return (
          <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Gift className="size-4.5" />
          </div>
        )
      }
      return (
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ArrowDown className="size-4.5" />
        </div>
      )
    }

    if (item.category === "airtime" || item.title.toLowerCase().includes("airtime")) {
      return (
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Smartphone className="size-4.5" />
        </div>
      )
    }

    if (item.type === "transfer") {
      return (
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-muted text-foreground border border-border">
          <ArrowRightLeft className="size-4.5 text-primary" />
        </div>
      )
    }

    if (item.category === "food" || item.category === "groceries") {
      return (
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-muted text-foreground border border-border">
          <Store className="size-4.5" />
        </div>
      )
    }

    // Default Outflow
    return (
      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-muted text-foreground border border-border">
        <ArrowUp className="size-4.5 text-foreground" />
      </div>
    )
  }

  const isIncomeType = (type: CaptureType) => type === "income" || type === "owed_to_me"

  return (
    <div className="flex flex-col gap-3 max-w-xl mx-auto">
      {/* Top Filter Buttons (All Categories ▾ | All Status ▾) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none cursor-pointer pr-8 shadow-2xs hover:bg-muted/40 transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="food">Food & Drinks</option>
            <option value="transport">Transport</option>
            <option value="data_airtime">Data & Airtime</option>
            <option value="shopping">Shopping & Market</option>
            <option value="utilities">Utilities & Bills</option>
            <option value="work">Work & Business</option>
            <option value="loan">Loans & Debts</option>
            <option value="general">General</option>
          </select>
          <ChevronDown className="size-3.5 absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none cursor-pointer pr-8 shadow-2xs hover:bg-muted/40 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers</option>
            <option value="i_owe">Payables (I Owe)</option>
            <option value="owed_to_me">Receivables</option>
          </select>
          <ChevronDown className="size-3.5 absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Main Transactions Sheet / Card */}
      <div className="rounded-lg border border-border bg-card p-3.5 sm:p-5 shadow-2xs space-y-2">
        {/* Month Selector & In/Out Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative inline-block shrink-0">
            <label className="flex items-center gap-1.5 font-bold text-base sm:text-lg text-foreground cursor-pointer hover:opacity-80 transition-opacity">
              <span>{formatMonthLabel(selectedMonth)}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          {/* In & Out Summary directly on top right */}
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground tabular-nums">
            <div>
              <span>In: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{currency}{totalIn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div>
              <span>Out: </span>
              <span className="font-semibold text-foreground">
                -{currency}{totalOut.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-border/60 my-1" />

        {/* Transaction Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8 gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Loading transactions…
          </div>
        ) : allLoadedTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm font-medium text-foreground">No transactions recorded</p>
            <p className="text-xs text-muted-foreground">
              {selectedMonth ? `No activity in ${formatMonthLabel(selectedMonth)}` : "No activity found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {allLoadedTransactions.map((item) => {
              const isIncome = isIncomeType(item.type)
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/transactions/${item.id}`)}
                  className="flex items-center justify-between py-3.5 first:pt-2 last:pb-1 transition-colors hover:bg-muted/20 cursor-pointer gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getRowIcon(item)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatTransactionDate(item.rawDate, item.time)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xs sm:text-sm font-bold tabular-nums ${isIncome ? "text-emerald-500" : "text-foreground"}`}>
                      {isIncome ? "+" : "-"}{currency}{Math.abs(item.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Successful
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Infinite Pagination "Load More" */}
      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full h-10 rounded-lg text-xs font-semibold border-border bg-card shadow-2xs mt-1"
        >
          {isFetchingNextPage ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading older records…
            </>
          ) : (
            "Load More"
          )}
        </Button>
      )}
    </div>
  )
}
