import { useState, useEffect, useCallback } from "react"
import { useVoiceCapture } from "@/hooks/use-voice-capture"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { applyCaptureSubmit } from "@/lib/capture-apply"
import { getDefaultWalletId, type CaptureType } from "@/lib/storage"
import { toast } from "sonner"
import { Mic, Sparkles, X } from "lucide-react"
import type { CaptureIntent } from "@/lib/ai/on-device"
import { usePosQuery } from "@/hooks/use-pos-query"

export function VoiceControl() {
  const { wallets } = usePosQuery()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sheetType, setSheetType] = useState<CaptureType>("expense")
  const [presets, setPresets] = useState<
    { title?: string; amount?: string; fromWallet?: string; toWallet?: string; person?: string; walletId?: string } | undefined
  >()
  const [isHolding, setIsHolding] = useState(false)

  const currency = localStorage.getItem("pos_currency") || "₦"
  const defaultWalletId = getDefaultWalletId(wallets)

  const tryVibrate = () => {
    try {
      if (
        typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(40)
      }
    } catch {
      // Ignore vibration error on platforms without vibration support
    }
  }

  const handleCaptureIntent = useCallback(
    (intent: CaptureIntent, transcript: string) => {
      if (intent.type === "unknown") {
        toast.info(`Heard: "${transcript}" — couldn't parse cleanly.`)
        return
      }

      toast.success(`Voice Captured: ${intent.type} · ${intent.title}`, {
        description: intent.amount != null ? `${currency}${intent.amount.toLocaleString()}` : undefined,
      })

      setSheetType(intent.type === "bill" ? "expense" : (intent.type as CaptureType))
      setPresets({
        title: intent.title || intent.person || undefined,
        amount: intent.amount != null ? String(intent.amount) : undefined,
        person: intent.person || undefined,
        walletId: defaultWalletId,
      })
      setIsSheetOpen(true)
    },
    [currency, defaultWalletId]
  )

  const { listening, hint, startVoice, stopVoice, setHint } = useVoiceCapture({
    onCapture: handleCaptureIntent,
  })

  const stopHoldAndProcess = useCallback(async () => {
    if (!isHolding) return
    setIsHolding(false)
    tryVibrate()
    await stopVoice()
  }, [isHolding, stopVoice])

  useEffect(() => {
    if (!isHolding) return

    const handleGlobalRelease = () => {
      void stopHoldAndProcess()
    }

    window.addEventListener("pointerup", handleGlobalRelease)
    window.addEventListener("mouseup", handleGlobalRelease)
    window.addEventListener("touchend", handleGlobalRelease)

    return () => {
      window.removeEventListener("pointerup", handleGlobalRelease)
      window.removeEventListener("mouseup", handleGlobalRelease)
      window.removeEventListener("touchend", handleGlobalRelease)
    }
  }, [isHolding, stopHoldAndProcess])

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsHolding(true)
    tryVibrate()
    void startVoice("capture")
  }

  const applySubmit = (data: CaptureSubmit) => {
    const res = applyCaptureSubmit(data)
    if (res.ok) {
      toast.success("Saved")
    } else {
      toast.error(res.error)
    }
  }

  return (
    <>
      {/* Floating Push-to-Talk Voice Button */}
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          className={`flex size-13 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
            isHolding || listening
              ? "bg-red-500 text-white scale-110 ring-4 ring-red-500/30 animate-pulse"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
          aria-label="Hold to speak voice command"
        >
          {isHolding || listening ? <Mic className="size-6" /> : <Sparkles className="size-6" />}
        </button>
      </div>

      {/* Voice feedback banner */}
      {(listening || isHolding || hint) && (
        <div className="fixed bottom-36 left-4 right-4 z-40 mx-auto max-w-sm rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <p className="text-xs font-semibold text-foreground truncate">
                {isHolding ? "Listening… Release to finish" : hint || "Processing speech…"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHint("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <CaptureSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        type={sheetType}
        wallets={wallets.filter((w) => w.kind !== "investment")}
        currency={currency}
        defaultWalletId={defaultWalletId}
        presets={presets}
        onSubmit={applySubmit}
      />
    </>
  )
}
