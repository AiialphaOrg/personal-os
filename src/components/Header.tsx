import { useLocation, useNavigate } from "react-router"
import { ChevronLeft, Search, WifiOff, RefreshCw } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useHeaderStore } from "@/stores/header-store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchPosData } from "@/store/dataSlice"

export const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/money": "Finances",
  "/planner": "Planner",
  "/insights": "Insights",
  "/transactions": "Transactions",
  "/goals": "Goals",
  "/settings": "Settings",
  "/capture/expense": "Add Expense",
  "/capture/income": "Add Income",
  "/capture/transfer": "Transfer Funds",
  "/capture/i_owe": "Add Payable (I Owe)",
  "/capture/owed_to_me": "Record Loan (Owed to Me)",
}

type HeaderProps = {
  onOpenSearch: () => void
}

export function Header({ onOpenSearch }: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const headerState = useHeaderStore()
  const networkError = useAppSelector((state) => state.data.networkError)
  const isOnline = useAppSelector((state) => state.data.isOnline)
  const isLoading = useAppSelector((state) => state.data.isLoading)

  const isStandalonePage = [
    "/",
    "/home",
    "/money",
    "/planner",
    "/insights",
    "/goals",
    "/settings",
  ].includes(location.pathname)



  const pageTitle = headerState.title || PAGE_TITLES[location.pathname] || "Personal OS"

  const handleRetry = () => {
    dispatch(fetchPosData())
  }

  return (
    <>
      {/* Compact Network Notice Banner */}
      {(!isOnline || networkError) && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-1.5 truncate">
            <WifiOff className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Offline · Cached data</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isLoading}
            className="flex items-center gap-1 font-semibold text-primary shrink-0 ml-2 hover:underline disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`size-2.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Retry</span>
          </button>
        </div>
      )}



      {/* Desktop Header */}
      <header className="hidden h-16 shrink-0 items-center justify-between bg-card px-6 border-b border-border/40 md:flex">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          {headerState.leftNode ? (
            headerState.leftNode
          ) : !isStandalonePage ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {headerState.rightNode ? (
            headerState.rightNode
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex w-52 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Search className="size-4" />
                <span>Search</span>
                <kbd className="pointer-events-none ms-auto select-none rounded-md bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
              {/* <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </button> */}
            </>
          )}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-border/40 justify-between px-3.5 bg-card/80 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2 min-w-0">
          {headerState.leftNode ? (
            headerState.leftNode
          ) : !isStandalonePage ? (
            <button
              type="button"
              className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {headerState.rightNode ? (
            headerState.rightNode
          ) : (
            <>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={onOpenSearch}
                aria-label="Search"
              >
                <Search className="size-4" />
              </button>
              {/* <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </button> */}
            </>
          )}
        </div>
      </header>
    </>
  )
}
