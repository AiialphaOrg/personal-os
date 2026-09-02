import { useCallback, useEffect, useRef, useState } from "react"
import { interpretCapture, type CaptureIntent } from "@/lib/ai/on-device"
import {
  onAiProgress,
  parseNoteWithAi,
  summarizeInsightWithAi,
} from "@/lib/ai/capture-client"

export type VoiceMode = "capture" | "note" | "insight"

type VoiceHandlers = {
  onCapture?: (intent: CaptureIntent, transcript: string) => void
  onNote?: (note: { title: string; content: string }, transcript: string) => void
  onInsight?: (
    insight: {
      headline: string
      advice: string
      risk: "low" | "medium" | "high"
      source?: "rules" | "on-device-ai"
    },
    transcript: string
  ) => void
  /** Spending numbers / categories to ground insight answers */
  insightContext?: () => string
}

export function useVoiceCapture(handlers: VoiceHandlers, defaultMode: VoiceMode = "capture") {
  const [listening, setListening] = useState(false)
  const [hint, setHint] = useState("")
  const [aiProgress, setAiProgress] = useState("")
  const [mode, setMode] = useState<VoiceMode>(defaultMode)
  const [sessionTranscript, setSessionTranscript] = useState("")

  const recognitionRef = useRef<any>(null)
  const sessionTranscriptRef = useRef("")
  const latestFullTranscriptRef = useRef("")
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    return onAiProgress((info) => {
      if (info.status === "progress" && info.progress != null) {
        setAiProgress(`AI model ${Math.round(info.progress)}%`)
      } else if (info.status) {
        setAiProgress(info.status)
      }
    })
  }, [])

  const processCapturedTranscript = useCallback(async (transcriptText: string, activeMode: VoiceMode) => {
    const textToProcess = transcriptText.trim()
    if (!textToProcess) {
      setHint("Could not hear anything. Try holding and speaking again.")
      return
    }

    setHint(`Processing: "${textToProcess}"…`)

    try {
      if (activeMode === "note") {
        const note = await parseNoteWithAi(textToProcess)
        setHint(`Note ready: ${note.title}`)
        handlersRef.current.onNote?.(note, textToProcess)
        return
      }

      if (activeMode === "insight") {
        const context = handlersRef.current.insightContext?.() || ""
        const insight = await summarizeInsightWithAi(
          [context, `User asked: """${textToProcess}"""`].filter(Boolean).join("\n")
        )
        setHint(insight.headline)
        handlersRef.current.onInsight?.(insight, textToProcess)
        return
      }

      const intent = await interpretCapture(textToProcess)
      setHint(
        `Captured (${intent.source}): ${intent.type}${
          intent.amount != null ? ` · ${intent.amount}` : ""
        } · ${intent.title}`
      )
      handlersRef.current.onCapture?.(intent, textToProcess)
    } catch {
      setHint("Failed to parse speech — try again.")
    }
  }, [])

  const stopVoice = useCallback(() => {
    setListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null
    }

    // Immediately process whatever was captured during the hold session!
    const captured = (latestFullTranscriptRef.current || sessionTranscriptRef.current).trim()
    if (captured) {
      void processCapturedTranscript(captured, mode)
    } else {
      setHint("Could not detect speech — try holding the mic and speaking again.")
    }
  }, [mode, processCapturedTranscript])

  const startVoice = useCallback(
    async (overrideMode?: VoiceMode) => {
      if (overrideMode) setMode(overrideMode)

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        setHint("Voice recognition requires Chrome, Edge, Safari, or Capacitor app.")
        return
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
        recognitionRef.current = null
      }

      // Reset session transcript for fresh recording session
      sessionTranscriptRef.current = ""
      latestFullTranscriptRef.current = ""
      setSessionTranscript("")

      try {
        const recognition = new SpeechRecognition()
        recognition.lang = "en-US"
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        recognition.continuous = true

        recognitionRef.current = recognition
        setListening(true)
        setHint("Listening… Speak now, release when done")

        recognition.onresult = (event: any) => {
          let fullAccumulated = ""
          for (let i = 0; i < event.results.length; ++i) {
            fullAccumulated += event.results[i][0].transcript + " "
          }

          const cleaned = fullAccumulated.trim()
          if (cleaned) {
            latestFullTranscriptRef.current = cleaned
            sessionTranscriptRef.current = cleaned
            setSessionTranscript(cleaned)
            setHint(`Hearing: "${cleaned}"`)
          }
        }

        recognition.onerror = (err: any) => {
          if (err.error === "no-speech" || err.error === "aborted") return
          if (err.error === "not-allowed") {
            setListening(false)
            setHint("Microphone permission denied.")
            return
          }
          setHint(`Mic notice: ${err.error || "Listening reset"}`)
        }

        recognition.onend = () => {
          setListening(false)
        }

        recognition.start()
      } catch (e: any) {
        console.warn("Speech recognition error:", e)
        setListening(false)
        setHint("Mic starting error — try holding mic again.")
      }
    },
    [mode]
  )

  return {
    listening,
    hint,
    setHint,
    aiProgress,
    mode,
    setMode,
    sessionTranscript,
    startVoice,
    stopVoice,
  }
}
