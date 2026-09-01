import { useMemo } from "react"
import { useAppSelector } from "@/store/hooks"


/** Live Personal OS data from Redux Single Source of Truth */
export function usePosData() {
  const wallets = useAppSelector((state) => state.data.wallets)
  const timeline = useAppSelector((state) => state.data.transactions)
  const debts = useAppSelector((state) => state.data.debts)
  const goals = useAppSelector((state) => state.data.goals)
  const tasks = useAppSelector((state) => state.data.tasks)
  const isOnline = useAppSelector((state) => state.data.isOnline)
  const networkError = useAppSelector((state) => state.data.networkError)
  const isLoading = useAppSelector((state) => state.data.isLoading)

  const balance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
  }, [wallets])

  return {
    wallets,
    timeline,
    debts,
    goals,
    tasks,
    balance,
    isOnline,
    networkError,
    isLoading,
  }
}

