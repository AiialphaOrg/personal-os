import { useState, useEffect, useMemo } from "react"
import { Outlet, useLocation, Link } from "react-router"

import {
  Search,
  X,
  ArrowRightLeft,
  Coins,
  FileText,
  Wallet,
  HandCoins,
  Target,
  Sparkles,
  Settings,
  Plus,
  Repeat,
  ShoppingCart,
} from "lucide-react"
import { BottomNav } from "./BottomNav"
import { Button } from "./ui/button"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarLeft } from "./sidebar/sidebar-left"
import { SidebarRight } from "./sidebar/sidebar-right"
import { GlobalQuickCapture } from "./global-quick-capture"
import { WalletFormDialog } from "./wallet-form-dialog"
import { VoiceControl } from "./VoiceControl"
import { Header } from "./Header"
import { usePosQuery } from "@/hooks/use-pos-query"

export function Layout() {
  const location = useLocation()
  const isOnboarding = location.pathname === "/onboarding"
  const isCapturePage = location.pathname.startsWith("/capture")
  const currency = localStorage.getItem("pos_currency") || "₦"


  const { transactions, wallets, debts } = usePosQuery()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Global ⌘K / Ctrl+K and Escape keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!isOnboarding) setIsSearchOpen((open) => !open)
      } else if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isOnboarding, isSearchOpen])

  // Aggregate searchable items from real-time database
  const allSearchItems = useMemo(() => {
    const items: Array<{
      type: "page" | "action" | "transaction" | "wallet" | "debt"
      title: string
      url: string
      detail: string
      icon: any
    }> = [
        // Primary Pages
        { type: "page", title: "Home Dashboard", url: "/home", detail: "Daily finances & summary", icon: Coins },
        { type: "page", title: "Finances & Wallets", url: "/money", detail: "Net worth, wallets & accounts", icon: Wallet },
        { type: "page", title: "Subscriptions & Recurring", url: "/subscriptions", detail: "Manage auto-deductions & monthly bills", icon: Repeat },
        { type: "page", title: "Wishlist & Planned Purchases", url: "/wishlist", detail: "Checklist of items to buy", icon: ShoppingCart },
        { type: "page", title: "Transactions History", url: "/transactions", detail: "View & filter statements", icon: FileText },
        { type: "page", title: "Insights & AI Analytics", url: "/insights", detail: "Monthly breakdown & AI overview", icon: Sparkles },
        { type: "page", title: "Financial Goals", url: "/goals", detail: "Target savings & tracking", icon: Target },
        { type: "page", title: "Settings & Profile", url: "/settings", detail: "Preferences, currency & AI engine", icon: Settings },


        // Quick Actions
        { type: "action", title: "Quick Transfer Funds", url: "/capture/transfer", detail: "Move money between wallets", icon: ArrowRightLeft },
        { type: "action", title: "Record Expense", url: "/capture/expense", detail: "Log an outflow transaction", icon: Plus },
        { type: "action", title: "Record Income", url: "/capture/income", detail: "Log incoming funds", icon: Plus },
        { type: "action", title: "Add Payable (I Owe)", url: "/capture/i_owe", detail: "Log money borrowed or bill", icon: HandCoins },
        { type: "action", title: "Add Receivable (Owed to Me)", url: "/capture/owed_to_me", detail: "Log money lent to someone", icon: HandCoins },
      ]

    // Wallets
    wallets.forEach((w) => {
      items.push({
        type: "wallet",
        title: w.name,
        url: `/wallet/${w.id}`,
        detail: `${w.kind.toUpperCase()} Wallet · ${currency}${w.balance.toLocaleString()}`,
        icon: Wallet,
      })
    })

    // Debts & Receivables
    debts.forEach((d) => {
      items.push({
        type: "debt",
        title: d.person,
        url: `/debts/${d.id}`,
        detail: `${d.direction === "i_owe" ? "You Owe" : "Owed to You"} · ${currency}${d.remaining.toLocaleString()} remaining`,
        icon: HandCoins,
      })
    })

    // Transactions (Top 30 most recent)
    transactions.slice(0, 30).forEach((t) => {
      items.push({
        type: "transaction",
        title: t.title,
        url: `/transactions/${t.id}`,
        detail: `${t.category || "General"} · ${t.type === "income" ? "+" : "-"}${currency}${(t.amount || 0).toLocaleString()} · ${t.time || "Recent"}`,
        icon: FileText,
      })
    })

    return items
  }, [transactions, wallets, debts, currency])

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return allSearchItems.slice(0, 10)
    return allSearchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    )
  }, [allSearchItems, searchQuery])

  // Automatically close search and reset query whenever navigation occurs
  useEffect(() => {
    if (isSearchOpen) {
      setIsSearchOpen(false)
      setSearchQuery("")
    }
  }, [location.pathname, location.search])


  if (isOnboarding) {
    return (
      <div className="flex h-svh w-screen overflow-hidden bg-background font-sans">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-svh w-screen overflow-hidden bg-background font-sans">
        <SidebarLeft />

        <SidebarInset className="relative flex flex-1 flex-col overflow-hidden bg-background">
          <Header onOpenSearch={() => setIsSearchOpen(true)} />

          <main className={`flex-1 overflow-y-auto px-3 py-3 md:px-8 md:py-6 md:pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isCapturePage ? "pb-4" : "pb-20"}`}>
            <div className="mx-auto max-w-5xl">
              <Outlet />
            </div>
          </main>

          {!isCapturePage && <BottomNav />}
        </SidebarInset>

        <SidebarRight />

        <GlobalQuickCapture />
        <WalletFormDialog />
        <VoiceControl />

        {/* Global ⌘K Command Palette / Search Dialog (Zero-flicker native modal) */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-4 sm:pt-16 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-100">
            {/* Backdrop Dismiss */}
            <div
              className="fixed inset-0"
              onClick={() => {
                setIsSearchOpen(false)
                setSearchQuery("")
              }}
            />

            {/* Search Card */}
            <div className="relative z-10 flex flex-col w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-xl border-0 sm:border sm:border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
              <div className="flex items-center border-b border-border/80 px-4 py-3 shrink-0">
                <Search className="size-4.5 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions, wallets, debts, actions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground rounded-lg"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="flex-1 sm:max-h-[340px] overflow-y-auto p-2 text-xs divide-y divide-border/30">
                {filteredSearchItems.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">No matching records found</p>
                    <p className="text-[11px]">Try searching with a title, amount, wallet, or contact name.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredSearchItems.map((item, idx) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={idx}
                          to={item.url}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-foreground transition-colors hover:bg-muted/60 group cursor-pointer"
                        >
                          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-muted border border-border group-hover:bg-card text-muted-foreground group-hover:text-primary transition-colors">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                                {item.type}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                              {item.detail}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

              </div>

              <div className="border-t border-border/60 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
                <span>Navigation: <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Click</kbd> to open</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> to close</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  )
}
