import { useEffect, useRef } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Layout } from "@/components/Layout"
import { HomePage } from "@/pages/HomePage"
import { MoneyPage } from "@/pages/MoneyPage"
import { InsightsPage } from "@/pages/InsightsPage"
import { GoalsPage } from "@/pages/GoalsPage"
import { SubscriptionsAndWishlistPage } from "@/pages/SubscriptionsAndWishlistPage"
import { TransactionsPage } from "@/pages/TransactionsPage"

import { TransactionDetailPage } from "@/pages/TransactionDetailPage"
import { DebtDetailPage } from "@/pages/DebtDetailPage"
import { SettingsPage } from "@/pages/SettingsPage"


import { CapturePage } from "@/pages/CapturePage"
import { WalletDetailPage } from "@/pages/WalletDetailPage"
import { LoginPage } from "@/pages/LoginPage"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SplashScreen } from "@/components/splash-screen"
import { PwaInstaller } from "@/components/pwa-installer"
import { startReminderScheduler } from "@/lib/reminders/scheduler"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { checkAuthThunk } from "@/store/authSlice"
import { fetchPosData, setOnlineStatus } from "@/store/dataSlice"
import { getStoredToken } from "@/lib/api-client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const token = getStoredToken()

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const token = getStoredToken()

  if (isAuthenticated && token) {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}

export function App() {
  const dispatch = useAppDispatch()
  const hasInitialized = useRef(false)

  // Top-level auth validation and initial state hydration on mount
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    startReminderScheduler()

    const token = getStoredToken()
    if (token) {
      void dispatch(checkAuthThunk()).unwrap().then(() => {
        void dispatch(fetchPosData())
      }).catch(() => {
        // Token invalid, cleared by authSlice
      })
    }

    const handleOnline = () => {
      dispatch(setOnlineStatus(true))
      if (getStoredToken()) {
        void dispatch(fetchPosData())
      }
    }
    const handleOffline = () => {
      dispatch(setOnlineStatus(false))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [dispatch])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <SplashScreen />
          <PwaInstaller />
          <Routes>

            <Route
              path="/login"
              element={
                <PublicAuthRoute>
                  <LoginPage />
                </PublicAuthRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/today" element={<Navigate to="/home" replace />} />
              <Route path="/money" element={<MoneyPage />} />
              <Route path="/subscriptions" element={<SubscriptionsAndWishlistPage />} />
              <Route path="/wishlist" element={<SubscriptionsAndWishlistPage />} />
              <Route path="/plans" element={<SubscriptionsAndWishlistPage />} />
              {/* Planner redirected to home */}
              <Route path="/planner" element={<Navigate to="/home" replace />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:id" element={<TransactionDetailPage />} />
              <Route path="/debts/:id" element={<DebtDetailPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/capture/:type" element={<CapturePage />} />
              <Route path="/wallet/:id" element={<WalletDetailPage />} />
              <Route path="*" element={<Navigate to="/home" replace />} />

            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App

