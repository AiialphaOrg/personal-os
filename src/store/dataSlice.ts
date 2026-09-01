import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  fetchAllData,
  createOrUpdateWalletApi,
  deleteWalletApi,
  createTransactionApi,
  deleteTransactionApi,
  createOrUpdateDebtApi,
  deleteDebtApi,
  createOrUpdateGoalApi,
  deleteGoalApi,
  createTaskApi,
  toggleTaskApi,
  deleteTaskApi,
} from "@/lib/api-client"
import type { WalletItem, TimelineItem, DebtItem, GoalItem, SubscriptionItem, PlannedPurchaseItem } from "@/lib/storage"

export interface TaskItem {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  createdAt?: string
}

export interface ServerMetrics {
  spentToday: number
  inflowToday: number
  spentThisMonth: number
  inflowThisMonth: number
  todayDate: string
  currentMonth: string
}

interface DataState {
  wallets: WalletItem[]
  transactions: TimelineItem[]
  debts: DebtItem[]
  goals: GoalItem[]
  tasks: TaskItem[]
  subscriptions: SubscriptionItem[]
  plannedPurchases: PlannedPurchaseItem[]
  metrics: ServerMetrics
  isLoading: boolean
  isOnline: boolean
  networkError: string | null
  lastFetchedAt: number | null
}

const initialState: DataState = {
  wallets: [],
  transactions: [],
  debts: [],
  goals: [],
  tasks: [],
  subscriptions: [],
  plannedPurchases: [],
  metrics: {
    spentToday: 0,
    inflowToday: 0,
    spentThisMonth: 0,
    inflowThisMonth: 0,
    todayDate: new Date().toISOString().split("T")[0],
    currentMonth: new Date().toISOString().slice(0, 7),
  },
  isLoading: false,
  isOnline: true,
  networkError: null,
  lastFetchedAt: null,
}



// 1. Fetch all data snapshot
export const fetchPosData = createAsyncThunk(
  "data/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchAllData()
      return res
    } catch (err: any) {
      return rejectWithValue(err.message || "Network not available")
    }
  }
)

// 2. Transaction mutations
export const addTransactionThunk = createAsyncThunk(
  "data/addTransaction",
  async (txData: any, { rejectWithValue }) => {
    try {
      const res = await createTransactionApi(txData)
      return res.transaction
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create transaction")
    }
  }
)

export const deleteTransactionThunk = createAsyncThunk(
  "data/deleteTransaction",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteTransactionApi(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete transaction")
    }
  }
)

// 3. Wallet mutations
export const upsertWalletThunk = createAsyncThunk(
  "data/upsertWallet",
  async (walletData: any, { rejectWithValue }) => {
    try {
      const res = await createOrUpdateWalletApi(walletData)
      return res.wallet
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save wallet")
    }
  }
)

export const deleteWalletThunk = createAsyncThunk(
  "data/deleteWallet",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteWalletApi(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete wallet")
    }
  }
)

// 4. Debt mutations
export const upsertDebtThunk = createAsyncThunk(
  "data/upsertDebt",
  async (debtData: any, { rejectWithValue }) => {
    try {
      const res = await createOrUpdateDebtApi(debtData)
      return res.debt
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save debt")
    }
  }
)

export const deleteDebtThunk = createAsyncThunk(
  "data/deleteDebt",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteDebtApi(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete debt")
    }
  }
)

// 5. Goal mutations
export const upsertGoalThunk = createAsyncThunk(
  "data/upsertGoal",
  async (goalData: any, { rejectWithValue }) => {
    try {
      const res = await createOrUpdateGoalApi(goalData)
      return res.goal
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save goal")
    }
  }
)

export const deleteGoalThunk = createAsyncThunk(
  "data/deleteGoal",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteGoalApi(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete goal")
    }
  }
)

// 6. Task mutations
export const addTaskThunk = createAsyncThunk(
  "data/addTask",
  async (taskData: any, { rejectWithValue }) => {
    try {
      const res = await createTaskApi(taskData)
      return res.task
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save task")
    }
  }
)

export const toggleTaskThunk = createAsyncThunk(
  "data/toggleTask",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await toggleTaskApi(id)
      return res.task
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle task")
    }
  }
)

export const deleteTaskThunk = createAsyncThunk(
  "data/deleteTask",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteTaskApi(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete task")
    }
  }
)

export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
      if (action.payload) {
        state.networkError = null
      }
    },
    clearNetworkError: (state) => {
      state.networkError = null
    },
    resetDataState: (state) => {
      state.wallets = []
      state.transactions = []
      state.debts = []
      state.goals = []
      state.tasks = []
      state.isLoading = false
      state.networkError = null
      state.lastFetchedAt = null
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchPosData.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchPosData.fulfilled, (state, action) => {
        state.isLoading = false
        state.isOnline = true
        state.networkError = null
        state.lastFetchedAt = Date.now()

        const payload = action.payload
        if (payload.metrics) {
          state.metrics = payload.metrics
        }
        state.wallets = (payload.wallets || []).map((w: any) => ({

          id: w.id,
          name: w.name || w.title || "Wallet",
          balance: Number(w.balance) || 0,
          kind: (w.kind || "spending").toLowerCase(),
          icon: w.icon || "bank",
          symbol: w.symbol,
          shares: w.shares ? Number(w.shares) : undefined,
        }))

        state.transactions = (payload.transactions || []).map((t: any) => ({
          id: t.id,
          type: t.type || "expense",
          title: t.title || "Transaction",
          detail: t.person || t.note || (t.walletId || "Cash"),
          time: t.time || (t.date ? t.date : "Today"),
          amount: Number(t.amount) || 0,
          category: t.category || "general",
          wallet: t.walletId || t.wallet,
          fromWallet: t.fromWallet,
          toWallet: t.toWallet,
          debtId: t.debtId,
          goalId: t.goalId,
        }))

        state.debts = (payload.debts || []).map((d: any) => ({
          id: d.id,
          person: d.person || "Someone",
          amount: Number(d.amount) || 0,
          remaining: Number(d.remaining ?? d.amount) || 0,
          direction: d.direction || d.type || "owed_to_me",
          kind: d.kind || d.category || "loan",
          dueDate: d.dueDate,
          walletId: d.walletId,
          status: d.status || "open",
          note: d.note,
          createdAt: d.createdAt || new Date().toISOString(),
        }))

        state.goals = (payload.goals || []).map((g: any) => ({
          id: g.id,
          title: g.title || "Goal",
          target: Number(g.target || g.targetAmount) || 100000,
          current: Number(g.current || g.currentAmount) || 0,
          deadline: g.deadline || g.targetDate,
          category: g.category || "general",
          createdAt: g.createdAt || new Date().toISOString(),
        }))

        state.tasks = (payload.tasks || []).map((tsk: any) => ({
          id: tsk.id,
          title: tsk.title || "Task",
          completed: Boolean(tsk.completed),
          dueDate: tsk.dueDate,
          createdAt: tsk.createdAt,
        }))

        state.subscriptions = (payload.subscriptions || []).map((s: any) => ({
          id: s.id,
          title: s.title || "Subscription",
          amount: Number(s.amount) || 0,
          frequency: s.frequency || "monthly",
          billingDay: s.billingDay ? Number(s.billingDay) : undefined,
          walletId: s.walletId,
          category: s.category || "general",
          enabled: s.enabled !== undefined ? Boolean(s.enabled) : true,
          lastChargedAt: s.lastChargedAt,
          createdAt: s.createdAt,
        }))

        state.plannedPurchases = (payload.plannedPurchases || []).map((p: any) => ({
          id: p.id,
          title: p.title || "Planned Item",
          estimatedAmount: Number(p.estimatedAmount) || 0,
          frequency: p.frequency || "once",
          category: p.category || "general",
          status: p.status || "planned",
          walletId: p.walletId,
          purchasedAt: p.purchasedAt,
          createdAt: p.createdAt,
        }))
      })

      .addCase(fetchPosData.rejected, (state, action) => {
        state.isLoading = false
        state.isOnline = false
        state.networkError = (action.payload as string) || "Network not available"
      })

      // Add Transaction
      .addCase(addTransactionThunk.fulfilled, (state, action) => {
        const tx = action.payload
        const formattedTx: TimelineItem = {
          id: tx.id,
          type: tx.type || "expense",
          title: tx.title || "Transaction",
          detail: tx.person || tx.note || (tx.walletId || "Cash"),
          time: tx.time || "Just now",
          amount: Number(tx.amount) || 0,
          category: tx.category || "general",
          wallet: tx.walletId || tx.wallet,
          fromWallet: tx.fromWallet,
          toWallet: tx.toWallet,
          debtId: tx.debtId,
          goalId: tx.goalId,
        }
        state.transactions.unshift(formattedTx)

        // Adjust wallet balances
        const amount = Number(tx.amount) || 0
        if (tx.type === "expense" || tx.type === "bill") {
          const w = state.wallets.find((x) => x.id === (tx.walletId || tx.wallet))
          if (w) w.balance = Math.max(0, w.balance - amount)
        } else if (tx.type === "income") {
          const w = state.wallets.find((x) => x.id === (tx.walletId || tx.wallet))
          if (w) w.balance += amount
        } else if (tx.type === "transfer" && tx.fromWallet && tx.toWallet) {
          const fromW = state.wallets.find((x) => x.id === tx.fromWallet)
          const toW = state.wallets.find((x) => x.id === tx.toWallet)
          if (fromW) fromW.balance = Math.max(0, fromW.balance - amount)
          if (toW) toW.balance += amount
        }
      })
      .addCase(deleteTransactionThunk.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter((t) => t.id !== action.payload)
      })

      // Wallets
      .addCase(upsertWalletThunk.fulfilled, (state, action) => {
        const w = action.payload
        const formatted: WalletItem = {
          id: w.id,
          name: w.name || w.title || "Wallet",
          balance: Number(w.balance) || 0,
          kind: (w.kind || "spending").toLowerCase(),
          icon: w.icon || "bank",
          symbol: w.symbol,
          shares: w.shares ? Number(w.shares) : undefined,
        }
        const idx = state.wallets.findIndex((x) => x.id === formatted.id)
        if (idx >= 0) {
          state.wallets[idx] = formatted
        } else {
          state.wallets.push(formatted)
        }
      })
      .addCase(deleteWalletThunk.fulfilled, (state, action) => {
        state.wallets = state.wallets.filter((w) => w.id !== action.payload)
      })

      // Debts
      .addCase(upsertDebtThunk.fulfilled, (state, action) => {
        const d = action.payload
        const formatted: DebtItem = {
          id: d.id,
          person: d.person || "Someone",
          amount: Number(d.amount) || 0,
          remaining: Number(d.remaining ?? d.amount) || 0,
          direction: d.direction || d.type || "owed_to_me",
          kind: d.kind || d.category || "loan",
          dueDate: d.dueDate,
          walletId: d.walletId,
          status: d.status || "open",
          note: d.note,
          createdAt: d.createdAt || new Date().toISOString(),
        }
        const idx = state.debts.findIndex((x) => x.id === formatted.id)
        if (idx >= 0) {
          state.debts[idx] = formatted
        } else {
          state.debts.unshift(formatted)
        }
      })
      .addCase(deleteDebtThunk.fulfilled, (state, action) => {
        state.debts = state.debts.filter((d) => d.id !== action.payload)
      })

      // Goals
      .addCase(upsertGoalThunk.fulfilled, (state, action) => {
        const g = action.payload
        const formatted: GoalItem = {
          id: g.id,
          title: g.title || "Goal",
          target: Number(g.target || g.targetAmount) || 100000,
          current: Number(g.current || g.currentAmount) || 0,
          deadline: g.deadline || g.targetDate,
          category: g.category || "general",
          createdAt: g.createdAt || new Date().toISOString(),
        }
        const idx = state.goals.findIndex((x) => x.id === formatted.id)
        if (idx >= 0) {
          state.goals[idx] = formatted
        } else {
          state.goals.unshift(formatted)
        }
      })
      .addCase(deleteGoalThunk.fulfilled, (state, action) => {
        state.goals = state.goals.filter((g) => g.id !== action.payload)
      })

      // Tasks
      .addCase(addTaskThunk.fulfilled, (state, action) => {
        const t = action.payload
        const formatted: TaskItem = {
          id: t.id,
          title: t.title || "Task",
          completed: Boolean(t.completed),
          dueDate: t.dueDate,
          createdAt: t.createdAt,
        }
        const idx = state.tasks.findIndex((x) => x.id === formatted.id)
        if (idx >= 0) {
          state.tasks[idx] = formatted
        } else {
          state.tasks.unshift(formatted)
        }
      })
      .addCase(toggleTaskThunk.fulfilled, (state, action) => {
        const t = action.payload
        const existing = state.tasks.find((x) => x.id === t.id)
        if (existing) {
          existing.completed = t.completed
        }
      })
      .addCase(deleteTaskThunk.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload)
      })
  },
})

export const { setOnlineStatus, clearNetworkError, resetDataState } = dataSlice.actions
export default dataSlice.reducer

