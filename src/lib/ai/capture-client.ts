import type { CaptureIntent } from "@/lib/ai/on-device"
import { parseCaptureRules } from "@/lib/ai/on-device"
import {
  buildInsightFromRules,
  parseInsightSummaryString,
  type InsightCard,
} from "@/lib/ai/insight-rules"
import {
  getAiEngine,
  getModelOption,
  getSelectedModelId,
  type AiModelId,
} from "@/lib/ai/models"

type ProgressCb = (info: { status: string; file?: string; progress?: number }) => void

export type AiRuntimeStatus = {
  ready: boolean
  loading: boolean
  modelId: string
  dtype: string
  device: string
  pipeline: string
  lastError: string | null
  progress: string
}

type Pending = {
  resolve: (value: Record<string, unknown> | null) => void
  reject: (err: Error) => void
}

let worker: Worker | null = null
let loadPromise: Promise<boolean> | null = null
const pending = new Map<string, Pending>()
const progressListeners = new Set<ProgressCb>()
const statusListeners = new Set<(s: AiRuntimeStatus) => void>()

let runtime: AiRuntimeStatus = {
  ready: false,
  loading: false,
  modelId: "",
  dtype: "",
  device: "",
  pipeline: "",
  lastError: null,
  progress: "",
}

function emitStatus() {
  statusListeners.forEach((cb) => cb({ ...runtime }))
}

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL("../../workers/ai-capture.worker.ts", import.meta.url), {
    type: "module",
  })

  worker.addEventListener("message", (event: MessageEvent) => {
    const data = event.data
    if (data.type === "progress") {
      runtime.loading = true
      runtime.progress =
        data.progress != null
          ? `${data.status || "loading"} ${Math.round(data.progress)}%`
          : data.status || "loading"
      if (data.file) runtime.progress += ` · ${String(data.file).split("/").pop()}`
      emitStatus()
      progressListeners.forEach((cb) => cb(data))
      return
    }
    if (data.type === "ready") {
      runtime.ready = true
      runtime.loading = false
      runtime.modelId = data.modelId
      runtime.dtype = data.dtype
      runtime.device = data.device
      runtime.pipeline = data.pipeline
      runtime.lastError = null
      runtime.progress = "Ready"
      emitStatus()
      return
    }
    if (data.type === "status") {
      runtime.ready = data.ready
      runtime.loading = data.loading
      runtime.modelId = data.modelId
      runtime.dtype = data.dtype
      runtime.device = data.device
      runtime.pipeline = data.pipeline
      emitStatus()
      return
    }
    if (data.type === "error") {
      runtime.lastError = data.message
      runtime.loading = false
      runtime.progress = data.message
      emitStatus()
      console.warn("[AI]", data.message)
      return
    }
    if (data.type === "result" || data.type === "fallback") {
      const p = pending.get(data.id)
      if (!p) return
      pending.delete(data.id)
      if (data.type === "result") p.resolve(data.json)
      else p.resolve(null)
    }
  })

  return worker
}

export function onAiProgress(cb: ProgressCb) {
  progressListeners.add(cb)
  return () => {
    progressListeners.delete(cb)
  }
}

export function onAiStatus(cb: (s: AiRuntimeStatus) => void) {
  statusListeners.add(cb)
  cb({ ...runtime })
  return () => {
    statusListeners.delete(cb)
  }
}

export function getAiRuntimeStatus(): AiRuntimeStatus {
  return { ...runtime }
}

export function isAiReady() {
  return runtime.ready
}

function loadPayload(modelId?: AiModelId, force = false) {
  const option = getModelOption(modelId)
  return {
    type: "load" as const,
    modelId: option.id,
    dtype: option.dtype,
    pipeline: option.pipeline,
    force,
  }
}

/** Warm / (re)load the selected model. */
export function preloadAiModel(forceModelId?: AiModelId): Promise<boolean> {
  if (getAiEngine() === "rules") return Promise.resolve(false)

  const option = getModelOption(forceModelId)
  const force = Boolean(forceModelId)
  const sameLoaded =
    runtime.ready && runtime.modelId === option.id && !force && loadPromise == null

  if (sameLoaded) return Promise.resolve(true)
  if (loadPromise && !force) return loadPromise

  runtime.loading = true
  runtime.progress = `Preparing ${option.shortName}…`
  emitStatus()

  loadPromise = new Promise((resolve) => {
    const w = getWorker()
    const onMsg = (event: MessageEvent) => {
      if (event.data.type === "ready") {
        w.removeEventListener("message", onMsg)
        loadPromise = null
        resolve(true)
      }
      if (event.data.type === "error") {
        w.removeEventListener("message", onMsg)
        loadPromise = null
        resolve(false)
      }
    }
    w.addEventListener("message", onMsg)
    w.postMessage(loadPayload(forceModelId || getSelectedModelId(), force))
    window.setTimeout(() => {
      w.removeEventListener("message", onMsg)
      loadPromise = null
      resolve(runtime.ready)
    }, 180_000)
  })

  return loadPromise
}

export function refreshAiStatus() {
  getWorker().postMessage({ type: "status" })
}

function ensureWorkerConfigured() {
  const option = getModelOption()
  if (!runtime.ready || runtime.modelId !== option.id || runtime.dtype !== option.dtype) {
    getWorker().postMessage(loadPayload())
  }
}

function request(
  message: { type: "parse" | "note" | "insight"; text?: string; summary?: string },
  timeoutMs = 45_000
): Promise<Record<string, unknown> | null> {
  const id = crypto.randomUUID()
  const w = getWorker()
  ensureWorkerConfigured()

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    if (message.type === "parse") {
      w.postMessage({ type: "parse", id, text: message.text })
    } else if (message.type === "note") {
      w.postMessage({ type: "note", id, text: message.text })
    } else {
      w.postMessage({ type: "insight", id, summary: message.summary })
    }
    window.setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        resolve(null)
      }
    }, timeoutMs)
  })
}

function normalizeCaptureJson(json: Record<string, unknown>, fallbackText: string): CaptureIntent {
  const typeRaw = String(json.type || "unknown").toLowerCase().replace(/-/g, "_")
  const typeMap: Record<string, CaptureIntent["type"]> = {
    expense: "expense",
    income: "income",
    task: "task",
    transfer: "transfer",
    bill: "bill",
    i_owe: "i_owe",
    owed_to_me: "owed_to_me",
    debt: "i_owe",
    receivable: "owed_to_me",
    loan: "owed_to_me",
    note: "task",
  }
  const type = typeMap[typeRaw] || "unknown"

  const amount =
    typeof json.amount === "number"
      ? json.amount
      : typeof json.amount === "string"
        ? Number(String(json.amount).replace(/,/g, ""))
        : null

  return {
    type: type === "unknown" && amount ? "expense" : type,
    title: String(json.title || json.person || fallbackText || "Capture"),
    person: json.person ? String(json.person) : undefined,
    amount: amount != null && !Number.isNaN(amount) ? amount : null,
    fromWallet: json.fromWallet ? String(json.fromWallet).toLowerCase() : undefined,
    toWallet: json.toWallet ? String(json.toWallet).toLowerCase() : undefined,
    wallet: json.wallet ? String(json.wallet).toLowerCase() : undefined,
    category: json.category ? String(json.category) : undefined,
    note: json.note ? String(json.note) : json.content ? String(json.content) : undefined,
    dueDate: json.dueDate ? String(json.dueDate) : undefined,
    confidence: 0.9,
    source: "on-device-ai",
  }
}

export async function parseUtteranceWithAi(text: string): Promise<
  CaptureIntent & {
    wallet?: string
    category?: string
    note?: string
  }
> {
  if (getAiEngine() !== "rules") {
    void preloadAiModel()
    const json = await request({ type: "parse", text })
    if (json) return normalizeCaptureJson(json, text)
  }

  return parseCaptureRules(text)
}

export async function parseNoteWithAi(text: string): Promise<{ title: string; content: string }> {
  if (getAiEngine() !== "rules") {
    void preloadAiModel()
    const json = await request({ type: "note", text })
    if (json) {
      return {
        title: String(json.title || "Note"),
        content: String(json.content || json.note || text),
      }
    }
  }
  const firstLine = text.split(/[.!?]/)[0]?.trim() || "Note"
  return {
    title: firstLine.slice(0, 40),
    content: text,
  }
}

export async function summarizeInsightWithAi(
  summary: string,
  rulesFallback?: InsightCard
): Promise<InsightCard> {
  const debugLog: string[] = []
  const rulesCard =
    rulesFallback ||
    buildInsightFromRules({
      income: 0,
      expenses: 0,
      balance: 0,
      iOwe: 0,
      owedToMe: 0,
      categories: [],
      ...parseInsightSummaryString(summary),
    })

  const fallback = (reason: string): InsightCard => {
    debugLog.push(reason)
    return { ...rulesCard, debugLog: [...debugLog] }
  }

  if (getAiEngine() === "rules") {
    return fallback("Engine is Rules-only in Settings (AI disabled).")
  }

  const ready = await preloadAiModel()
  if (!ready) {
    const err = getAiRuntimeStatus().lastError
    return fallback(
      err ? `Model not ready: ${err}` : "Model not ready (still downloading or failed to load)."
    )
  }

  debugLog.push(`Model ready (${getAiRuntimeStatus().modelId}).`)

  const json = await request({ type: "insight", summary }, 20_000)
  if (!json) {
    return fallback("Used rules insight (on-device model did not return JSON in time).")
  }

  const headline = String(json.headline || "").trim()
  const advice = String(json.advice || "").trim()
  if (!headline || !advice) {
    return fallback(`AI JSON missing headline/advice: ${JSON.stringify(json).slice(0, 120)}`)
  }
  if (headline.length > 80 || advice.length > 220) {
    return fallback(`AI output too long (headline ${headline.length}, advice ${advice.length}).`)
  }
  if (/json|schema|return only/i.test(headline + advice)) {
    return fallback("AI echoed prompt/schema instead of an insight.")
  }

  const risk = String(json.risk || "low")
  debugLog.push("On-device AI succeeded.")
  console.info("[Insight AI]", debugLog.join(" → "))
  return {
    headline,
    advice,
    risk: risk === "high" || risk === "medium" ? risk : "low",
    source: "on-device-ai",
    debugLog,
  }
}

/** Rules-first; on-device AI enhances when it returns valid JSON quickly. */
export async function summarizeInsightFromNumbers(
  numbers: Parameters<typeof buildInsightFromRules>[0]
): Promise<InsightCard> {
  const rulesCard = buildInsightFromRules(numbers)

  if (getAiEngine() === "rules") {
    return {
      ...rulesCard,
      debugLog: ["Engine is Rules-only in Settings."],
    }
  }

  const summary = [
    `Income ${numbers.income}, expenses ${numbers.expenses}, available balance ${numbers.balance}`,
    `you owe ${numbers.iOwe}, owed to you ${numbers.owedToMe}`,
    `categories: ${
      numbers.categories.map((c) => `${c.name}:${c.value}`).join(", ") || "none"
    }`,
    numbers.question ? `User asked: """${numbers.question}"""` : "",
  ]
    .filter(Boolean)
    .join(", ")

  return summarizeInsightWithAi(summary, rulesCard)
}
