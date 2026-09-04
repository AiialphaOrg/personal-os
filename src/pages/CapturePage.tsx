import { useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router"
import { useHeader } from "@/hooks/use-header"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QUICK_EXPENSE_TAGS,
  QUICK_INCOME_TAGS,
  QUICK_DEBT_TAGS,
  formatCategoryLabel,
  setDefaultWalletId,
  type CaptureType,
  type DebtKind,
} from "@/lib/storage"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Tag,
  Wallet,
  User,
  Utensils,
  Car,
  Smartphone,
  Briefcase,
  Store,
  TrendingUp,
  ShoppingBag,
} from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { usePosMutations } from "@/hooks/use-pos-query"

function getTitle(type: string): string {
  switch (type) {
    case "expense":
      return "Add Expense"
    case "income":
      return "Add Income"
    case "transfer":
      return "Transfer Funds"
    case "i_owe":
      return "Add Payable"
    case "owed_to_me":
      return "Add Receivable"
    case "bill":
      return "Add Bill"
    case "task":
      return "Add Task"
    default:
      return "Log Entry"
  }
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000]

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "food":
      return <Utensils className="size-3.5" />
    case "transport":
      return <Car className="size-3.5" />
    case "data_airtime":
      return <Smartphone className="size-3.5" />
    case "salary":
      return <Briefcase className="size-3.5" />
    case "business":
      return <Store className="size-3.5" />
    case "investment":
      return <TrendingUp className="size-3.5" />
    case "shopping":
      return <ShoppingBag className="size-3.5" />
    case "general":
    default:
      return <Tag className="size-3.5" />
  }
}

function getCategoryLabel(cat: string) {
  return formatCategoryLabel(cat)
}


export function CapturePage() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const keyboardInset = useKeyboardInset()
  const mutations = usePosMutations()

  const rawType = (params.type || "expense") as CaptureType
  const isDebtMode = rawType === "i_owe" || rawType === "owed_to_me" || (rawType as string) === "debt"
  const [debtDirection, setDebtDirection] = useState<"i_owe" | "owed_to_me">(() => {
    if (rawType === "owed_to_me") return "owed_to_me"
    return "i_owe"
  })

  const pageTitle = isDebtMode
    ? debtDirection === "i_owe"
      ? "Add Payable (I Owe)"
      : "Add Receivable (Owed to Me)"
    : getTitle(rawType)

  useHeader({ title: pageTitle })

  const currency = localStorage.getItem("pos_currency") || "₦"
  const wallets = useAppSelector((state) => state.data.wallets)
  const debts = useAppSelector((state) => state.data.debts)

  const [amount, setAmount] = useState(() => searchParams.get("amount") || "")
  const [bankCharge, setBankCharge] = useState<number>(0)
  const [stampDuty, setStampDuty] = useState<number>(0)

  const [walletId, setWalletId] = useState(
    () => searchParams.get("walletId") || wallets[0]?.id || "w-cash"
  )
  const [fromWallet, setFromWallet] = useState(
    () => searchParams.get("fromWallet") || wallets[0]?.id || "w-cash"
  )
  const [toWallet, setToWallet] = useState(() => {
    const defaultFrom = wallets[0]?.id || "w-cash"
    return (
      searchParams.get("toWallet") ||
      wallets.find((w) => w.id !== defaultFrom)?.id ||
      wallets[1]?.id ||
      "w-bank"
    )
  })

  const [category, setCategory] = useState<string>(() => {
    const paramCat = searchParams.get("category")
    if (paramCat) return paramCat
    return "general"
  })

  const selectedWallet = wallets.find((w) => w.id === (rawType === "transfer" ? fromWallet : walletId))
  const isBankWallet = Boolean(
    selectedWallet && (
      selectedWallet.name.toLowerCase().includes("bank") ||
      selectedWallet.icon === "bank" ||
      selectedWallet.id.includes("bank")
    )
  )



  const [person, setPerson] = useState(() => searchParams.get("person") || "")
  const debtKind: DebtKind = (searchParams.get("debtKind") as DebtKind) || "loan"
  const [dueDate, setDueDate] = useState(() => searchParams.get("dueDate") || "")
  const [title, setTitle] = useState(() => searchParams.get("title") || "")
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)
  const [error, setError] = useState("")

  const recentPeople = Array.from(new Set(debts.map((d) => d.person))).filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const numAmt = amount === "" ? null : Number(amount)
    if (rawType !== "task" && (numAmt === null || !Number.isFinite(numAmt) || numAmt <= 0)) {
      setError("Please enter a valid amount greater than 0")
      return
    }

    if (isDebtMode && !person.trim()) {
      setError("Please specify the person name")
      return
    }

    let itemTitle = title.trim()
    if (!itemTitle) {
      if (rawType === "transfer") {
        const fromW = wallets.find((w) => w.id === fromWallet)?.name || "Wallet"
        const toW = wallets.find((w) => w.id === toWallet)?.name || "Wallet"
        itemTitle = `Transfer: ${fromW} → ${toW}`
      } else if (isDebtMode) {
        itemTitle = debtDirection === "i_owe"
          ? `Payable: ${person.trim()}`
          : `Receivable: ${person.trim()}`
      } else {
        itemTitle = category.charAt(0).toUpperCase() + category.slice(1)
      }
    }

    if (rawType === "expense" || rawType === "income") {
      setDefaultWalletId(walletId)
    } else if (rawType === "transfer") {
      setDefaultWalletId(fromWallet)
    }

    const totalCharge = isBankWallet && (rawType === "expense" || rawType === "transfer")
      ? bankCharge + (Number(amount) >= 10000 ? stampDuty : 0)
      : 0
    const baseAmount = numAmt || 0
    const finalAmount = baseAmount + totalCharge

    let finalNote = ""
    if (totalCharge > 0) {
      const chargeMeta = JSON.stringify({
        base: baseAmount,
        bankCharge,
        stampDuty: Number(amount) >= 10000 ? stampDuty : 0,
      })
      finalNote = `__POS_META__${chargeMeta}`
    }

    try {
      if (isDebtMode) {
        mutations.addDebt.mutateAsync({
          person: person.trim(),
          amount: baseAmount,
          direction: debtDirection,
          kind: debtKind,
          dueDate: dueDate || undefined,
          note: title.trim() || undefined,
          walletId: walletId || undefined,
          isCashLoan: true,
          category,
        }).catch((err: any) => {
          toast.error(err.message || "Failed to sync debt with server")
        })
      } else {
        mutations.addTransaction.mutateAsync({
          title: itemTitle,
          amount: finalAmount,
          type: rawType,
          category,
          walletId,
          fromWallet,
          toWallet,
          note: finalNote,
        }).catch((err: any) => {
          toast.error(err.message || "Failed to sync transaction with server")
        })
      }

      toast.success(`${pageTitle} saved`)
      navigate(-1)

    } catch (err: any) {
      setError(err.message || "Failed to save entry")
    }
  }

  const categoryList: readonly string[] =
    rawType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div
      className=" pb-10 space-y-4"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      <form onSubmit={handleSubmit} className="space-y-3 max-w-lg mx-auto">
        {/* Debt Direction 2-Way Segmented Control */}
        {isDebtMode && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl border border-border shadow-2xs">
            <button
              type="button"
              onClick={() => setDebtDirection("i_owe")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                debtDirection === "i_owe"
                  ? "bg-card text-foreground font-bold shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I Owe (Payable)
            </button>
            <button
              type="button"
              onClick={() => setDebtDirection("owed_to_me")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                debtDirection === "owed_to_me"
                  ? "bg-card text-foreground font-bold shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Owed to Me (Receivable)
            </button>
          </div>
        )}

        {/* 1. Account / Wallet Selection with Shadcn Select */}
        <section className="rounded-lg border border-border bg-card p-3.5 sm:p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Wallet className="size-4 text-primary" />
            <span>
              {rawType === "transfer"
                ? "Select Accounts"
                : rawType === "income"
                ? "Deposit Into"
                : isDebtMode
                ? debtDirection === "i_owe"
                  ? "Wallet / Account (Optional)"
                  : "Lending From Wallet"
                : "Paying From"}
            </span>
          </div>

          {rawType === "transfer" ? (
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  From Wallet
                </label>
                <Select
                  value={fromWallet}
                  onValueChange={(val) => {
                    setFromWallet(val)
                    if (val === toWallet) {
                      setToWallet(wallets.find((w) => w.id !== val)?.id || "")
                    }
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({currency}{w.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  To Wallet
                </label>
                <Select value={toWallet} onValueChange={setToWallet}>
                  <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets
                      .filter((w) => w.id !== fromWallet)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({currency}{w.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="pt-0.5">
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {wallets
                    .filter((w) => w.kind !== "investment")
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({currency}{w.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        {/* 2. Amount Section */}
        <section className="rounded-lg border border-border bg-card p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isDebtMode ? "Debt Amount" : "Amount"}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-lg font-bold text-muted-foreground pointer-events-none">
                {currency}
              </span>
              <FormattedNumberInput
                value={amount}
                onValueChange={(val) => setAmount(val)}
                placeholder="0.00"
                autoFocus
                className="h-12 pl-8 text-xl sm:text-2xl font-bold tracking-tight rounded-md"
              />
            </div>
          </div>

          {/* Quick Amounts - 2 Rows */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className="rounded-lg py-1.5 text-xs font-semibold transition-all border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
              >
                {currency}{val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Bank Charges if paying from bank */}
          {isBankWallet && (rawType === "expense" || rawType === "transfer") && (
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Bank Transfer Charge
                </span>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {bankCharge > 0 ? `+${currency}${bankCharge}` : "None"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "None", value: 0 },
                  { label: `+${currency}10`, value: 10 },
                  { label: `+${currency}25`, value: 25 },
                  { label: `+${currency}50`, value: 50 },
                ].map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setBankCharge(chip.value)}
                    className={`rounded-md py-1 text-xs font-semibold transition-all border ${
                      bankCharge === chip.value
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                        : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {Number(amount) >= 10000 && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Stamp Duty (≥ {currency}10,000)
                  </span>
                  <button
                    type="button"
                    onClick={() => setStampDuty((v) => (v === 50 ? 0 : 50))}
                    className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all border ${
                      stampDuty === 50
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                        : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {stampDuty === 50 ? `+${currency}50 Applied` : `+${currency}50 (None)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. Category & Details Card */}
        <section className="rounded-lg border border-border bg-card p-3.5 sm:p-4 space-y-3 shadow-xs">
          {/* Category Selection for expense/income */}
          {(rawType === "expense" || rawType === "income") && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Tag className="size-4 text-primary" />
                <span>Category</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {categoryList.slice(0, 8).map((catName) => {
                  const isSelected = category === catName
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setCategory(catName)}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {getCategoryIcon(catName)}
                      <span className="truncate">{getCategoryLabel(catName)}</span>
                    </button>
                  )
                })}
              </div>

              {/* 1-Tap Quick Tags for Everyday Expenses */}
              {rawType === "expense" && QUICK_EXPENSE_TAGS[category] && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">What's it for? (1-tap to set):</span>
                    {title && (
                      <button
                        type="button"
                        onClick={() => setTitle("")}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_EXPENSE_TAGS[category].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTitle(title === tag ? "" : tag)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                          title === tag
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1-Tap Quick Tags for Income */}
              {rawType === "income" && QUICK_INCOME_TAGS[category] && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">What's it for? (1-tap to set):</span>
                    {title && (
                      <button
                        type="button"
                        onClick={() => setTitle("")}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_INCOME_TAGS[category].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTitle(title === tag ? "" : tag)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                          title === tag
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Person Selection (Simplified for Debt) */}
          {isDebtMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <User className="size-4 text-primary" />
                <span>{debtDirection === "i_owe" ? "Who do you owe?" : "Who owes you?"}</span>
              </div>
              <div className="relative">
                <Input
                  value={person}
                  onChange={(e) => {
                    setPerson(e.target.value)
                    setShowPersonSuggestions(true)
                  }}
                  onFocus={() => setShowPersonSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
                  placeholder="e.g. Ahmad, Sarah, Musa"
                  autoComplete="off"
                  className="h-10 rounded-md text-xs font-medium"
                />
                {showPersonSuggestions &&
                  recentPeople.filter(
                    (p) =>
                      p.toLowerCase().includes(person.toLowerCase()) && p !== person
                  ).length > 0 && (
                    <div className="absolute z-50 top-11 left-0 right-0 max-h-40 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                      {recentPeople
                        .filter(
                          (p) =>
                            p.toLowerCase().includes(person.toLowerCase()) && p !== person
                        )
                        .map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPerson(p)
                              setShowPersonSuggestions(false)
                            }}
                            className="w-full rounded px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                          >
                            {p}
                          </button>
                        ))}
                    </div>
                  )}
              </div>

              {/* 1-tap Recent Person Pills */}
              {recentPeople.length > 0 && !person && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Recent:</span>
                  {recentPeople.slice(0, 4).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPerson(p)}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* 1-Tap Quick Tags for Debt (Payable / Receivable) */}
              {QUICK_DEBT_TAGS[debtDirection] && (
                <div className="space-y-1 pt-1.5 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      What was it for? (1-tap to set):
                    </span>
                    {title && (
                      <button
                        type="button"
                        onClick={() => setTitle("")}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_DEBT_TAGS[debtDirection].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTitle(title === tag ? "" : tag)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                          title === tag
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs font-bold"
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Due Date (Payable, Receivable, Bill) */}
          {(isDebtMode || rawType === "bill") && (
            <div className="space-y-1 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CalendarIcon className="size-4 text-primary" />
                <span>Due Date (Optional)</span>
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 rounded-md text-xs"
              />
            </div>
          )}

          {/* Title / Description */}
          {rawType !== "transfer" && (
            <div className="space-y-1 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Tag className="size-4 text-primary" />
                  <span>
                    {rawType === "expense" || rawType === "income" || isDebtMode
                      ? "What was it for? (Optional)"
                      : rawType === "bill"
                      ? "Bill Name"
                      : "Title / Narration"}
                  </span>
                </div>
                {title && (
                  <button
                    type="button"
                    onClick={() => setTitle("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  rawType === "income"
                    ? `Leave blank for "${getCategoryLabel(category)}" or type note`
                    : rawType === "bill"
                    ? "e.g. Internet subscription, Electricity"
                    : isDebtMode
                    ? debtDirection === "i_owe"
                      ? "e.g. Borrowed cash, Dinner, Fuel"
                      : "e.g. Lent cash, Project balance, Invoice"
                    : `Leave blank for "${getCategoryLabel(category)}" or type specific item`
                }
                className="h-9 rounded-md text-xs font-medium"
              />
              {(rawType === "expense" || rawType === "income") && (
                <p className="text-[11px] text-muted-foreground">
                  {title.trim()
                    ? `Saved as: "${title.trim()}" (${getCategoryLabel(category)})`
                    : `Will automatically be saved as: "${getCategoryLabel(category)}"`}
                </p>
              )}
              {isDebtMode && (
                <p className="text-[11px] text-muted-foreground">
                  {title.trim()
                    ? `Saved reason: "${title.trim()}"`
                    : `Optional reason or note for this ${debtDirection === "i_owe" ? "payable" : "receivable"}`}
                </p>
              )}
            </div>
          )}
        </section>

        {error && (
          <p className="text-center text-xs font-semibold text-destructive">{error}</p>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={mutations.addTransaction.isPending || mutations.addDebt.isPending}
          className="h-11 w-full rounded-md text-sm font-bold shadow-xs transition-transform active:scale-[0.99]"
        >
          {mutations.addTransaction.isPending || mutations.addDebt.isPending
            ? "Saving Online..."
            : `Save ${pageTitle.replace("Add ", "")}`}
        </Button>
      </form>
    </div>
  )
}
