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
import {
  fetchPosData,
  optimisticAddTransaction,
  optimisticDeleteTransaction,
  optimisticAddDebt,
  optimisticSettleDebt,
  optimisticDeleteDebt,
  optimisticUpsertWallet,
  optimisticDeleteWallet,
  optimisticAddGoal,
  optimisticDeleteGoal,
  optimisticAddTask,
  optimisticToggleTask,
  optimisticDeleteTask,
  optimisticAddSubscription,
  optimisticDeleteSubscription,
  optimisticChargeSubscription,
  optimisticAddPlannedPurchase,
  optimisticDeletePlannedPurchase,
  optimisticCheckoutPlannedPurchase,
} from "@/store/dataSlice"

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
    isLoading: reduxData.isLoading && reduxData.wallets.length === 0,
  }
}

export function usePosMutations() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const reduxData = useAppSelector((state) => state.data)

  const refresh = () => {
    void dispatch(fetchPosData())
    queryClient.invalidateQueries({ queryKey: ["posData"] })
    queryClient.invalidateQueries({ queryKey: ["paginatedTransactions"] })
  }

  const addTransaction = useMutation({
    mutationFn: async (txData: any) => {
      dispatch(optimisticAddTransaction(txData))
      return createTransactionApi(txData)
    },
    onSuccess: refresh,
  })

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteTransaction(id))
      return deleteTransactionApi(id)
    },
    onSuccess: refresh,
  })

  const addDebt = useMutation({
    mutationFn: async (debtData: any) => {
      dispatch(optimisticAddDebt(debtData))
      return createOrUpdateDebtApi(debtData)
    },
    onSuccess: refresh,
  })

  const settleDebt = useMutation({
    mutationFn: async ({ id, amount, walletId }: { id: string; amount: number; walletId?: string }) => {
      dispatch(optimisticSettleDebt({ id, amount, walletId }))
      return settleDebtApi(id, amount, walletId)
    },
    onSuccess: refresh,
  })

  const deleteDebt = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteDebt(id))
      return deleteDebtApi(id)
    },
    onSuccess: refresh,
  })

  const addWallet = useMutation({
    mutationFn: async (walletData: any) => {
      dispatch(optimisticUpsertWallet(walletData))
      return createOrUpdateWalletApi(walletData)
    },
    onSuccess: refresh,
  })

  const deleteWallet = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteWallet(id))
      return deleteWalletApi(id)
    },
    onSuccess: refresh,
  })

  const addGoal = useMutation({
    mutationFn: async (goalData: any) => {
      dispatch(optimisticAddGoal(goalData))
      return createOrUpdateGoalApi(goalData)
    },
    onSuccess: refresh,
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteGoal(id))
      return deleteGoalApi(id)
    },
    onSuccess: refresh,
  })

  const addTask = useMutation({
    mutationFn: async (taskData: any) => {
      dispatch(optimisticAddTask(taskData))
      return createTaskApi(taskData)
    },
    onSuccess: refresh,
  })

  const toggleTask = useMutation({
    mutationFn: async (id: string) => {
      const task = reduxData.tasks.find((t) => t.id === id)
      dispatch(optimisticToggleTask({ id, completed: !task?.completed }))
      return toggleTaskApi(id)
    },
    onSuccess: refresh,
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteTask(id))
      return deleteTaskApi(id)
    },
    onSuccess: refresh,
  })

  const addSubscription = useMutation({
    mutationFn: async (subData: any) => {
      dispatch(optimisticAddSubscription(subData))
      return createOrUpdateSubscriptionApi(subData)
    },
    onSuccess: refresh,
  })

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeleteSubscription(id))
      return deleteSubscriptionApi(id)
    },
    onSuccess: refresh,
  })

  const chargeSubscription = useMutation({
    mutationFn: async ({ id, walletId }: { id: string; walletId?: string }) => {
      dispatch(optimisticChargeSubscription({ id, walletId }))
      return chargeSubscriptionApi(id, walletId)
    },
    onSuccess: refresh,
  })

  const addPlannedPurchase = useMutation({
    mutationFn: async (ppData: any) => {
      dispatch(optimisticAddPlannedPurchase(ppData))
      return createOrUpdatePlannedPurchaseApi(ppData)
    },
    onSuccess: refresh,
  })

  const deletePlannedPurchase = useMutation({
    mutationFn: async (id: string) => {
      dispatch(optimisticDeletePlannedPurchase(id))
      return deletePlannedPurchaseApi(id)
    },
    onSuccess: refresh,
  })

  const checkoutPlannedPurchase = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      dispatch(optimisticCheckoutPlannedPurchase({ id, payload }))
      return checkoutPlannedPurchaseApi(id, payload)
    },
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

