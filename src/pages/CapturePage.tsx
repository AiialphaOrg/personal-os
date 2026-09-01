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
  setDefaultWalletId,
  type CaptureType,
  type DebtKind,
} from "@/lib/storage"
import { toast } from "sonner"
import {
  Check,
  Calendar as CalendarIcon,
  Tag,
  Wallet,
  User,
  FileText,
  Utensils,
  Car,
  Smartphone,
  Briefcase,
  Store,
  TrendingUp,
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
    case "general":
    default:
      return <Tag className="size-3.5" />
  }
}

function getCategoryLabel(cat: string) {
  switch (cat) {
    case "food":
      return "Food"
    case "transport":
      return "Transport"
    case "data_airtime":
      return "Airtime & Data"
    case "salary":
      return "Salary"
    case "business":
      return "Business"
    case "investment":
      return "Investment"
    case "general":
    default:
      return "General"
  }
}


export function CapturePage() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const keyboardInset = useKeyboardInset()
  const mutations = usePosMutations()

  const rawType = (params.type || "expense") as CaptureType
  const pageTitle = getTitle(rawType)

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
  const [debtKind, setDebtKind] = useState<DebtKind>(
    () => (searchParams.get("debtKind") as DebtKind) || "loan"
  )
  const [debtSubType, setDebtSubType] = useState<"cash" | "credit">("cash")
  const [dueDate, setDueDate] = useState(() => searchParams.get("dueDate") || "")
  const [note, setNote] = useState(() => searchParams.get("note") || "")
  const [title] = useState(() => searchParams.get("title") || "")
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

    if ((rawType === "i_owe" || rawType === "owed_to_me") && !person.trim()) {
      setError("Please specify the person name")
      return
    }

    let itemTitle = title.trim()
    if (!itemTitle) {
      if (rawType === "transfer") {
        const fromW = wallets.find((w) => w.id === fromWallet)?.name || "Wallet"
        const toW = wallets.find((w) => w.id === toWallet)?.name || "Wallet"
        itemTitle = `Transfer: ${fromW} → ${toW}`
      } else if (rawType === "i_owe") {
        itemTitle =
          debtSubType === "credit"
            ? `Credit Purchase: ${category} (${person.trim()})`
            : `Borrowed from ${person.trim()}`
      } else if (rawType === "owed_to_me") {
        itemTitle =
          debtKind === "client"
            ? `Client Invoice: ${person.trim()}`
            : `Lent to ${person.trim()}`
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

    let finalNote = note.trim()
    if (totalCharge > 0) {
      const chargeMeta = JSON.stringify({
        text: finalNote,
        base: baseAmount,
        bankCharge,
        stampDuty: Number(amount) >= 10000 ? stampDuty : 0,
      })
      finalNote = `__POS_META__${chargeMeta}`
    }

    try {
      if (rawType === "i_owe" || rawType === "owed_to_me") {
        await mutations.addDebt.mutateAsync({
          person: person.trim(),
          amount: baseAmount,
          direction: rawType,
          kind: debtKind,
          dueDate,
          note: finalNote,
          walletId: debtSubType === "cash" ? walletId : undefined,
          isCashLoan: debtSubType === "cash",
          isCreditPurchase: debtSubType === "credit" && rawType === "i_owe",
          category,
        })
      } else {
        await mutations.addTransaction.mutateAsync({
          title: itemTitle,
          amount: finalAmount,
          type: rawType,
          category,
          walletId,
          fromWallet,
          toWallet,
          note: finalNote,
        })
      }

      toast.success(`${pageTitle} saved online`)
      navigate(-1)

    } catch (err: any) {
      setError(err.message || "Failed to save entry online")
    }
  }

  const categoryList: readonly string[] =
    rawType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div
      className="mx-auto max-w-lg pb-10 space-y-4"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Account / Wallet Selection with Shadcn Select */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Wallet className="size-4 text-primary" />
            <span>
              {rawType === "transfer"
                ? "Select Accounts"
                : rawType === "income"
                ? "Deposit Into"
                : rawType === "i_owe"
                ? debtSubType === "cash"
                  ? "Deposit Cash Loan Into"
                  : "Purchased on Credit (No wallet deduction)"
                : rawType === "owed_to_me"
                ? debtSubType === "cash"
                  ? "Lending Money From"
                  : "Client Work / Invoice"
                : "Paying From"}
            </span>
          </div>

          {rawType === "transfer" ? (
            <div className="grid grid-cols-2 gap-3 pt-0.5">
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
                  <SelectTrigger className="h-10 rounded-lg text-xs font-semibold">
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
                  <SelectTrigger className="h-10 rounded-lg text-xs font-semibold">
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
                <SelectTrigger className="h-10 rounded-lg text-xs font-semibold">
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
          )}
        </section>

        {/* 2. Amount Field: Clean, Large, Left-Aligned with Full-Width Grid Quick Numbers */}
        {rawType !== "task" && (
          <section className="rounded-lg border border-border bg-card p-4 text-left space-y-3 shadow-xs">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Amount
            </label>
            <div className="flex items-baseline text-left">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mr-1.5 select-none">
                {currency}
              </span>
              <FormattedNumberInput
                value={amount}
                onValueChange={setAmount}
                placeholder="0"
                autoFocus
                className="h-12 border-none bg-transparent text-left text-3xl sm:text-4xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-0 p-0 w-full"
              />
            </div>

            {/* Quick Amount Grid */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className="w-full rounded-md border border-border bg-muted/60 py-2 text-xs font-semibold tabular-nums text-foreground hover:bg-muted hover:border-foreground/20 active:scale-95 transition-all text-center shadow-2xs"
                  >
                    {currency}
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              {/* Bank Charges & Stamp Duty (Only for Bank Wallets) */}
              {isBankWallet && (rawType === "expense" || rawType === "transfer") && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Bank Charges
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
                        className={`rounded-md py-1.5 text-xs font-semibold transition-all border ${
                          bankCharge === chip.value
                            ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Stamp Duty only for transactions >= 10,000 */}
                  {Number(amount) >= 10000 && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Stamp Duty (≥ {currency}10,000)
                      </span>
                      <button
                        type="button"
                        onClick={() => setStampDuty((v) => (v === 50 ? 0 : 50))}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all border ${
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
            </div>
          </section>
        )}

        {/* 3. Category & Details Card (Clean Sheet of Paper, Less Rounded) */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-xs">
          {/* Category Selection (4 compact categories: General, Food, Transport, Airtime & Data) */}
          {(rawType === "expense" || rawType === "income") && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Tag className="size-4 text-primary" />
                <span>Category</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categoryList.map((c) => {
                  const selected = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-xs font-semibold transition-all ${
                        selected
                          ? "border-primary bg-primary/10 text-primary shadow-2xs font-bold"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={selected ? "text-primary" : "text-muted-foreground"}>
                          {getCategoryIcon(c)}
                        </span>
                        <span className="truncate">{getCategoryLabel(c)}</span>
                      </div>
                      {selected && <Check className="size-3.5 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}


          {/* Person Selection & Credit/Loan Choice (Payable / Receivable) */}
          {(rawType === "i_owe" || rawType === "owed_to_me") && (
            <div className="space-y-3.5">
              {/* How was this debt created? */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDebtSubType("cash")}
                    className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                      debtSubType === "cash"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rawType === "i_owe" ? "Cash/Bank Borrowed" : "Lent Cash/Transfer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtSubType("credit")}
                    className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                      debtSubType === "credit"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rawType === "i_owe" ? "Bought on Credit" : "Client Work/Invoice"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <User className="size-4 text-primary" />
                  <span>Person Name</span>
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
              </div>

              {rawType === "owed_to_me" && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Receivable Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "loan" as const, label: "I lent cash" },
                      { id: "client" as const, label: "Client invoice" },
                      { id: "personal" as const, label: "Other" },
                    ].map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setDebtKind(k.id)}
                        className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                          debtKind === k.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Due Date (Payable, Receivable, Bill) */}
          {(rawType === "i_owe" || rawType === "owed_to_me" || rawType === "bill") && (
            <div className="space-y-1.5 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CalendarIcon className="size-4 text-primary" />
                <span>Due Date (Optional)</span>
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 rounded-md text-xs"
              />
            </div>
          )}

          {/* Note & Reference */}
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileText className="size-4 text-primary" />
              <span>Note & Reference</span>
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add reference, receipt info, or notes..."
              className="h-10 rounded-md text-xs"
            />
          </div>
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
