import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Sun,
  Coins,
  Wallet,
  TrendingUp,
  Sliders,
  Bell,
  Fingerprint,
  Check,
  ChevronRight,
  Activity,
} from "lucide-react"

import { enrollBiometrics } from "@/lib/biometric"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"

const TOTAL_STEPS = 8

export function OnboardingPage() {
  const navigate = useNavigate()
  const keyboardInset = useKeyboardInset()
  const [step, setStep] = useState(1)

  const [currency, setCurrency] = useState("₦")
  const [wallets, setWallets] = useState({
    cash: true,
    bank: false,
    savings: false,
  })
  const [hasBudget, setHasBudget] = useState(true)
  const [budgetValue, setBudgetValue] = useState("100000")
  const [notifications, setNotifications] = useState({
    dailyReview: true,
    bills: true,
    tasks: false,
  })
  const [biometricsEnabled, setBiometricsEnabled] = useState(false)
  const [biometricsScanning, setBiometricsScanning] = useState(false)

  const finish = () => {
    localStorage.setItem("pos_onboarded", "true")
    localStorage.setItem("pos_currency", currency)
    navigate("/home")
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1)
    else finish()
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const toggleWallet = (key: "cash" | "bank" | "savings") => {
    setWallets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleBiometricsScan = async () => {
    setBiometricsScanning(true)
    try {
      const ok = await enrollBiometrics()
      if (ok) {
        setBiometricsEnabled(true)
        setTimeout(() => handleNext(), 500)
      }
    } finally {
      setBiometricsScanning(false)
    }
  }

  const stepMeta: Record<number, { title: string; subtitle: string; icon: typeof Sun }> = {
    1: {
      title: "Welcome to Personal OS",
      subtitle: "A quiet desk for money, tasks, and your day — set up once, then move fast.",
      icon: Sun,
    },
    2: {
      title: "Choose your currency",
      subtitle: "This is how balances and transactions will display.",
      icon: Coins,
    },
    3: {
      title: "Start with wallets",
      subtitle: "Pick the accounts you want ready on day one.",
      icon: Wallet,
    },
    4: {
      title: "Estimate income",
      subtitle: "Optional — helps budget and insights make sense later.",
      icon: TrendingUp,
    },
    5: {
      title: "Set a monthly budget",
      subtitle: "A spending ceiling you can adjust anytime.",
      icon: Sliders,
    },
    6: {
      title: "Notification preferences",
      subtitle: "Only the reminders that keep you on track.",
      icon: Bell,
    },
    7: {
      title: "Secure your workspace",
      subtitle: "Optional Face ID or fingerprint lock.",
      icon: Fingerprint,
    },
    8: {
      title: "You're ready",
      subtitle: "Your Personal OS is set. Open Home and start the day.",
      icon: Check,
    },
  }

  const meta = stepMeta[step]
  const Icon = meta.icon

  return (
    <div
      className="flex min-h-svh flex-col bg-background"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset + 16 : undefined }}
    >
      {/* Top bar — in-app feel */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Personal OS</span>
        </div>
        {step < TOTAL_STEPS && (
          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-primary" : s < step ? "w-3 bg-primary/40" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mb-8 flex flex-col gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-card">
            <Icon className="size-6 text-primary" />
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            {meta.title}
          </h1>
          <p className="text-pretty text-base text-muted-foreground">{meta.subtitle}</p>
        </div>

        <div className="flex-1">
          {step === 1 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              {[
                "Log expenses in seconds",
                "See today's balance and agenda",
                "Keep money and tasks in one place",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-3 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{line}</p>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { symbol: "₦", label: "Naira" },
                { symbol: "$", label: "Dollar" },
                { symbol: "£", label: "Pound" },
                { symbol: "€", label: "Euro" },
              ].map((cur) => (
                <button
                  key={cur.symbol}
                  type="button"
                  onClick={() => setCurrency(cur.symbol)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-6 transition-colors ${
                    currency === cur.symbol
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl font-semibold">{cur.symbol}</span>
                  <span className="text-sm">{cur.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {[
                { key: "cash" as const, name: "Cash", desc: "Physical cash spending" },
                { key: "bank" as const, name: "Bank account", desc: "Digital payments and income" },
                { key: "savings" as const, name: "Savings", desc: "Reserved for goals" },
              ].map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => toggleWallet(w.key)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                    wallets[w.key]
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{w.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{w.desc}</p>
                  </div>
                  <div
                    className={`flex size-6 items-center justify-center rounded-full border ${
                      wallets[w.key]
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {wallets[w.key] && <Check className="size-3.5" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Salary / job income</label>
                <Input type="number" placeholder="e.g. 500000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Side income</label>
                <Input type="number" placeholder="e.g. 150000" />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-sm font-semibold">Monthly budget</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Cap discretionary spending</p>
                </div>
                <Switch checked={hasBudget} onCheckedChange={setHasBudget} />
              </div>
              {hasBudget && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Spending limit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-1 rounded-xl border border-border bg-card p-2">
              {[
                {
                  key: "dailyReview" as const,
                  label: "Daily review",
                  desc: "Evening timeline reminder",
                },
                {
                  key: "bills" as const,
                  label: "Bill alerts",
                  desc: "48 hours before due",
                },
                {
                  key: "tasks" as const,
                  label: "Task reminders",
                  desc: "Pending checklist items",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(val) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: val }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col items-center gap-6 py-6">
              <button
                type="button"
                onClick={handleBiometricsScan}
                disabled={biometricsScanning || biometricsEnabled}
                className={`flex size-24 items-center justify-center rounded-full border-2 border-dashed transition-colors ${
                  biometricsEnabled
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                <Fingerprint className={`size-10 ${biometricsScanning ? "animate-pulse" : ""}`} />
              </button>
              <p className="text-center text-sm text-muted-foreground">
                {biometricsEnabled
                  ? "Biometrics enabled"
                  : biometricsScanning
                    ? "Scanning..."
                    : "Tap to enroll, or skip for now"}
              </p>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-semibold">{currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallets</span>
                <span className="font-semibold capitalize">
                  {Object.entries(wallets)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", ") || "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-semibold">
                  {hasBudget ? `${currency}${Number(budgetValue).toLocaleString()}` : "Off"}
                </span>
              </div>
              {biometricsEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biometrics</span>
                  <span className="font-semibold text-emerald-600">On</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex gap-3 pb-4">
          {step > 1 && step < TOTAL_STEPS && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleBack}
              disabled={biometricsScanning}
            >
              Back
            </Button>
          )}
          {step === 7 ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={handleNext}
              disabled={biometricsScanning}
            >
              Skip for now
            </Button>
          ) : (
            <Button type="button" size="lg" className="flex-1 gap-1.5" onClick={handleNext}>
              {step === 1 ? "Get started" : step === TOTAL_STEPS ? "Open Home" : "Continue"}
              {step === TOTAL_STEPS && <ChevronRight className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
