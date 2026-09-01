import { useState, useMemo } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useHeader } from "@/hooks/use-header"
import { usePosQuery } from "@/hooks/use-pos-query"
import { fetchInsightsSummaryApi, type FinancialAiOverview } from "@/lib/api-client"
import {
  ChevronDown,
  Sparkles,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Coins,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Button } from "@/components/ui/button"

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f59e0b",
  groceries: "#f59e0b",
  transport: "#3b82f6",
  utilities: "#8b5cf6",
  airtime: "#10b981",
  data_airtime: "#10b981",
  work: "#06b6d4",
  loan: "#ef4444",
  general: "#64748b",
}

const DEFAULT_COLOR = "#3b82f6"

function formatMonthLabel(monthStr?: string) {
  if (!monthStr) {
    const now = new Date()
    return now.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  const [y, m] = monthStr.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Category Breakdown Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <div className="h-32 w-32 rounded-full bg-muted mx-auto" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="h-3.5 w-16 rounded bg-muted" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* AI Overview Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>

      {/* Cash Flow Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-lg bg-muted/60" />
          <div className="h-16 rounded-lg bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

export function InsightsPage() {
  useHeader({ title: "Insights" })
  const currency = localStorage.getItem("pos_currency") || "₦"
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  
  // Track whether AI overview has been explicitly requested by user
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)

  const { transactions } = usePosQuery()

  // Fetch pre-aggregated SQL insights from the server
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["insightsSummary", selectedMonth],
    queryFn: () => fetchInsightsSummaryApi(selectedMonth),
    staleTime: 60_000,
  })

  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const netSavings = data?.netSavings ?? 0
  const categories = data?.categories ?? []
  const aiOverview: FinancialAiOverview | undefined = data?.aiOverview

  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0
  const maxFlow = Math.max(income, expenses, 1)

  const categoryTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = (t as any).date || (t as any).createdAt?.slice(0, 7) || ""
      return d.startsWith(selectedMonth) && t.type === "expense"
    })
  }, [transactions, selectedMonth])

  const pieChartData = categories.map((c) => ({
    name: c.category === "data_airtime" ? "Airtime & Data" : c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.total,
    color: CATEGORY_COLORS[c.category.toLowerCase()] || DEFAULT_COLOR,
  }))


  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-2xs">
        <div className="relative inline-block">
          <label className="flex items-center gap-1.5 font-bold text-base sm:text-lg text-foreground cursor-pointer hover:opacity-80 transition-opacity">
            <span>{formatMonthLabel(selectedMonth)}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                setShowAiAnalysis(false)
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        <div className="text-right text-xs text-muted-foreground font-medium">
          <span>{categories.length} Active Categories</span>
        </div>
      </div>

      {isLoading ? (
        <InsightsSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2 shadow-2xs">
          <p className="text-sm font-semibold text-foreground">Could not load insights</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-semibold text-primary underline"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* 1. FIRST: Expense Category Breakdown & Charts */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground tracking-tight">
                  Expense Category Breakdown
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                {currency}{expenses.toLocaleString()} Total
              </span>
            </div>

            {categories.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Coins className="size-6 text-muted-foreground mx-auto opacity-50" />
                <p className="text-xs font-medium text-foreground">No expenses recorded for this month</p>
                <p className="text-[11px] text-muted-foreground">Transactions will appear here once categorized.</p>
              </div>
            ) : (
              <>
                {/* Donut Chart if 2+ categories */}
                {pieChartData.length >= 2 && (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          innerRadius={46}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Category Item List with Expandable Accordions */}
                <div className="space-y-3 pt-1 divide-y divide-border/30">
                  {categories.map((c) => {
                    const pct = expenses > 0 ? Math.round((c.total / expenses) * 100) : 0
                    const color = CATEGORY_COLORS[c.category.toLowerCase()] || DEFAULT_COLOR
                    const isExpanded = expandedCategory === c.category
                    const txnsForCat = categoryTxns.filter(
                      (t) => (t.category || "general").toLowerCase() === c.category.toLowerCase()
                    )

                    return (
                      <div key={c.category} className="pt-2.5 first:pt-0 space-y-2">
                        {/* Header Row: Label & Total on the same line with Accordion toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedCategory(isExpanded ? null : c.category)}
                          className="w-full text-left space-y-1.5 group cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold capitalize text-foreground group-hover:text-primary transition-colors truncate">
                                {c.category === "data_airtime" ? "Airtime & Data" : c.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                ({c.count} {c.count === 1 ? "txn" : "txns"})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 tabular-nums shrink-0">
                              <span className="font-bold text-foreground">
                                {currency}{c.total.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium min-w-[32px] text-right">
                                {pct}%
                              </span>
                              <ChevronDown
                                className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-primary" : ""
                                }`}
                              />
                            </div>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </button>

                        {/* Accordion Content: Transactions list */}
                        {isExpanded && (
                          <div className="rounded-lg bg-muted/40 border border-border/60 p-2.5 space-y-1.5 animate-in fade-in-50 duration-200">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1 pb-1 border-b border-border/40">
                              <span>Transaction</span>
                              <span>Amount</span>
                            </div>
                            {txnsForCat.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground text-center py-1.5">
                                No individual transaction records for this month.
                              </p>
                            ) : (
                              <div className="divide-y divide-border/30">
                                {txnsForCat.map((t) => (
                                  <Link
                                    key={t.id}
                                    to={`/transactions/${t.id}`}
                                    className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/70 rounded text-xs transition-colors"
                                  >
                                    <div className="truncate pr-2">
                                      <p className="font-medium text-foreground truncate">{t.title}</p>
                                      <p className="text-[10px] text-muted-foreground">{(t as any).date || t.time}</p>
                                    </div>

                                    <span className="font-semibold text-foreground tabular-nums shrink-0">
                                      -{currency}{Number(t.amount || 0).toLocaleString()}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>

            )}
          </div>

          {/* 2. SECOND: AI Financial Overview (Before Inflow/Outflow) with on-demand click button */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground tracking-tight">AI Financial Overview</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {showAiAnalysis && aiOverview ? aiOverview.headline : "On-demand monthly financial intelligence"}
                  </p>
                </div>
              </div>

              {showAiAnalysis && aiOverview && (
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold">
                  {aiOverview.sentiment === "positive" ? (
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-500" />
                  )}
                  <span className="tabular-nums font-bold text-foreground">
                    {aiOverview.healthScore}/100
                  </span>
                </div>
              )}
            </div>

            {!showAiAnalysis ? (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-center space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Generate instant AI analysis and strategic budgeting advice for {formatMonthLabel(selectedMonth)}.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAiAnalysis(true)
                    void refetch()
                  }}
                  disabled={isFetching}
                  className="rounded-lg h-9 text-xs font-semibold px-4 shadow-2xs gap-1.5"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Analyzing Records…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate AI Analysis
                    </>
                  )}
                </Button>
              </div>
            ) : isFetching ? (
              <div className="flex items-center justify-center p-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Generating AI financial assessment…
              </div>
            ) : aiOverview ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {aiOverview.summary}
                </p>

                {aiOverview.keyTakeaways?.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/60 pt-2.5">
                    <span className="text-[11px] font-bold text-foreground tracking-tight uppercase">
                      Key Observations
                    </span>
                    <div className="space-y-1">
                      {aiOverview.keyTakeaways.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiOverview.recommendation && (
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground space-y-0.5">
                    <span className="font-bold text-[11px] text-primary uppercase block">
                      Strategic Recommendation
                    </span>
                    <p className="text-muted-foreground leading-snug">{aiOverview.recommendation}</p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-3" />
                    <span>Regenerate Analysis</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. THIRD: Inflow, Outflow & Cash Flow (After AI Insights) */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-foreground tracking-tight">
              Cash Flow & Savings Rate
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <TrendingUp className="size-3.5 text-emerald-500" />
                  <span>Total Inflow</span>
                </div>
                <p className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{currency}{income.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <TrendingDown className="size-3.5 text-foreground" />
                  <span>Total Outflow</span>
                </div>
                <p className="text-base sm:text-lg font-bold tracking-tight text-foreground tabular-nums">
                  -{currency}{expenses.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Visual Flow Progress Bars */}
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Inflow</span>
                  <span className="font-semibold tabular-nums text-foreground">{currency}{income.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (income / maxFlow) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">Outflow</span>
                  <span className="font-semibold tabular-nums text-foreground">{currency}{expenses.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, (expenses / maxFlow) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Net Savings Metric */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Net Monthly Savings</span>
                <span className={`font-bold text-sm tabular-nums ${netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {netSavings >= 0 ? "+" : ""}{currency}{netSavings.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Savings Rate</span>
                <span className="font-bold text-sm tabular-nums text-foreground">
                  {savingsRate}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
