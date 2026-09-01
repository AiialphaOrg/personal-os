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
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }

    // Immediately process whatever was captured during the hold session!
    const captured = sessionTranscriptRef.current.trim()
    if (captured) {
      void processCapturedTranscript(captured, mode)
    } else {
      setHint("Voice stopped.")
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

      // Reset session transcript for fresh recording session
      sessionTranscriptRef.current = ""
      setSessionTranscript("")

      // Request browser audio permission if needed
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((track) => track.stop())
        } catch {
          setHint("Microphone access denied. Please allow microphone permissions.")
          return
        }
      }

      try {
        const recognition = new SpeechRecognition()
        recognition.lang = "en-US"
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        recognition.continuous = false // Explicitly disable continuous listening so laptop/desktop stops cleanly on release

        recognitionRef.current = recognition
        setListening(true)
        setHint("Listening... speak your transaction")

        recognition.onresult = (event: any) => {
          let interimTranscript = ""
          let finalSegment = ""

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i]
            if (res.isFinal) {
              finalSegment += res[0].transcript
            } else {
              interimTranscript += res[0].transcript
            }
          }

          if (finalSegment) {
            sessionTranscriptRef.current = [sessionTranscriptRef.current, finalSegment.trim()].filter(Boolean).join(" ")
            setSessionTranscript(sessionTranscriptRef.current)
          }

          const currentText = [sessionTranscriptRef.current, interimTranscript.trim()].filter(Boolean).join(" ")
          if (currentText) {
            setHint(`Hearing: "${currentText}"`)
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
