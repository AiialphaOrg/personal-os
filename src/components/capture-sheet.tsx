import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  setDefaultWalletId,
  todayISODate,
  type CaptureType,
  type DebtKind,
  type WalletItem,
} from "@/lib/storage"
import { store } from "@/store"
import { Check, ChevronDown } from "lucide-react"


const QUICK_AMOUNTS = [500, 1000, 2000, 5000]

export type CaptureSubmit = {
  id?: string
  type: CaptureType
  title: string
  amount: number | null
  walletId?: string
  fromWallet?: string
  toWallet?: string
  category: string
  person?: string
  debtKind?: DebtKind
  dueDate?: string
  note?: string
  expectLater?: boolean
}

type CaptureSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: CaptureType
  wallets: WalletItem[]
  currency: string
  /** Preferred starting wallet; falls back to saved default */
  defaultWalletId?: string
  presets?: {
    id?: string
    title?: string
    amount?: string
    fromWallet?: string
    toWallet?: string
    person?: string
    debtKind?: DebtKind
    dueDate?: string
    category?: string
    expectLater?: boolean
    walletId?: string
  }
  onSubmit: (data: CaptureSubmit) => void
}

function copyFor(type: CaptureType) {
  switch (type) {
    case "expense":
      return { title: "Expense", desc: "What did you spend?" }
    case "income":
      return { title: "Income", desc: "Money coming in" }
    case "transfer":
      return { title: "Transfer", desc: "Move between wallets" }
    case "i_owe":
      return { title: "Payable", desc: "Money owed to someone" }
    case "owed_to_me":
      return { title: "Receivable", desc: "Expected income or loan receivable" }
    case "bill":
      return { title: "Bill", desc: "Upcoming payment" }
    case "task":
      return { title: "Task", desc: "What needs doing?" }
    default:
      return { title: "Capture", desc: "" }
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>
}

function otherWallet(id: string, wallets: WalletItem[]) {
  return wallets.find((w) => w.id !== id)?.id || "cash"
}

/** Compact default wallet: show current, expand only to change */
function walletName(wallets: WalletItem[], id?: string): string {
  return wallets.find((w) => w.id === id)?.name || "Wallet"
}

function WalletPicker({
  label,
  wallets,
  value,
  onChange,
  persistDefault,
}: {
  label: string
  wallets: WalletItem[]
  value: string
  onChange: (id: string) => void
  persistDefault?: boolean
}) {
  const [open, setOpen] = useState(false)
  const name = walletName(wallets, value)


  const pick = (id: string) => {
    onChange(id)
    if (persistDefault) setDefaultWalletId(id)
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground"
      >
        <span>{name}</span>
        <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
          Change
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="flex gap-1.5 pt-0.5">
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => pick(w.id)}
              className={`h-9 flex-1 rounded-lg border text-xs font-medium ${
                value === w.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CaptureSheet({
  open,
  onOpenChange,
  type,
  wallets,
  currency,
  defaultWalletId,
  presets,
  onSubmit,
}: CaptureSheetProps) {
  const isMobile = useIsMobile()
  const copy = copyFor(type)
  const savedDefault = defaultWalletId || wallets[0]?.id || "w-cash"

  const [title, setTitle] = useState("")
  const [person, setPerson] = useState("")
  const [amount, setAmount] = useState("")
  const [bankCharge, setBankCharge] = useState<number>(0)
  const [stampDuty, setStampDuty] = useState<number>(0)
  const [walletId, setWalletId] = useState(savedDefault)
  const [fromWallet, setFromWallet] = useState(savedDefault)
  const [toWallet, setToWallet] = useState(() => otherWallet(savedDefault, wallets))
  const [category, setCategory] = useState("general")
  const [debtKind, setDebtKind] = useState<DebtKind>("personal")
  const [date, setDate] = useState(() => (type === "i_owe" || type === "owed_to_me" ? "" : todayISODate()))
  const [expectLater, setExpectLater] = useState(false)
  const [recentPeople, setRecentPeople] = useState<string[]>([])
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)
  const [error, setError] = useState("")

  const activeW = wallets.find((w) => w.id === (type === "transfer" ? fromWallet : walletId))
  const isBankWallet = Boolean(
    activeW && (
      activeW.name.toLowerCase().includes("bank") ||
      activeW.icon === "bank" ||
      activeW.id.includes("bank")
    )
  )

  useEffect(() => {
    if (!open) return
    const def = defaultWalletId || wallets[0]?.id || "w-cash"
    setTitle(presets?.title || "")
    setPerson(presets?.person || "")
    setAmount(presets?.amount || "")
    setBankCharge(0)
    setStampDuty(0)
    setWalletId(presets?.walletId || def)
    setFromWallet(presets?.fromWallet || def)
    setToWallet(presets?.toWallet || otherWallet(presets?.fromWallet || def, wallets))
    
    if (type === "i_owe" || type === "owed_to_me") {
      const debts = store.getState().data.debts
      const uniquePeople = Array.from(new Set(debts.map((d: any) => d.person).filter(Boolean))) as string[]
      setRecentPeople(uniquePeople)
    }

    setCategory(presets?.category || (type === "income" ? "salary" : "general"))
    setDebtKind(presets?.debtKind || (type === "owed_to_me" ? "client" : "personal"))
    setDate(presets?.dueDate || (type === "i_owe" || type === "owed_to_me" ? "" : todayISODate()))
    setExpectLater(Boolean(presets?.expectLater))
    setError("")
  }, [open, type, presets, defaultWalletId, wallets])


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const when = date ? date : (type === "i_owe" || type === "owed_to_me" ? undefined : todayISODate())

    if (type === "task") {
      if (!title.trim()) {
        setError("Add a task title.")
        return
      }
      onSubmit({
        id: presets?.id,
        type: "task",
        title: title.trim(),
        amount: null,
        category: "work",
        dueDate: when,
      })
      onOpenChange(false)
      return
    }

    const amountVal = Number(amount)
    if (!amount || Number.isNaN(amountVal) || amountVal <= 0) {
      setError("Enter a valid amount.")
      return
    }

    const totalCharge = isBankWallet && (type === "expense" || type === "transfer")
      ? bankCharge + (Number(amount) >= 10000 ? stampDuty : 0)
      : 0
    const finalAmount = amountVal + totalCharge

    let finalNote = ""
    if (totalCharge > 0) {
      finalNote = `__POS_META__${JSON.stringify({
        base: amountVal,
        bankCharge,
        stampDuty: Number(amount) >= 10000 ? stampDuty : 0,
      })}`
    }


    if (type === "transfer") {
      if (fromWallet === toWallet) {
        setError("Pick two different wallets.")
        return
      }
      const source = wallets.find((w) => w.id === fromWallet)
      if (!source || source.balance < finalAmount) {
        setError("Not enough balance in the source wallet.")
        return
      }
      onSubmit({
        id: presets?.id,
        type: "transfer",
        title: title.trim() || "Transfer",
        amount: finalAmount,
        fromWallet,
        toWallet,
        category: "transfer",
        dueDate: when,
        note: finalNote,
      })
      onOpenChange(false)
      return
    }



    if (type === "i_owe" || type === "owed_to_me") {
      const who = person.trim()
      if (!who) {
        setError("Add a name.")
        return
      }
      if (type === "owed_to_me" && debtKind === "loan") {
        const source = wallets.find((w) => w.id === walletId)
        if (!source || source.balance < amountVal) {
          setError("Not enough balance to lend.")
          return
        }
      }
      onSubmit({
        id: presets?.id,
        type: type,
        title: who,
        person: who,
        amount: amountVal,
        walletId: type === "owed_to_me" && debtKind === "loan" ? walletId : undefined,
        category: debtKind,
        debtKind,
        dueDate: when,
        expectLater,
      })
      onOpenChange(false)
      return
    }

    if (type === "income" && expectLater) {
      onSubmit({
        id: presets?.id,
        type: "income",
        title: title.trim() || person.trim() || "Expected income",
        person: person.trim() || title.trim() || "Client",
        amount: amountVal,
        walletId,
        category: category || "client",
        dueDate: when,
        expectLater: true,
      })
      onOpenChange(false)
      return
    }

    if (type === "expense") {
      const source = wallets.find((w) => w.id === walletId)
      if (!source || source.balance < finalAmount) {
        setError("Not enough balance in this wallet.")
        return
      }
    }

    onSubmit({
      id: presets?.id,
      type,
      title: title.trim() || category.charAt(0).toUpperCase() + category.slice(1),
      amount: finalAmount,
      walletId,
      category,
      dueDate: when,
      note: finalNote,
    })
    onOpenChange(false)

  }

  const submitLabel =
    type === "transfer"
      ? "Move money"
      : type === "task"
        ? "Add task"
        : type === "owed_to_me" && debtKind === "loan"
          ? "Lend"
          : "Save"

  const needsWallet =
    type === "expense" ||
    type === "income" ||
    type === "bill" ||
    (type === "owed_to_me" && debtKind === "loan")

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent
        className={
          isMobile
            ? "max-h-[90vh] outline-none"
            : "h-full max-h-none w-full max-w-md outline-none rounded-none border-l"
        }
      >
        {!isMobile && (
          <div className="sr-only">
            {/* hide bottom drag handle styles; right drawer has no handle bar */}
          </div>
        )}

        <DrawerHeader className="px-5 py-3.5">
          <DrawerTitle className="text-base font-bold tracking-tight">
            {presets?.id ? "Edit " : "Add "}
            {copy.title.toLowerCase()}
          </DrawerTitle>
          {copy.desc ? (
            <DrawerDescription className="text-xs text-muted-foreground">
              {copy.desc}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4 pb-2"
        >
          <div className="space-y-3.5">
            {type !== "task" && (
              <div className="space-y-1.5">
                <FieldLabel>Amount</FieldLabel>
                <FormattedNumberInput
                  value={amount}
                  onValueChange={setAmount}
                  prefix={currency}
                  placeholder="0"
                  autoFocus
                  className="h-10 rounded-lg border-border bg-background text-base font-semibold tabular-nums"
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums"
                    >
                      {currency}
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Bank Charges & Stamp Duty for Bank Wallet */}
                {isBankWallet && (type === "expense" || type === "transfer") && (
                  <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Bank Charges</FieldLabel>
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
                              ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {Number(amount) >= 10000 && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Stamp Duty (≥ {currency}10,000)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStampDuty((v) => (v === 50 ? 0 : 50))}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all border ${
                            stampDuty === 50
                              ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
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
            )}


            {type === "transfer" && (
              <>
                <WalletPicker
                  label="From"
                  wallets={wallets}
                  value={fromWallet}
                  onChange={(id) => {
                    setFromWallet(id)
                    if (id === toWallet) setToWallet(otherWallet(id, wallets))
                  }}
                  persistDefault
                />
                <WalletPicker
                  label="To"
                  wallets={wallets}
                  value={toWallet}
                  onChange={setToWallet}
                />
              </>
            )}

            {needsWallet && (
              <WalletPicker
                label={type === "owed_to_me" ? "Lend from" : "Wallet"}
                wallets={wallets}
                value={walletId}
                onChange={setWalletId}
                persistDefault
              />
            )}

            {(type === "i_owe" || type === "owed_to_me") && (
              <>
                <div className="space-y-1.5 relative">
                  <FieldLabel>Person</FieldLabel>
                  <Input
                    value={person}
                    onChange={(e) => {
                      setPerson(e.target.value)
                      setShowPersonSuggestions(true)
                    }}
                    onFocus={() => setShowPersonSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
                    placeholder="Name"
                    autoComplete="off"
                    className="h-10 rounded-lg"
                  />
                  {showPersonSuggestions && recentPeople.filter(p => p.toLowerCase().includes(person.toLowerCase()) && p !== person).length > 0 && (
                    <div className="absolute z-50 top-[60px] left-0 right-0 max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
                      {recentPeople.filter(p => p.toLowerCase().includes(person.toLowerCase()) && p !== person).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { 
                            setPerson(p)
                            setShowPersonSuggestions(false)
                          }}
                          className="w-full text-left rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {type === "income" && (
              <button
                type="button"
                onClick={() => setExpectLater((v) => !v)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                  expectLater ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">Expect later</p>
                  <p className="text-[11px] text-muted-foreground">Track as receivable</p>
                </div>
                <span
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    expectLater
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {expectLater ? <Check className="size-2.5" strokeWidth={3} /> : null}
                </span>
              </button>
            )}

            {(type === "expense" || type === "income") && (
              <div className="space-y-1.5">
                <FieldLabel>Category</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((catName) => {
                    const c = catName as string
                    const label =
                      c === "data_airtime"
                        ? "Airtime & Data"
                        : c === "food"
                        ? "Food"
                        : c === "transport"
                        ? "Transport"
                        : c === "general"
                        ? "General"
                        : c.charAt(0).toUpperCase() + c.slice(1)
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`rounded-lg border px-2.5 py-2 text-xs font-semibold capitalize transition-all ${
                          category === c
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}



            <div className="space-y-1.5">
              <FieldLabel>
                {type === "i_owe" || type === "owed_to_me"
                  ? "Due date (optional)"
                  : type === "bill" || type === "task"
                    ? "Due date"
                    : "Date"}
              </FieldLabel>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-lg"
              />
              <p className="text-[11px] text-muted-foreground">
                {type === "i_owe" || type === "owed_to_me"
                  ? "Optional — leave blank if no specific due date"
                  : "Defaults to today"}
              </p>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>
                {type === "task"
                  ? "Task"
                  : type === "i_owe" || type === "owed_to_me" || type === "transfer"
                    ? "Note (optional)"
                    : "Title"}
              </FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "task"
                    ? "e.g. Call bank"
                    : type === "transfer"
                      ? "Optional"
                      : type === "bill"
                        ? "e.g. Internet"
                        : type === "i_owe" || type === "owed_to_me"
                          ? "Optional"
                          : "e.g. Coffee"
                }
                required={type === "task"}
                className="h-10 rounded-lg"
                autoFocus={type === "task"}
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>

          <DrawerFooter className="mt-auto gap-2 px-0 pt-6 pb-5">
            <Button
              className="h-12 w-full rounded-xl text-base font-semibold shadow-sm"
              onClick={handleSubmit}
            >
              {presets?.id ? "Save changes" : submitLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
