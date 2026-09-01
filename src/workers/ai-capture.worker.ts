/**
 * Web Worker: Transformers.js for Personal OS.
 *
 * Three jobs (all return JSON):
 * 1. parse    — voice → expense / income / task / transfer fields
 * 2. note     — voice → { title, content } for Planner notes
 * 3. insight  — spending summary (or spoken question) → { headline, advice, risk }
 *
 * Model id / dtype / pipeline come from Settings (via load message).
 *
 * @see https://huggingface.co/docs/transformers.js/en/tutorials/react
 * @see https://huggingface.co/docs/transformers.js/en/guides/dtypes
 */

import { pipeline, env } from "@huggingface/transformers"

env.allowLocalModels = false
env.useBrowserCache = true

type PipelineKind = "text-generation" | "text2text-generation"

type WorkerIn =
  | {
      type: "load"
      modelId?: string
      dtype?: string
      pipeline?: PipelineKind
      force?: boolean
    }
  | { type: "status" }
  | { type: "parse"; id: string; text: string }
  | { type: "note"; id: string; text: string }
  | { type: "insight"; id: string; summary: string }

type WorkerOut =
  | { type: "progress"; status: string; file?: string; progress?: number }
  | {
      type: "ready"
      modelId: string
      dtype: string
      device: string
      pipeline: PipelineKind
    }
  | {
      type: "status"
      ready: boolean
      modelId: string
      dtype: string
      device: string
      pipeline: PipelineKind
      loading: boolean
    }
  | { type: "error"; message: string }
  | { type: "result"; id: string; json: Record<string, unknown>; raw: string }
  | { type: "fallback"; id: string; reason: string }

const DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
const DEFAULT_DTYPE = "q4f16"
const DEFAULT_PIPELINE: PipelineKind = "text-generation"

let modelId = DEFAULT_MODEL
let dtype = DEFAULT_DTYPE
let pipelineKind: PipelineKind = DEFAULT_PIPELINE
let device: "webgpu" | "wasm" = "wasm"
let generator: Awaited<ReturnType<typeof pipeline>> | null = null
let loading: Promise<void> | null = null

function detectDevice(): "webgpu" | "wasm" {
  return typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm"
}

function postStatus() {
  self.postMessage({
    type: "status",
    ready: Boolean(generator),
    modelId,
    dtype,
    device,
    pipeline: pipelineKind,
    loading: Boolean(loading),
  } satisfies WorkerOut)
}

async function loadPipeline(targetDevice: "webgpu" | "wasm") {
  return pipeline(pipelineKind, modelId, {
    dtype,
    device: targetDevice,
    progress_callback: (data: { status?: string; file?: string; progress?: number }) => {
      self.postMessage({
        type: "progress",
        status: data.status || "loading",
        file: data.file,
        progress: data.progress,
      } satisfies WorkerOut)
    },
  } as any)
}

async function ensureModel(force = false) {
  if (generator && !force) return
  if (loading) return loading

  loading = (async () => {
    generator = null
    device = detectDevice()

    self.postMessage({
      type: "progress",
      status: `Loading ${modelId} (${dtype} · ${pipelineKind} · ${device})…`,
    } satisfies WorkerOut)

    try {
      generator = await loadPipeline(device)
      self.postMessage({
        type: "ready",
        modelId,
        dtype,
        device,
        pipeline: pipelineKind,
      } satisfies WorkerOut)
    } catch {
      try {
        device = "wasm"
        generator = await loadPipeline("wasm")
        self.postMessage({
          type: "ready",
          modelId,
          dtype,
          device,
          pipeline: pipelineKind,
        } satisfies WorkerOut)
      } catch (err2) {
        generator = null
        self.postMessage({
          type: "error",
          message: err2 instanceof Error ? err2.message : "Failed to load model",
        } satisfies WorkerOut)
      }
    } finally {
      loading = null
      postStatus()
    }
  })()

  return loading
}

function applyConfig(msg: Extract<WorkerIn, { type: "load" }>) {
  const nextId = msg.modelId || modelId
  const nextDtype = msg.dtype || dtype
  const nextPipe = msg.pipeline || pipelineKind
  const changed =
    nextId !== modelId || nextDtype !== dtype || nextPipe !== pipelineKind || !generator

  modelId = nextId
  dtype = nextDtype
  pipelineKind = nextPipe
  return changed
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  const slice = candidate.slice(start, end + 1)
  try {
    return JSON.parse(slice) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")) as Record<
        string,
        unknown
      >
    } catch {
      return null
    }
  }
}

function readGenerated(output: any): string {
  const g = output?.[0]?.generated_text
  if (Array.isArray(g)) {
    const last = g.at?.(-1)
    if (last?.content) return String(last.content)
  }
  if (typeof g === "string") return g
  if (typeof output?.[0]?.summary_text === "string") return output[0].summary_text
  return String(g ?? "")
}

async function generateJson(
  system: string,
  user: string,
  maxTokens = 160
): Promise<{ json: Record<string, unknown> | null; raw: string }> {
  await ensureModel()
  if (!generator) return { json: null, raw: "" }

  let output: any

  if (pipelineKind === "text2text-generation") {
    const prompt = `${system}\n\n${user}\n\nJSON:`
    output = await (generator as any)(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.1,
      do_sample: false,
    })
  } else {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ]
    output = await (generator as any)(messages, {
      max_new_tokens: maxTokens,
      temperature: 0.1,
      do_sample: false,
    })
  }

  const raw = readGenerated(output)
  return { json: extractJson(raw), raw }
}

const CAPTURE_SYSTEM = `You convert spoken personal-finance / planner commands into JSON only.
Return ONE JSON object, no markdown, no explanation.
Schema:
{
  "type": "expense" | "income" | "task" | "transfer" | "bill" | "i_owe" | "owed_to_me" | "unknown",
  "title": string,
  "person": string | null,
  "amount": number | null,
  "wallet": "cash" | "bank" | "savings" | null,
  "fromWallet": "cash" | "bank" | "savings" | null,
  "toWallet": "cash" | "bank" | "savings" | null,
  "category": string | null,
  "dueDate": string | null,
  "note": string | null
}
Rules:
- amounts are numbers without currency symbols (2000 not "₦2000"; "2k" => 2000)
- transfer moves money between wallets (fromWallet -> toWallet)
- "I owe X" => type i_owe, person X
- "X owes me" / "client will pay" / "lent to X" => type owed_to_me, person X
- bill has dueDate when mentioned
- task has amount null
- if unsure, type "unknown" and put the text in title`

const NOTE_SYSTEM = `You clean up a spoken personal note into JSON only.
Return ONE object, no markdown:
{"type":"note","title":string,"content":string}
- title: 3–6 words summarizing the note
- content: full cleaned note in clear sentences (keep the user's meaning)
- Do not invent facts that were not spoken`

const INSIGHT_SYSTEM = `You are a calm personal-finance coach for one person’s wallet app.
Reply with ONE JSON object only — no markdown fences, no extra text:
{"headline":"short title","advice":"one practical tip","risk":"low"|"medium"|"high"}
Rules:
- Use ONLY the numbers in the user message (income, expenses, balance, debts, categories).
- headline ≤ 6 words; advice ≤ 20 words.
- If the user asked a question, answer that question using the numbers.
- Never invent categories or amounts not listed.
- risk=high if expenses > income or large payables vs balance; else medium/low.`

self.addEventListener("message", async (event: MessageEvent<WorkerIn>) => {
  const msg = event.data
  try {
    if (msg.type === "status") {
      postStatus()
      return
    }

    if (msg.type === "load") {
      const changed = applyConfig(msg)
      await ensureModel(changed || Boolean(msg.force))
      return
    }

    if (msg.type === "parse") {
      const { json, raw } = await generateJson(
        CAPTURE_SYSTEM,
        `Utterance: """${msg.text}"""`,
        160
      )
      if (!json) {
        self.postMessage({ type: "fallback", id: msg.id, reason: "no-json" } satisfies WorkerOut)
        return
      }
      self.postMessage({ type: "result", id: msg.id, json, raw } satisfies WorkerOut)
      return
    }

    if (msg.type === "note") {
      const { json, raw } = await generateJson(
        NOTE_SYSTEM,
        `Spoken note: """${msg.text}"""`,
        220
      )
      if (!json) {
        self.postMessage({ type: "fallback", id: msg.id, reason: "no-json" } satisfies WorkerOut)
        return
      }
      self.postMessage({ type: "result", id: msg.id, json, raw } satisfies WorkerOut)
      return
    }

    if (msg.type === "insight") {
      let { json, raw } = await generateJson(
        INSIGHT_SYSTEM,
        `Context / question:\n${msg.summary}`,
        200
      )
      if (!json) {
        const retry = await generateJson(
          "Reply with one JSON object only.",
          `${msg.summary.slice(0, 400)}\n{"headline":"","advice":"","risk":"low"}`,
          140
        )
        json = retry.json
        raw = retry.raw
      }
      if (!json) {
        self.postMessage({ type: "fallback", id: msg.id, reason: "no-json" } satisfies WorkerOut)
        return
      }
      self.postMessage({ type: "result", id: msg.id, json, raw } satisfies WorkerOut)
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Worker error",
    } satisfies WorkerOut)
    if ("id" in msg) {
      self.postMessage({ type: "fallback", id: msg.id, reason: "error" } satisfies WorkerOut)
    }
  }
})

export {}
