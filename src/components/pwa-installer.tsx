import { useState, useEffect } from "react"
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed / running as standalone PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://")

    setIsStandalone(standalone)
    if (standalone) return

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Check dismissal cooldown (don't show if dismissed within last 7 days)
    const dismissedAt = localStorage.getItem("pos_pwa_dismissed_at")
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 3600 * 24)
      if (daysSinceDismiss < 7) return
    }

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    // For iOS, show after a brief 3-second delay on mobile web
    let iosTimer: any
    if (ios && !standalone) {
      iosTimer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pos_pwa_dismissed_at", String(Date.now()))
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-xl text-card-foreground space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground tracking-tight">Install Personal OS</h4>
              <p className="text-[11px] text-muted-foreground">Fast access, offline mode, and fullscreen experience.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {isIOS ? (
          <div className="rounded-lg bg-muted/60 p-2.5 space-y-1.5 text-[11px] border border-border/40 text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span>To install on iPhone / iPad:</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold">1</span>
              <span>Tap the <Share className="inline size-3 text-primary mx-0.5" /> <strong>Share</strong> button in Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold">2</span>
              <span>Scroll down and tap <PlusSquare className="inline size-3 text-primary mx-0.5" /> <strong>Add to Home Screen</strong></span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="flex-1 h-8 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              <Download className="size-3.5 mr-1.5" />
              <span>Install to Phone</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 px-2.5 text-xs text-muted-foreground"
            >
              Later
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
