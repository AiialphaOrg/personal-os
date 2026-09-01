/**
 * Personal OS API & Auth Client
 * Single Source of Truth backend connection wrapper.
 */

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000"
const API_BASE_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`


export interface UserSession {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem("pos_auth_token")
  } catch {
    return null
  }
}

export function setStoredSession(token: string, user: UserSession) {
  try {
    localStorage.setItem("pos_auth_token", token)
    localStorage.setItem("pos_user_session", JSON.stringify(user))
    if (user.name) {
      localStorage.setItem("pos_user_name", user.name)
    }
  } catch {}
}

export function clearStoredSession() {
  try {
    localStorage.removeItem("pos_auth_token")
    localStorage.removeItem("pos_user_session")
  } catch {}
}

export function getStoredUser(): UserSession | null {
  try {
    const raw = localStorage.getItem("pos_user_session")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export class NetworkError extends Error {
  constructor(message = "Network not available") {
    super(message)
    this.name = "NetworkError"
  }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})
  headers.set("Content-Type", "application/json")
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || `API Error ${res.status}: ${res.statusText}`)
    }

    return json as T
  } catch (err: any) {
    if (err.name === "TypeError" || err.message?.includes("fetch") || err.message?.includes("Network")) {
      throw new NetworkError("Network not available. Please check your connection.")
    }
    throw err
  }
}

/** AUTH APIs */
export async function sendAuthCode(email: string) {
  return apiFetch<{ ok: boolean; message: string; debugCode?: string }>("/auth/send-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function verifyAuthCode(email: string, code: string) {
  const res = await apiFetch<{ ok: boolean; token: string; user: UserSession }>("/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  })
  if (res.token && res.user) {
    setStoredSession(res.token, res.user)
  }
  return res
}

export async function loginWithGoogle(email?: string, name?: string) {
  const res = await apiFetch<{ ok: boolean; token: string; user: UserSession }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ email: email || "user@gmail.com", name: name || "Google User" }),
  })
  if (res.token && res.user) {
    setStoredSession(res.token, res.user)
  }
  return res
}

export async function registerWithEmail(email: string, password?: string, name?: string) {
  const res = await apiFetch<{ ok: boolean; token: string; user: UserSession }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: password || "password123", name }),
  })
  if (res.token && res.user) {
    setStoredSession(res.token, res.user)
  }
  return res
}

export async function loginWithEmail(email: string, password?: string) {
  const res = await apiFetch<{ ok: boolean; token: string; user: UserSession }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: password || "password123" }),
  })
  if (res.token && res.user) {
    setStoredSession(res.token, res.user)
  }
  return res
}


export async function fetchCurrentUser() {
  return apiFetch<{ ok: boolean; user: UserSession }>("/auth/me")
}

/** DATA APIs */
export async function fetchAllData() {
  return apiFetch<{
    ok: boolean
    metrics?: {
      spentToday: number
      inflowToday: number
      spentThisMonth: number
      inflowThisMonth: number
      todayDate: string
      currentMonth: string
    }
    wallets: any[]
    transactions: any[]
    debts: any[]
    goals: any[]
    tasks: any[]
    subscriptions?: any[]
    plannedPurchases?: any[]
  }>("/data/all")
}



export async function createOrUpdateWalletApi(wallet: any) {
  return apiFetch<{ ok: boolean; wallet: any }>("/data/wallets", {
    method: "POST",
    body: JSON.stringify(wallet),
  })
}

export async function deleteWalletApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/wallets/${id}`, {
    method: "DELETE",
  })
}

export async function createTransactionApi(tx: any) {
  return apiFetch<{ ok: boolean; transaction: any }>("/data/transactions", {
    method: "POST",
    body: JSON.stringify(tx),
  })
}

export async function deleteTransactionApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/transactions/${id}`, {
    method: "DELETE",
  })
}

export async function createOrUpdateDebtApi(debt: any) {
  return apiFetch<{ ok: boolean; debt: any; wallets?: any[] }>("/data/debts", {
    method: "POST",
    body: JSON.stringify(debt),
  })
}

export async function settleDebtApi(id: string, amount: number, walletId?: string) {
  return apiFetch<{ ok: boolean; debt: any; wallets?: any[]; transactions?: any[] }>(
    `/data/debts/${id}/settle`,
    {
      method: "POST",
      body: JSON.stringify({ amount, walletId }),
    }
  )
}

export async function deleteDebtApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/debts/${id}`, {
    method: "DELETE",
  })
}


export async function createOrUpdateGoalApi(goal: any) {
  return apiFetch<{ ok: boolean; goal: any }>("/data/goals", {
    method: "POST",
    body: JSON.stringify(goal),
  })
}

export async function deleteGoalApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/goals/${id}`, {
    method: "DELETE",
  })
}

export async function createTaskApi(task: any) {
  return apiFetch<{ ok: boolean; task: any }>("/data/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  })
}

export async function toggleTaskApi(id: string) {
  return apiFetch<{ ok: boolean; task: any }>(`/data/tasks/${id}/toggle`, {
    method: "PATCH",
  })
}

export async function deleteTaskApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/tasks/${id}`, {
    method: "DELETE",
  })
}

export interface PaginatedTransactionsParams {
  cursor?: string
  limit?: number
  type?: string
  category?: string
  month?: string
  search?: string
}

export async function fetchTransactionsPaginatedApi(params: PaginatedTransactionsParams = {}) {
  const query = new URLSearchParams()
  if (params.cursor) query.set("cursor", params.cursor)
  if (params.limit) query.set("limit", String(params.limit))
  if (params.type && params.type !== "all") query.set("type", params.type)
  if (params.category && params.category !== "all") query.set("category", params.category)
  if (params.month) query.set("month", params.month)
  if (params.search) query.set("search", params.search)

  const qs = query.toString() ? `?${query.toString()}` : ""
  return apiFetch<{
    ok: boolean
    transactions: any[]
    nextCursor: string | null
    hasMore: boolean
  }>(`/data/transactions${qs}`)
}

export interface FinancialAiOverview {
  headline: string
  healthScore: number
  sentiment: "positive" | "caution" | "warning"
  summary: string
  keyTakeaways: string[]
  recommendation: string
}

export async function fetchInsightsSummaryApi(month?: string) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ""
  return apiFetch<{
    ok: boolean
    month: string
    income: number
    expenses: number
    netSavings: number
    categories: Array<{ category: string; total: number; count: number }>
    aiOverview?: FinancialAiOverview
  }>(`/data/insights${qs}`)
}

export async function createOrUpdateSubscriptionApi(sub: any) {
  return apiFetch<{ ok: boolean; subscription: any }>("/data/subscriptions", {
    method: "POST",
    body: JSON.stringify(sub),
  })
}

export async function deleteSubscriptionApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/subscriptions/${id}`, {
    method: "DELETE",
  })
}

export async function chargeSubscriptionApi(id: string, walletId?: string) {
  return apiFetch<{ ok: boolean; transaction: any }>(`/data/subscriptions/${id}/charge`, {
    method: "POST",
    body: JSON.stringify({ walletId }),
  })
}

export async function createOrUpdatePlannedPurchaseApi(item: any) {
  return apiFetch<{ ok: boolean; plannedPurchase: any }>("/data/planned-purchases", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function deletePlannedPurchaseApi(id: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/data/planned-purchases/${id}`, {
    method: "DELETE",
  })
}

export async function checkoutPlannedPurchaseApi(id: string, payload: {
  paymentMethod: "cash" | "credit"
  actualAmount?: number
  walletId?: string
  person?: string
  dueDate?: string
}) {
  return apiFetch<{ ok: boolean; plannedPurchase: any; transaction?: any; debt?: any }>(
    `/data/planned-purchases/${id}/checkout`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}




