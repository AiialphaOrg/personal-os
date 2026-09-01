/**
 * Core Financial Types & Domain Helper Calculations
 * Note: Data persistence and caching is 100% server-driven via TanStack Query and backend database.
 */

export type CaptureType =
  | "expense"
  | "income"
  | "task"
  | "transfer"
  | "bill"
  | "i_owe"
  | "owed_to_me"

export type DebtDirection = "i_owe" | "owed_to_me"
export type DebtKind = "loan" | "client" | "personal"
export type DebtStatus = "open" | "partial" | "paid"

export type ReminderKind = "bill" | "debt" | "task" | "custom" | "daily_review"

/** Spending = pay with; Savings = set aside; Investment = shares × price */
export type WalletKind = "spending" | "savings" | "investment"

export type WalletIcon = "cash" | "bank" | "savings" | "investment"

export interface TimelineItem {
  id: string
  type: CaptureType
  title: string
  detail: string
  time: string
  amount: number | null
  category: string
  wallet?: string
  fromWallet?: string
  toWallet?: string
  debtId?: string
  reminderId?: string
  goalId?: string
}

export interface WalletItem {
  id: string
  name: string
  balance: number
  kind: WalletKind
  icon: WalletIcon
  symbol?: string
  shares?: number
  lastPrice?: number
  lastPriceAt?: string
  lastPriceCurrency?: string
}

export interface DebtItem {
  id: string
  person: string
  amount: number
  remaining: number
  direction: DebtDirection
  kind: DebtKind
  dueDate?: string
  walletId?: string
  status: DebtStatus
  note?: string
  createdAt: string
}

export interface ReminderItem {
  id: string
  title: string
  dueAt: string
  kind: ReminderKind
  relatedId?: string
  enabled: boolean
  firedAt?: string
}

export interface GoalItem {
  id: string
  title: string
  target: number
  current: number
  category?: string
  deadline?: string
  walletId?: string
  createdAt: string
}

export interface SubscriptionItem {
  id: string
  title: string
  amount: number
  frequency: "weekly" | "monthly" | "yearly"
  billingDay?: number
  nextDue?: string
  walletId?: string
  category?: string
  enabled?: boolean
  lastChargedAt?: string
  createdAt?: string
}

export interface PlannedPurchaseItem {
  id: string
  title: string
  estimatedAmount: number
  frequency: "once" | "weekly" | "monthly"
  category: string
  status: "planned" | "purchased"
  walletId?: string
  purchasedAt?: string
  createdAt?: string
}


export const DEFAULT_WALLETS: WalletItem[] = [
  { id: "w-cash", name: "Cash Wallet", balance: 15000, kind: "spending", icon: "cash" },
  { id: "w-bank", name: "Bank Account", balance: 95000, kind: "spending", icon: "bank" },
  { id: "w-savings", name: "Emergency Savings", balance: 50000, kind: "savings", icon: "savings" },
]

export const DEFAULT_TIMELINE: TimelineItem[] = []
export const DEFAULT_DEBTS: DebtItem[] = []

export const EXPENSE_CATEGORIES = ["general", "food", "transport", "data_airtime"] as const
export const INCOME_CATEGORIES = ["salary", "business", "investment", "general"] as const

export const SUBSCRIPTION_CATEGORIES = [
  { id: "services", label: "Services" },
  { id: "utilities", label: "Utilities" },
  { id: "internet_data", label: "Internet & Data" },
  { id: "streaming", label: "Streaming" },
  { id: "general", label: "General" },
] as const

export const WISHLIST_CATEGORIES = [
  { id: "goods", label: "Goods" },
  { id: "food", label: "Food" },
  { id: "services", label: "Services" },
  { id: "general", label: "Other" },
] as const



// --- Financial Aggregations & Calculations ---

export function availableBalance(wallets: WalletItem[]): number {
  return wallets
    .filter((w) => w.kind === "spending")
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
}

export function savingsBalance(wallets: WalletItem[]): number {
  return wallets
    .filter((w) => w.kind === "savings")
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
}

export function investmentBalance(wallets: WalletItem[]): number {
  return wallets
    .filter((w) => w.kind === "investment")
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
}

export function totalDebtsOwedToMe(debts: DebtItem[]): number {
  return debts
    .filter((d) => d.direction === "owed_to_me" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.remaining) || 0), 0)
}

export function totalDebtsIOwe(debts: DebtItem[]): number {
  return debts
    .filter((d) => d.direction === "i_owe" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.remaining) || 0), 0)
}

export function debtTotals(debts: DebtItem[]): { iOwe: number; owedToMe: number } {
  return {
    iOwe: totalDebtsIOwe(debts),
    owedToMe: totalDebtsOwedToMe(debts),
  }
}


export function netWorth(wallets: WalletItem[], debts: DebtItem[]): number {
  const totalAssets = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
  const totalReceivables = totalDebtsOwedToMe(debts)
  const totalLiabilities = totalDebtsIOwe(debts)
  return totalAssets + totalReceivables - totalLiabilities
}

export function openDebts(debts: DebtItem[]): DebtItem[] {
  return debts.filter((d) => d.status !== "paid" && (Number(d.remaining) > 0 || d.remaining === undefined))
}

export function todayISODate(): string {
  return new Date().toISOString().split("T")[0]
}

// Daily Review UI state
export function isDailyReviewDone(dateStr = todayISODate()): boolean {
  try {
    return sessionStorage.getItem(`pos_review_${dateStr}`) === "1"
  } catch {
    return false
  }
}

export function markDailyReviewDone(dateStr = todayISODate()) {
  try {
    sessionStorage.setItem(`pos_review_${dateStr}`, "1")
  } catch {}
}

export function getDefaultWalletId(wallets?: WalletItem[]): string {
  try {
    const saved = localStorage.getItem("pos_default_wallet")
    if (saved && (!wallets || wallets.some((w) => w.id === saved))) return saved
  } catch {}
  if (wallets && wallets.length > 0) return wallets[0].id
  return "w-cash"
}

export function setDefaultWalletId(id: string) {
  try {
    localStorage.setItem("pos_default_wallet", id)
  } catch {}
}
