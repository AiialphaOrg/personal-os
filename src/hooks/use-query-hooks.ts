import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"

export type WalletData = {
  id: string
  title: string
  kind: "SPENDING" | "SAVINGS" | "INVESTMENT"
  balance: number
  currency: string
  icon: string
}

export type TransactionData = {
  id: string
  title: string
  amount: number
  type: string
  category: string
  date: string
  walletId?: string
  person?: string
}

export type DebtData = {
  id: string
  person: string
  amount: number
  type: "i_owe" | "owed_to_me"
  category: string
  dueDate?: string
  status: "pending" | "settled"
}

export type GoalData = {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  category: string
}

/** Single Source of Truth — Fetch all data for Personal OS */
export function useAllData() {
  return useQuery({
    queryKey: ["personalos-data"],
    queryFn: () => apiFetch<{ ok: boolean; wallets: WalletData[]; transactions: TransactionData[]; debts: DebtData[]; goals: GoalData[] }>("/data/all"),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })
}

/** TanStack Query hook for Wallets */
export function useWallets() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["wallets"],
    queryFn: () => apiFetch<{ ok: boolean; wallets: WalletData[] }>("/data/wallets").then(res => res.wallets),
  })

  const saveWallet = useMutation({
    mutationFn: (data: Partial<WalletData>) => apiFetch("/data/wallets", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallets"] })
      void queryClient.invalidateQueries({ queryKey: ["personalos-data"] })
    },
  })

  return { ...query, saveWallet }
}

/** TanStack Query hook for Transactions */
export function useTransactions() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiFetch<{ ok: boolean; transactions: TransactionData[] }>("/data/transactions").then(res => res.transactions),
  })

  const addTransaction = useMutation({
    mutationFn: (data: Partial<TransactionData>) => apiFetch("/data/transactions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] })
      void queryClient.invalidateQueries({ queryKey: ["personalos-data"] })
    },
  })

  return { ...query, addTransaction }
}

/** TanStack Query hook for Debts */
export function useDebts() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["debts"],
    queryFn: () => apiFetch<{ ok: boolean; debts: DebtData[] }>("/data/debts").then(res => res.debts),
  })

  const saveDebt = useMutation({
    mutationFn: (data: Partial<DebtData>) => apiFetch("/data/debts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["debts"] })
      void queryClient.invalidateQueries({ queryKey: ["personalos-data"] })
    },
  })

  return { ...query, saveDebt }
}
