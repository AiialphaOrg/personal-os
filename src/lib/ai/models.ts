/**
 * On-device AI model catalog for Personal OS (Transformers.js / ONNX).
 * Sizes are approximate download weights for the dtype we load (Hub file sizes).
 *
 * Reality check: a capable instruct LLM under ~50 MB basically does not exist
 * in Transformers.js. TinyStory-class weights (~20 MB) cannot structure finance JSON.
 */

export type AiEngine = "transformers" | "rules"

export type AiPipeline = "text-generation" | "text2text-generation"

export type AiDtype = "q4" | "q4f16" | "q8" | "fp16"

export type AiModelId =
  | "HuggingFaceTB/SmolLM2-135M-Instruct"
  | "Xenova/LaMini-Flan-T5-77M"

export type AiModelOption = {
  id: AiModelId
  name: string
  shortName: string
  params: string
  pipeline: AiPipeline
  /** Preferred dtype for phones */
  dtype: AiDtype
  /** Approximate download size in MB for that dtype (encoder+decoder summed if seq2seq) */
  sizeMb: number
  /** Quality for JSON capture / notes / insight */
  quality: "good" | "balanced" | "light"
  blurb: string
  recommended?: boolean
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: "HuggingFaceTB/SmolLM2-135M-Instruct",
    name: "SmolLM2 Light",
    shortName: "SmolLM2",
    params: "135M",
    pipeline: "text-generation",
    dtype: "q4f16",
    sizeMb: 118,
    quality: "balanced",
    blurb: "Lightweight, fast local model for voice & transaction parsing.",
    recommended: true,
  },
]

export const AI_STORAGE = {
  engine: "pos_ai_engine",
  model: "pos_ai_model",
} as const

export function getAiEngine(): AiEngine {
  const v = localStorage.getItem(AI_STORAGE.engine)
  return v === "transformers" ? "transformers" : "rules"
}

export function setAiEngine(engine: AiEngine) {
  localStorage.setItem(AI_STORAGE.engine, engine)
}

export function getSelectedModelId(): AiModelId {
  const saved = localStorage.getItem(AI_STORAGE.model) as AiModelId | null
  if (saved && AI_MODELS.some((m) => m.id === saved)) return saved
  return AI_MODELS.find((m) => m.recommended)?.id || AI_MODELS[0].id
}

export function setSelectedModelId(id: AiModelId) {
  localStorage.setItem(AI_STORAGE.model, id)
}

export function getModelOption(id?: AiModelId): AiModelOption {
  const target = id || getSelectedModelId()
  return AI_MODELS.find((m) => m.id === target) || AI_MODELS[0]
}

export function formatSizeMb(mb: number) {
  if (mb < 1) return "<1 MB"
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `~${Math.round(mb)} MB`
}

export function detectAiDevice(): "webgpu" | "wasm" {
  return typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm"
}
