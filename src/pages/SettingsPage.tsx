import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTheme } from "@/components/theme-provider"

import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { logout } from "@/store/authSlice"
import { resetDataState } from "@/store/dataSlice"
import { useQueryClient } from "@tanstack/react-query"

import {
  AI_MODELS,
  detectAiDevice,
  formatSizeMb,
  getAiEngine,
  getModelOption,
  getSelectedModelId,
  setAiEngine,
  setSelectedModelId,
  type AiEngine,
  type AiModelId,
} from "@/lib/ai/models"
import {
  getAiRuntimeStatus,
  onAiStatus,
  preloadAiModel,
  type AiRuntimeStatus,
} from "@/lib/ai/capture-client"
import {
  Check,
  Cpu,
  Download,
  Moon,
  Bell,
  Sparkles,
  Sun,
  Trash2,
  User,
  Shield,
  Coins,
  Cloud,
  LogOut,
  ChevronRight,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Wifi,
  WifiOff,
  Phone,
  Mail,
} from "lucide-react"
import {
  getSyncStatus,
  triggerSync,
  exportJsonBackup,
  importJsonBackup,
  type SyncStatus,
} from "@/lib/sync/sync-manager"
import { toast } from "sonner"
import {
  getNotificationPermission,
  notificationsEnabled,
  requestNotificationPermission,
  sendTestNotification,
  setNotificationsEnabled,
  dailyReviewRemindersEnabled,
  setDailyReviewRemindersEnabled,
  getDailyReviewTime,
  setDailyReviewTime,
} from "@/lib/reminders/scheduler"
import { useHeader } from "@/hooks/use-header"
import { useSettingsStore } from "@/stores/settings-store"

const CURRENCIES = [
  { code: "₦", label: "NGN · Nigerian Naira" },
  { code: "$", label: "USD · US Dollar" },
  { code: "€", label: "EUR · Euro" },
  { code: "£", label: "GBP · British Pound" },
]

type ActiveModal =
  | "personal_info"
  | "currency"
  | "theme"
  | "notifications"
  | "ai"
  | "sync"
  | "security"
  | null

export function SettingsPage() {
  useHeader({ title: "Profile" })
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const keyboardInset = useKeyboardInset()
  const isMobile = useIsMobile()

  const authUser = useAppSelector((state) => state.auth.user)
  const settings = useSettingsStore()


  // Profile data
  const [name, setName] = useState(() => authUser?.name || settings.userName || "Ahmad Ismail")
  const [email] = useState(() => authUser?.email || "user@personalos.app")
  const [phone, setPhone] = useState(() => localStorage.getItem("pos_user_phone") || "")
  const [currency, setCurrency] = useState(() => settings.currency || "₦")
  const [budget, setBudget] = useState(() => String(settings.budget || 100000))

  // Notifications
  const [notifOn, setNotifOn] = useState(() => notificationsEnabled())
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default")
  const [notifMsg, setNotifMsg] = useState("")

  const [dailyReviewOn, setDailyReviewOn] = useState(() => dailyReviewRemindersEnabled())
  const [dailyReviewTime, setDailyReviewTimeState] = useState(() => getDailyReviewTime())

  // AI
  const [engine, setEngine] = useState<AiEngine>(() => getAiEngine())
  const [modelId, setModelId] = useState<AiModelId>(() => getSelectedModelId())
  const [runtime, setRuntime] = useState<AiRuntimeStatus>(() => getAiRuntimeStatus())

  // Sync
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus())
  const [isSyncing, setIsSyncing] = useState(false)

  // Active subview modal
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  useEffect(() => onAiStatus(setRuntime), [])

  useEffect(() => {
    const updateSync = () => setSyncStatus(getSyncStatus())
    window.addEventListener("pos:sync-status", updateSync)
    window.addEventListener("online", updateSync)
    window.addEventListener("offline", updateSync)
    return () => {
      window.removeEventListener("pos:sync-status", updateSync)
      window.removeEventListener("online", updateSync)
      window.removeEventListener("offline", updateSync)
    }
  }, [])

  useEffect(() => {
    void getNotificationPermission().then(setNotifPerm)
  }, [])

  const getInitials = (n: string) => {
    if (!n) return "AI"
    const parts = n.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    const res = await triggerSync()
    setIsSyncing(false)
    if (res.ok) {
      toast.success(res.syncedCount > 0 ? `Synced ${res.syncedCount} changes!` : "Already up to date.")
    } else {
      toast.error(res.error || "Sync failed")
    }
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await importJsonBackup(file)
    if (res.ok) {
      toast.success(`Successfully restored ${res.count} items!`)
    } else {
      toast.error(res.error || "Failed to restore backup")
    }
  }

  const selectedModel = getModelOption(modelId)
  const deviceHint = detectAiDevice()

  const savePersonalInfo = () => {
    settings.updateProfile(name.trim() || "User", currency, Number(budget) || 100000)
    localStorage.setItem("pos_user_phone", phone.trim())
    localStorage.setItem("pos_currency", currency)
    toast.success("Personal info saved")
    setActiveModal(null)
  }

  const savePreferences = (selectedCurr: string) => {
    setCurrency(selectedCurr)
    settings.updateProfile(name.trim() || "User", selectedCurr, Number(budget) || 100000)
    localStorage.setItem("pos_currency", selectedCurr)
    toast.success(`Currency updated to ${selectedCurr}`)
  }

  const chooseEngine = (next: AiEngine) => {
    setEngine(next)
    setAiEngine(next)
  }

  const chooseModel = (id: AiModelId) => {
    setModelId(id)
    setSelectedModelId(id)
  }

  const downloadModel = async () => {
    chooseEngine("transformers")
    await preloadAiModel(modelId)
  }

  const handleNotifications = async (on: boolean) => {
    if (on) {
      const ok = await requestNotificationPermission()
      setNotifPerm(ok ? "granted" : "denied")
      if (ok) {
        setNotificationsEnabled(true)
        setNotifOn(true)
        setNotifMsg("Notifications enabled")
      } else {
        setNotificationsEnabled(false)
        setNotifOn(false)
        setNotifMsg("Notification permission blocked by browser")
      }
    } else {
      setNotificationsEnabled(false)
      setNotifOn(false)
      setNotifMsg("Notifications disabled")
    }
  }

  const handleTestNotif = async () => {
    await sendTestNotification()
    setNotifMsg("Test notification sent")
  }

  const handleLogout = () => {
    queryClient.clear()
    dispatch(logout())
    dispatch(resetDataState())
    localStorage.removeItem("pos_wallets")
    localStorage.removeItem("pos_timeline")
    localStorage.removeItem("pos_debts")
    localStorage.removeItem("pos_goals")
    localStorage.removeItem("pos_tasks")
    toast.success("Logged out successfully")
    navigate("/login")
  }


  const resetData = () => {
    if (
      window.confirm("Are you sure you want to clear all Personal OS data? This cannot be undone.")
    ) {
      localStorage.clear()
      window.location.href = "/onboarding"
    }
  }

  // Sub-view modal content renderer
  const renderModalContent = () => {
    switch (activeModal) {
      case "personal_info":
        return (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Email Address
              </label>
              <Input
                value={email}
                disabled
                className="h-10 text-sm bg-muted/50 cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">Primary authenticated account email</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="h-10 text-sm"
              />
            </div>

            <Button className="w-full h-10 font-semibold mt-2" onClick={savePersonalInfo}>
              Save Personal Info
            </Button>
          </div>
        )

      case "currency":
        return (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Select Primary Currency</label>
              <div className="grid grid-cols-1 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => savePreferences(c.code)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-xs font-semibold transition-all ${
                      currency === c.code
                        ? "border-primary bg-primary/10 text-primary shadow-2xs"
                        : "border-border bg-card text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span>{c.label}</span>
                    {currency === c.code && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-medium text-foreground">Monthly Budget Target</label>
              <Input
                inputMode="numeric"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value.replace(/[^\d]/g, ""))
                  settings.updateProfile(name, currency, Number(e.target.value) || 100000)
                }}
                className="h-10 text-sm"
              />
            </div>
          </div>
        )

      case "theme":
        return (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Select your interface appearance preference.</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-xs font-semibold transition-all ${
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary shadow-2xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="size-5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-xs font-semibold transition-all ${
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary shadow-2xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="size-5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-xs font-semibold transition-all ${
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary shadow-2xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cpu className="size-5" />
                <span>System</span>
              </button>
            </div>
          </div>
        )

      case "notifications":
        return (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">System Notifications</p>
                <p className="text-[11px] text-muted-foreground">
                  Status: <span className="font-semibold text-foreground">{notifPerm}</span>
                </p>
              </div>
              <Switch checked={notifOn} onCheckedChange={(v) => void handleNotifications(v)} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
              <div>
                <p className="text-xs font-semibold text-foreground">Daily Review Prompt</p>
                <p className="text-[11px] text-muted-foreground">Evening reminder to review day's spend</p>
              </div>
              <Switch
                checked={dailyReviewOn}
                onCheckedChange={(v) => {
                  setDailyReviewOn(v)
                  setDailyReviewRemindersEnabled(v)
                }}
              />
            </div>

            {dailyReviewOn && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <label className="text-xs font-medium text-foreground">Reminder Time</label>
                <Input
                  type="time"
                  value={dailyReviewTime}
                  onChange={(e) => {
                    setDailyReviewTimeState(e.target.value)
                    setDailyReviewTime(e.target.value)
                  }}
                  className="w-32 h-8 text-xs font-semibold"
                />
              </div>
            )}

            {notifMsg && <p className="text-xs text-primary font-medium">{notifMsg}</p>}

            <Button
              variant="outline"
              className="w-full h-9 text-xs font-semibold"
              disabled={!notifOn}
              onClick={() => void handleTestNotif()}
            >
              Send Test Notification
            </Button>
          </div>
        )

      case "ai":
        return (
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => chooseEngine("transformers")}
                className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                  engine === "transformers"
                    ? "border-primary bg-primary/10 text-primary shadow-2xs"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <p className="text-xs font-bold text-foreground">Transformers.js</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Voice → JSON on device</p>
              </button>

              <button
                type="button"
                onClick={() => chooseEngine("rules")}
                className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                  engine === "rules"
                    ? "border-primary bg-primary/10 text-primary shadow-2xs"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <p className="text-xs font-bold text-foreground">Rules Engine</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">0 MB · Instant pattern match</p>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-foreground">Available Local Models</label>
              {AI_MODELS.map((m) => {
                const active = modelId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={engine === "rules"}
                    onClick={() => chooseModel(m.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all disabled:opacity-50 ${
                      active && engine === "transformers"
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">{m.name}</p>
                          {active && engine === "transformers" && (
                            <Check className="size-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{m.blurb}</p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {formatSizeMb(m.sizeMb)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="size-3.5" />
                <span>
                  Device: <span className="font-semibold text-foreground">{deviceHint}</span>
                </span>
              </div>
              <p className="text-muted-foreground">
                Status:{" "}
                <span className="font-semibold text-foreground">
                  {engine === "rules"
                    ? "Rules Engine active (0 MB)"
                    : runtime.loading
                    ? runtime.progress || "Loading model..."
                    : runtime.ready
                    ? "Model loaded & ready"
                    : "Not loaded yet"}
                </span>
              </p>
            </div>

            <Button
              className="w-full h-10 font-semibold gap-2"
              variant={runtime.ready && runtime.modelId === modelId ? "outline" : "default"}
              disabled={engine === "rules" || runtime.loading}
              onClick={() => void downloadModel()}
            >
              <Download className="size-4" />
              {runtime.loading
                ? "Downloading..."
                : runtime.ready && runtime.modelId === modelId
                ? "Reload Model"
                : `Download ${selectedModel.shortName} (${formatSizeMb(selectedModel.sizeMb)})`}
            </Button>
          </div>
        )

      case "sync":
        return (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncStatus.online ? (
                    <Wifi className="size-4 text-emerald-500" />
                  ) : (
                    <WifiOff className="size-4 text-amber-500" />
                  )}
                  <span className="text-xs font-bold text-foreground">
                    {syncStatus.online ? "Connected Online" : "Offline Mode"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 font-semibold gap-1.5 text-xs"
                  onClick={() => void handleManualSync()}
                  disabled={isSyncing || !syncStatus.online}
                >
                  <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {syncStatus.pendingCount > 0
                  ? `${syncStatus.pendingCount} local changes queued for cloud sync`
                  : "Single source of truth synchronized with backend database."}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <p className="text-xs font-semibold text-foreground">JSON Backup & Restore</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 font-semibold text-xs gap-1.5"
                  onClick={exportJsonBackup}
                >
                  <DownloadCloud className="size-4 text-primary" />
                  Export JSON
                </Button>

                <label className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/40 cursor-pointer transition-colors shadow-2xs">
                  <UploadCloud className="size-4 text-emerald-500" />
                  <span>Restore JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => void handleRestoreFile(e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60">
              <Button
                variant="destructive"
                className="w-full h-10 font-semibold gap-2 text-xs"
                onClick={resetData}
              >
                <Trash2 className="size-4" />
                Clear Local Storage Data
              </Button>
            </div>
          </div>
        )

      case "security":
        return (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Account Status</p>
              <p className="text-[11px] text-muted-foreground">
                Logged in as <span className="font-semibold text-foreground">{email}</span>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                <Check className="size-3.5" />
                Session authenticated & token encrypted
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full h-10 font-semibold gap-2"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Sign Out of Account
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  const getModalTitle = () => {
    switch (activeModal) {
      case "personal_info":
        return "Personal Info"
      case "currency":
        return "Preferences & Currency"
      case "theme":
        return "Theme & Display"
      case "notifications":
        return "Notifications & Alerts"
      case "ai":
        return "AI & Voice Engine"
      case "sync":
        return "Cloud Sync & Data Backup"
      case "security":
        return "Login & Security"
      default:
        return ""
    }
  }

  const MENU_ITEMS = [
    {
      id: "personal_info" as const,
      label: "Personal info",
      subtitle: "Name, photo, phone",
      icon: User,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      id: "currency" as const,
      label: "Currency & Budget",
      subtitle: `Primary currency (${currency}), budget target`,
      icon: Coins,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "theme" as const,
      label: "Theme & Display",
      subtitle: `Current mode: ${theme}`,
      icon: Sun,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      id: "security" as const,
      label: "Login & security",
      subtitle: "Password and account safety",
      icon: Shield,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      id: "notifications" as const,
      label: "Notifications",
      subtitle: "Email and review reminders",
      icon: Bell,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      id: "ai" as const,
      label: "On-Device AI Engine",
      subtitle: "Voice transcription & parse models",
      icon: Sparkles,
      iconClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      id: "sync" as const,
      label: "Cloud Sync & Backup",
      subtitle: "Database sync, JSON export/restore",
      icon: Cloud,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div
      className="mx-auto max-w-md space-y-4 pb-12"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      {/* Top Profile Hero Card */}
      <section className="rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col items-center justify-center text-center space-y-3.5 shadow-xs">
        {/* Brand Blue Avatar */}
        <div className="flex size-20 sm:size-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white font-extrabold text-2xl sm:text-3xl tracking-tight shadow-md select-none">
          {getInitials(name)}
        </div>

        {/* User Details */}
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{email}</p>
        </div>
      </section>


      {/* Menu Settings Group (Inspired by reference screenshot) */}
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs divide-y divide-border/60">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModal(item.id)}
              className="group flex w-full items-center justify-between p-4 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105 ${item.iconClass}`}
                >
                  <Icon className="size-4 stroke-[2.2px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
              </div>

              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </button>
          )
        })}
      </section>

      {/* Log Out Button (Inspired by reference screenshot) */}
      <section>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-3.5 px-4 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted/40 hover:text-red-600 dark:hover:text-red-400 active:scale-[0.99] transition-all shadow-xs"
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </button>
      </section>

      {/* Subview Modal / Drawer */}
      {isMobile ? (
        <Drawer open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DrawerContent className="px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle>{getModalTitle()}</DrawerTitle>
            </DrawerHeader>
            {renderModalContent()}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle>{getModalTitle()}</DialogTitle>
            </DialogHeader>
            {renderModalContent()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

