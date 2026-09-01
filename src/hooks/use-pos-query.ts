import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createTransactionApi,
  deleteTransactionApi,
  createOrUpdateDebtApi,
  settleDebtApi,
  deleteDebtApi,
  createOrUpdateWalletApi,
  deleteWalletApi,
  createOrUpdateGoalApi,
  deleteGoalApi,
  createTaskApi,
  toggleTaskApi,
  deleteTaskApi,
  createOrUpdateSubscriptionApi,
  deleteSubscriptionApi,
  chargeSubscriptionApi,
  createOrUpdatePlannedPurchaseApi,
  deletePlannedPurchaseApi,
  checkoutPlannedPurchaseApi,
} from "@/lib/api-client"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchPosData } from "@/store/dataSlice"

export function usePosQuery() {
  const dispatch = useAppDispatch()
  const reduxData = useAppSelector((state) => state.data)

  const query = useQuery({
    queryKey: ["posData"],
    queryFn: async () => {
      const result = await dispatch(fetchPosData()).unwrap()
      return result
    },
    staleTime: 30_000,
    retry: 1,
  })

  return {
    ...query,
    wallets: reduxData.wallets,
    transactions: reduxData.transactions,
    debts: reduxData.debts,
    goals: reduxData.goals,
    tasks: reduxData.tasks,
    subscriptions: reduxData.subscriptions,
    plannedPurchases: reduxData.plannedPurchases,
    metrics: reduxData.metrics,
    isOnline: reduxData.isOnline,
    networkError: reduxData.networkError,
    isLoading: reduxData.isLoading || query.isLoading,
  }
}


export function usePosMutations() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()

  const refresh = async () => {
    await dispatch(fetchPosData())
    queryClient.invalidateQueries({ queryKey: ["posData"] })
  }

  const addTransaction = useMutation({
    mutationFn: createTransactionApi,
    onSuccess: refresh,
  })

  const deleteTransaction = useMutation({
    mutationFn: deleteTransactionApi,
    onSuccess: refresh,
  })

  const addDebt = useMutation({
    mutationFn: createOrUpdateDebtApi,
    onSuccess: refresh,
  })

  const settleDebt = useMutation({
    mutationFn: ({ id, amount, walletId }: { id: string; amount: number; walletId?: string }) =>
      settleDebtApi(id, amount, walletId),
    onSuccess: refresh,
  })

  const deleteDebt = useMutation({
    mutationFn: deleteDebtApi,
    onSuccess: refresh,
  })

  const addWallet = useMutation({
    mutationFn: createOrUpdateWalletApi,
    onSuccess: refresh,
  })

  const deleteWallet = useMutation({
    mutationFn: deleteWalletApi,
    onSuccess: refresh,
  })

  const addGoal = useMutation({
    mutationFn: createOrUpdateGoalApi,
    onSuccess: refresh,
  })

  const deleteGoal = useMutation({
    mutationFn: deleteGoalApi,
    onSuccess: refresh,
  })

  const addTask = useMutation({
    mutationFn: createTaskApi,
    onSuccess: refresh,
  })

  const toggleTask = useMutation({
    mutationFn: toggleTaskApi,
    onSuccess: refresh,
  })

  const deleteTask = useMutation({
    mutationFn: deleteTaskApi,
    onSuccess: refresh,
  })

  const addSubscription = useMutation({
    mutationFn: createOrUpdateSubscriptionApi,
    onSuccess: refresh,
  })

  const deleteSubscription = useMutation({
    mutationFn: deleteSubscriptionApi,
    onSuccess: refresh,
  })

  const chargeSubscription = useMutation({
    mutationFn: ({ id, walletId }: { id: string; walletId?: string }) =>
      chargeSubscriptionApi(id, walletId),
    onSuccess: refresh,
  })

  const addPlannedPurchase = useMutation({
    mutationFn: createOrUpdatePlannedPurchaseApi,
    onSuccess: refresh,
  })

  const deletePlannedPurchase = useMutation({
    mutationFn: deletePlannedPurchaseApi,
    onSuccess: refresh,
  })

  const checkoutPlannedPurchase = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      checkoutPlannedPurchaseApi(id, payload),
    onSuccess: refresh,
  })

  return {
    addTransaction,
    deleteTransaction,
    addDebt,
    settleDebt,
    deleteDebt,
    addWallet,
    deleteWallet,
    addGoal,
    deleteGoal,
    addTask,
    toggleTask,
    deleteTask,
    addSubscription,
    deleteSubscription,
    chargeSubscription,
    addPlannedPurchase,
    deletePlannedPurchase,
    checkoutPlannedPurchase,
  }
}

