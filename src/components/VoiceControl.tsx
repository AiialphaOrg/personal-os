import { useState, useCallback } from "react"
import { useVoiceCapture } from "@/hooks/use-voice-capture"
import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { applyCaptureSubmit } from "@/lib/capture-apply"
import { getDefaultWalletId, type CaptureType } from "@/lib/storage"
import { toast } from "sonner"
import { Mic, X, Loader2 } from "lucide-react"
import type { CaptureIntent } from "@/lib/ai/on-device"
import { usePosQuery } from "@/hooks/use-pos-query"

export function VoiceControl() {
  const { wallets } = usePosQuery()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sheetType, setSheetType] = useState<CaptureType>("expense")
  const [presets, setPresets] = useState<
    { title?: string; amount?: string; fromWallet?: string; toWallet?: string; person?: string; walletId?: string } | undefined
  >()

  const currency = localStorage.getItem("pos_currency") || "₦"
  const defaultWalletId = getDefaultWalletId(wallets)

  const tryVibrate = (duration = 40) => {
    try {
      if (
        typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(duration)
      }
    } catch {
      // Ignore vibration error on platforms without vibration support
    }
  }

  const handleCaptureIntent = useCallback(
    (intent: CaptureIntent, transcript: string) => {
      if (intent.type === "unknown") {
        toast.info(`Heard: "${transcript}" — could not parse cleanly.`)
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

  const handleToggleVoice = async () => {
    tryVibrate(40)
    if (listening) {
      // 2nd Tap: Stop recording and process
      await stopVoice()
    } else {
      // 1st Tap: Start recording and listening
      await startVoice("capture")
    }
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
      {/* Floating Tap-to-Record Voice Button */}
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`flex size-14 items-center justify-center rounded-full shadow-xl transition-all select-none cursor-pointer ${
            listening
              ? "bg-red-500 text-white scale-110 ring-4 ring-red-500/40 animate-pulse shadow-red-500/30"
              : "bg-primary text-primary-foreground hover:opacity-95 hover:scale-105 active:scale-95 shadow-primary/20"
          }`}
          aria-label={listening ? "Tap to stop and process speech" : "Tap to speak"}
          title={listening ? "Tap to stop and process" : "Tap to speak"}
        >
          <Mic className={`size-6 transition-transform ${listening ? "scale-110 text-white" : ""}`} />
        </button>
      </div>

      {/* Voice feedback banner */}
      {(listening || (hint && hint !== "Voice stopped.")) && (
        <div className="fixed bottom-36 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {listening ? (
                <div className="size-3 rounded-full bg-red-500 animate-ping shrink-0" />
              ) : (
                <Loader2 className="size-4 animate-spin text-primary shrink-0" />
              )}
              <p className="text-xs font-semibold text-foreground truncate">
                {listening ? (hint || "Listening… Tap mic again when done") : hint || "Processing voice…"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHint("")}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
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
