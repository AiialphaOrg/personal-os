import { useSearchParams } from "react-router"
import { useHeader } from "@/hooks/use-header"
import { usePosQuery } from "@/hooks/use-pos-query"
import { SubscriptionsManager } from "@/components/subscriptions-manager"
import { PlannedPurchasesChecklist } from "@/components/planned-purchases-checklist"
import { Repeat, ShoppingBag } from "lucide-react"

export function SubscriptionsAndWishlistPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab = tabParam === "wishlist" ? "wishlist" : "subscriptions"

  const currency = localStorage.getItem("pos_currency") || "₦"
  const { subscriptions, plannedPurchases } = usePosQuery()

  useHeader({
    title: activeTab === "subscriptions" ? "Subscriptions" : "Wishlist",
  })

  const handleTabChange = (tab: "subscriptions" | "wishlist") => {
    setSearchParams(tab === "wishlist" ? { tab: "wishlist" } : {}, { replace: true })
  }


  // Monthly subscription burn total
  const monthlySubBurn = subscriptions.reduce((sum, s) => {
    if (!s.enabled) return sum
    if (s.frequency === "weekly") return sum + s.amount * 4
    if (s.frequency === "yearly") return sum + s.amount / 12
    return sum + s.amount
  }, 0)

  // Wishlist pending sum
  const pendingWishlistItems = plannedPurchases.filter((p) => p.status !== "purchased")
  const totalWishlistAmt = pendingWishlistItems.reduce((sum, p) => sum + p.estimatedAmount, 0)
  const purchasedCount = plannedPurchases.filter((p) => p.status === "purchased").length

  return (
    <div className="w-full max-w-4xl py-3 sm:py-5 space-y-4">
      {/* Top Stat Cards Header */}
      <div className="grid grid-cols-2 gap-3">
        {/* Stat 1: Monthly Subscriptions */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Monthly Subscriptions</span>
            <Repeat className="size-3.5 text-primary" />
          </div>
          <div className="text-sm sm:text-base font-bold tabular-nums text-foreground">
            {currency}{monthlySubBurn.toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {subscriptions.length} active recurring {subscriptions.length === 1 ? "bill" : "bills"}
          </p>
        </div>

        {/* Stat 2: Wishlist Planned */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Wishlist Planned</span>
            <ShoppingBag className="size-3.5 text-primary" />
          </div>
          <div className="text-sm sm:text-base font-bold tabular-nums text-foreground">
            {currency}{totalWishlistAmt.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {pendingWishlistItems.length} planned • {purchasedCount} bought
          </p>
        </div>
      </div>



      {/* Asana-style Underline Tab Bar */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 px-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => handleTabChange("subscriptions")}
            className={`flex items-center gap-2 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              activeTab === "subscriptions"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Repeat className="size-3.5" />
            <span>Subscriptions</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "subscriptions"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {subscriptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("wishlist")}
            className={`flex items-center gap-2 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              activeTab === "wishlist"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>Wishlist</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "wishlist"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pendingWishlistItems.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {activeTab === "subscriptions" ? (
          <SubscriptionsManager />
        ) : (
          <PlannedPurchasesChecklist />
        )}
      </div>
    </div>
  )
}
