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

const CACHE_KEY = "pos_cached_data_v2"

function loadCachedPosData(): Partial<DataState> | null {
  try {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn("Failed to load cached pos data", err)
    return null
  }
}

function saveCachedPosData(state: DataState) {
  try {
    if (typeof window === "undefined") return
    const snapshot = {
      wallets: state.wallets,
      transactions: state.transactions,
      debts: state.debts,
      goals: state.goals,
      tasks: state.tasks,
      subscriptions: state.subscriptions,
      plannedPurchases: state.plannedPurchases,
      metrics: state.metrics,
      lastFetchedAt: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch (err) {
    console.warn("Failed to save cached pos data", err)
  }
}

const cached = loadCachedPosData()

const initialState: DataState = {
  wallets: cached?.wallets || [],
  transactions: cached?.transactions || [],
  debts: cached?.debts || [],
  goals: cached?.goals || [],
  tasks: cached?.tasks || [],
  subscriptions: cached?.subscriptions || [],
  plannedPurchases: cached?.plannedPurchases || [],
  metrics: cached?.metrics || {
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
  lastFetchedAt: cached?.lastFetchedAt || null,
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
      state.subscriptions = []
      state.plannedPurchases = []
      state.isLoading = false
      state.networkError = null
      state.lastFetchedAt = null
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(CACHE_KEY)
        }
      } catch {}
    },

    // --- Synchronous Optimistic Reducers (Instant 0ms UI) ---
    optimisticAddTransaction: (state, action: PayloadAction<any>) => {
      const p = action.payload
      const id = p.id || `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const amt = Number(p.amount) || 0
      const type = p.type || "expense"
      
      let detail = p.detail || p.note || ""
      if (typeof detail === "string" && detail.startsWith("__POS_META__")) {
        try {
          const parsed = JSON.parse(detail.replace("__POS_META__", ""))
          detail = parsed.text || parsed.note || parsed.title || ""
        } catch {
          detail = ""
        }
      }
      if (!detail) {
        if (type === "transfer") {
          detail = "Account Transfer"
        } else {
          const matchedWallet = state.wallets.find((w) => w.id === (p.walletId || p.wallet))
          detail = matchedWallet ? matchedWallet.name : (p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Cash Account")
        }
      }

      const tx: TimelineItem = {
        id,
        type,
        title: p.title || (type === "transfer" ? "Account Transfer" : "Transaction"),
        detail,
        time: p.time || "Just now",
        amount: amt,
        category: p.category || "general",
        wallet: p.walletId || p.wallet,
        fromWallet: p.fromWallet,
        toWallet: p.toWallet,
        debtId: p.debtId,
        goalId: p.goalId,
      }

      // Add to top of list
      state.transactions.unshift(tx)

      // Adjust wallet balances and daily/monthly metrics instantly
      const targetWalletId = p.walletId || p.wallet
      if (type === "expense" || type === "bill") {
        const w = state.wallets.find((x) => x.id === targetWalletId)
        if (w) w.balance = Math.max(0, w.balance - amt)
        state.metrics.spentToday += amt
        state.metrics.spentThisMonth += amt
      } else if (type === "income") {
        const w = state.wallets.find((x) => x.id === targetWalletId)
        if (w) w.balance += amt
        state.metrics.inflowToday += amt
        state.metrics.inflowThisMonth += amt
      } else if (type === "transfer" && p.fromWallet && p.toWallet) {
        const fromW = state.wallets.find((x) => x.id === p.fromWallet)
        const toW = state.wallets.find((x) => x.id === p.toWallet)
        if (fromW) fromW.balance = Math.max(0, fromW.balance - amt)
        if (toW) toW.balance += amt
      }

      saveCachedPosData(state)
    },

    optimisticDeleteTransaction: (state, action: PayloadAction<string>) => {
      const txId = action.payload
      const tx = state.transactions.find((t) => t.id === txId)
      if (tx) {
        const amt = Number(tx.amount) || 0
        if (tx.type === "expense" || tx.type === "bill") {
          const w = state.wallets.find((x) => x.id === tx.wallet)
          if (w) w.balance += amt
          state.metrics.spentToday = Math.max(0, state.metrics.spentToday - amt)
          state.metrics.spentThisMonth = Math.max(0, state.metrics.spentThisMonth - amt)
        } else if (tx.type === "income") {
          const w = state.wallets.find((x) => x.id === tx.wallet)
          if (w) w.balance = Math.max(0, w.balance - amt)
          state.metrics.inflowToday = Math.max(0, state.metrics.inflowToday - amt)
          state.metrics.inflowThisMonth = Math.max(0, state.metrics.inflowThisMonth - amt)
        } else if (tx.type === "transfer" && tx.fromWallet && tx.toWallet) {
          const fromW = state.wallets.find((x) => x.id === tx.fromWallet)
          const toW = state.wallets.find((x) => x.id === tx.toWallet)
          if (fromW) fromW.balance += amt
          if (toW) toW.balance = Math.max(0, toW.balance - amt)
        }
      }
      state.transactions = state.transactions.filter((t) => t.id !== txId)
      saveCachedPosData(state)
    },

    optimisticAddDebt: (state, action: PayloadAction<any>) => {
      const d = action.payload
      const id = d.id || `opt_debt_${Date.now()}`
      const amt = Number(d.amount) || 0
      const formatted: DebtItem = {
        id,
        person: d.person || "Someone",
        amount: amt,
        remaining: Number(d.remaining ?? amt),
        direction: d.direction || d.type || "owed_to_me",
        kind: d.kind || d.category || "loan",
        dueDate: d.dueDate,
        walletId: d.walletId,
        status: d.status || "open",
        note: d.note,
        createdAt: d.createdAt || new Date().toISOString(),
      }
      const idx = state.debts.findIndex((x) => x.id === id)
      if (idx >= 0) {
        state.debts[idx] = formatted
      } else {
        state.debts.unshift(formatted)
      }
      saveCachedPosData(state)
    },

    optimisticSettleDebt: (state, action: PayloadAction<{ id: string; amount: number; walletId?: string }>) => {
      const { id, amount, walletId } = action.payload
      const debt = state.debts.find((d) => d.id === id)
      if (debt) {
        debt.remaining = Math.max(0, debt.remaining - amount)
        if (debt.remaining <= 0) {
          debt.status = "paid"
        } else if (debt.remaining < debt.amount) {
          debt.status = "partial"
        }
        if (walletId) {
          const w = state.wallets.find((x) => x.id === walletId)
          if (w) {
            if (debt.direction === "owed_to_me") {
              w.balance += amount
              state.metrics.inflowToday += amount
            } else {
              w.balance = Math.max(0, w.balance - amount)
              state.metrics.spentToday += amount
            }
          }
        }
      }
      saveCachedPosData(state)
    },

    optimisticDeleteDebt: (state, action: PayloadAction<string>) => {
      state.debts = state.debts.filter((d) => d.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticUpsertWallet: (state, action: PayloadAction<any>) => {
      const w = action.payload
      const id = w.id || `opt_wallet_${Date.now()}`
      const formatted: WalletItem = {
        id,
        name: w.name || w.title || "Wallet",
        balance: Number(w.balance) || 0,
        kind: (w.kind || "spending").toLowerCase(),
        icon: w.icon || "bank",
        symbol: w.symbol,
        shares: w.shares ? Number(w.shares) : undefined,
      }
      const idx = state.wallets.findIndex((x) => x.id === id)
      if (idx >= 0) {
        state.wallets[idx] = formatted
      } else {
        state.wallets.push(formatted)
      }
      saveCachedPosData(state)
    },

    optimisticDeleteWallet: (state, action: PayloadAction<string>) => {
      state.wallets = state.wallets.filter((w) => w.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticAddGoal: (state, action: PayloadAction<any>) => {
      const g = action.payload
      const id = g.id || `opt_goal_${Date.now()}`
      const formatted: GoalItem = {
        id,
        title: g.title || "Goal",
        target: Number(g.target || g.targetAmount) || 100000,
        current: Number(g.current || g.currentAmount) || 0,
        deadline: g.deadline || g.targetDate,
        category: g.category || "general",
        createdAt: g.createdAt || new Date().toISOString(),
      }
      const idx = state.goals.findIndex((x) => x.id === id)
      if (idx >= 0) {
        state.goals[idx] = formatted
      } else {
        state.goals.unshift(formatted)
      }
      saveCachedPosData(state)
    },

    optimisticDeleteGoal: (state, action: PayloadAction<string>) => {
      state.goals = state.goals.filter((g) => g.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticAddTask: (state, action: PayloadAction<any>) => {
      const t = action.payload
      const id = t.id || `opt_task_${Date.now()}`
      const formatted: TaskItem = {
        id,
        title: t.title || "Task",
        completed: Boolean(t.completed),
        dueDate: t.dueDate,
        createdAt: t.createdAt || new Date().toISOString(),
      }
      state.tasks.unshift(formatted)
      saveCachedPosData(state)
    },

    optimisticToggleTask: (state, action: PayloadAction<{ id: string; completed: boolean }>) => {
      const t = state.tasks.find((x) => x.id === action.payload.id)
      if (t) {
        t.completed = action.payload.completed
      }
      saveCachedPosData(state)
    },

    optimisticDeleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticAddSubscription: (state, action: PayloadAction<any>) => {
      const s = action.payload
      const id = s.id || `opt_sub_${Date.now()}`
      const formatted: SubscriptionItem = {
        id,
        title: s.title || "Subscription",
        amount: Number(s.amount) || 0,
        frequency: s.frequency || "monthly",
        billingDay: s.billingDay ? Number(s.billingDay) : undefined,
        walletId: s.walletId,
        category: s.category || "general",
        enabled: s.enabled !== undefined ? Boolean(s.enabled) : true,
        lastChargedAt: s.lastChargedAt,
        createdAt: s.createdAt || new Date().toISOString(),
      }
      const idx = state.subscriptions.findIndex((x) => x.id === id)
      if (idx >= 0) {
        state.subscriptions[idx] = formatted
      } else {
        state.subscriptions.unshift(formatted)
      }
      saveCachedPosData(state)
    },

    optimisticDeleteSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter((s) => s.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticChargeSubscription: (state, action: PayloadAction<{ id: string; walletId?: string }>) => {
      const { id, walletId } = action.payload
      const sub = state.subscriptions.find((s) => s.id === id)
      if (sub) {
        sub.lastChargedAt = new Date().toISOString()
        const targetWallet = walletId || sub.walletId
        const amt = sub.amount || 0
        if (targetWallet) {
          const w = state.wallets.find((x) => x.id === targetWallet)
          if (w) w.balance = Math.max(0, w.balance - amt)
        }
        state.metrics.spentToday += amt
        state.metrics.spentThisMonth += amt
        state.transactions.unshift({
          id: `opt_sub_charge_${Date.now()}`,
          type: "expense",
          title: sub.title,
          detail: "Subscription Charge",
          time: "Just now",
          amount: amt,
          category: sub.category || "bills",
          wallet: targetWallet,
        })
      }
      saveCachedPosData(state)
    },

    optimisticAddPlannedPurchase: (state, action: PayloadAction<any>) => {
      const p = action.payload
      const id = p.id || `opt_pp_${Date.now()}`
      const formatted: PlannedPurchaseItem = {
        id,
        title: p.title || "Planned Item",
        estimatedAmount: Number(p.estimatedAmount) || 0,
        frequency: p.frequency || "once",
        category: p.category || "general",
        status: p.status || "planned",
        walletId: p.walletId,
        purchasedAt: p.purchasedAt,
        createdAt: p.createdAt || new Date().toISOString(),
      }
      const idx = state.plannedPurchases.findIndex((x) => x.id === id)
      if (idx >= 0) {
        state.plannedPurchases[idx] = formatted
      } else {
        state.plannedPurchases.unshift(formatted)
      }
      saveCachedPosData(state)
    },

    optimisticDeletePlannedPurchase: (state, action: PayloadAction<string>) => {
      state.plannedPurchases = state.plannedPurchases.filter((p) => p.id !== action.payload)
      saveCachedPosData(state)
    },

    optimisticCheckoutPlannedPurchase: (state, action: PayloadAction<{ id: string; payload: any }>) => {
      const { id, payload } = action.payload
      const item = state.plannedPurchases.find((p) => p.id === id)
      if (item) {
        item.status = "purchased"
        item.purchasedAt = new Date().toISOString()
        const amt = Number(payload.finalAmount ?? item.estimatedAmount) || 0
        const walletId = payload.walletId || item.walletId
        if (walletId) {
          const w = state.wallets.find((x) => x.id === walletId)
          if (w) w.balance = Math.max(0, w.balance - amt)
        }
        state.metrics.spentToday += amt
        state.metrics.spentThisMonth += amt
        state.transactions.unshift({
          id: `opt_pp_checkout_${Date.now()}`,
          type: "expense",
          title: item.title,
          detail: "Planned Purchase",
          time: "Just now",
          amount: amt,
          category: item.category || "shopping",
          wallet: walletId,
        })
      }
      saveCachedPosData(state)
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchPosData.pending, (state) => {
        state.isLoading = state.lastFetchedAt ? false : true
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

        state.transactions = (payload.transactions || []).map((t: any) => {
          let detail = t.person || t.note || ""
          if (typeof detail === "string") {
            if (detail.includes("__POS_META__") || detail.toLowerCase().includes("pos_meta") || detail.toLowerCase().includes("pos meta")) {
              try {
                const jsonPart = detail.replace(/.*?(__POS_META__|pos_meta|POS_META)/i, "")
                const parsed = JSON.parse(jsonPart)
                detail = parsed.text || parsed.note || parsed.title || ""
              } catch {
                detail = ""
              }
            } else if ((detail.startsWith("{") && detail.endsWith("}")) || (detail.startsWith("[") && detail.endsWith("]"))) {
              try {
                const parsed = JSON.parse(detail)
                detail = parsed.text || parsed.note || parsed.title || ""
              } catch {
                detail = ""
              }
            }
          }

          const lower = String(detail).trim().toLowerCase()
          if (
            !detail ||
            lower === "meta" ||
            lower === "pos meta" ||
            lower === "pos_meta" ||
            lower === "undefined" ||
            lower === "null" ||
            lower.startsWith("__pos_meta__")
          ) {
            detail = ""
          }

          if (!detail) {
            if (t.type === "transfer") {
              detail = "Account Transfer"
            } else {
              const matchedWallet = (payload.wallets || []).find((w: any) => w.id === t.walletId)
              detail = matchedWallet ? matchedWallet.name || matchedWallet.title : (t.category ? t.category.charAt(0).toUpperCase() + t.category.slice(1) : "Cash Account")
            }
          }

          return {
            id: t.id,
            type: t.type || "expense",
            title: t.title || (t.type === "transfer" ? "Account Transfer" : "Transaction"),
            detail,
            time: t.time || (t.date ? t.date : "Today"),
            amount: Number(t.amount) || 0,
            category: t.category || "general",
            wallet: t.walletId || t.wallet,
            fromWallet: t.fromWallet,
            toWallet: t.toWallet,
            debtId: t.debtId,
            goalId: t.goalId,
          }
        })

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

        // Save server snapshot to cache for instant 0ms launch on next reload
        saveCachedPosData(state)
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
        const existingIdx = state.transactions.findIndex((t) => t.id === formattedTx.id)
        if (existingIdx >= 0) {
          state.transactions[existingIdx] = formattedTx
        } else {
          state.transactions.unshift(formattedTx)
        }

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

export const {
  setOnlineStatus,
  clearNetworkError,
  resetDataState,
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
} = dataSlice.actions
export default dataSlice.reducer

