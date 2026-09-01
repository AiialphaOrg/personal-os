/**
 * On-device AI for Personal OS — Deterministic Rule Parser + Local AI Fallback.
 *
 * Architecture:
 *   Speech / Text
 *        ↓
 *   Deterministic Rule-Based Parser (Word numbers + Pattern Regex)
 *        ↓ (If confidence < 0.7)
 *   On-Device Tiny Local AI Model
 *        ↓
 *   Structured Intent -> Pre-fill Capture Sheet for User Confirmation
 */

import { parseUtteranceWithAi } from "@/lib/ai/capture-client"

export type CaptureIntent = {
  type:
    | "expense"
    | "income"
    | "task"
    | "transfer"
    | "i_owe"
    | "owed_to_me"
    | "bill"
    | "unknown"
  title: string
  amount: number | null
  fromWallet?: string
  toWallet?: string
  wallet?: string
  category?: string
  note?: string
  person?: string
  dueDate?: string
  confidence: number
  source: "rules" | "on-device-ai"
}

const SMALL_NUMS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

/** Converts number words like "fifty thousand" -> "50000", "20k" -> "20000" */
export function parseWordNumbers(text: string): string {
  let s = text.toLowerCase()

  // Replace shorthand 'k' e.g. 50k -> 50000, 20k -> 20000
  s = s.replace(/(\d+)\s*k\b/gi, (_, num) => String(Number(num) * 1000))

  // Number phrase regex
  s = s.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\s*(hundred|thousand|million)?\s*(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine)?\s*(thousand|million)?\b/gi,
    (match) => {
      const words = match.toLowerCase().trim().split(/\s+/)
      let total = 0
      let current = 0
      for (const w of words) {
        if (SMALL_NUMS[w] !== undefined) {
          current += SMALL_NUMS[w]
        } else if (w === "hundred") {
          current = (current || 1) * 100
        } else if (w === "thousand") {
          total += (current || 1) * 1000
          current = 0
        } else if (w === "million") {
          total += (current || 1) * 1000000
          current = 0
        }
      }
      const finalVal = total + current
      return finalVal > 0 ? String(finalVal) : match
    }
  )

  return s
}

/** Extract date indicator ("today", "yesterday", "tomorrow", "next week") */
function extractDate(text: string): string | undefined {
  const d = new Date()
  if (/\b(today)\b/i.test(text)) {
    return d.toISOString().split("T")[0]
  }
  if (/\b(yesterday)\b/i.test(text)) {
    d.setDate(d.getDate() - 1)
    return d.toISOString().split("T")[0]
  }
  if (/\b(tomorrow)\b/i.test(text)) {
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }
  if (/\bnext\s+week\b/i.test(text)) {
    d.setDate(d.getDate() + 7)
    return d.toISOString().split("T")[0]
  }
  return undefined
}

/** Rule-based voice/text capture — 0 MB, ultra-fast, deterministic. */
export function parseCaptureRules(transcript: string): CaptureIntent {
  const rawText = transcript.trim()
  const text = parseWordNumbers(rawText)

  console.group("%c🎙️ Voice Capture Rule Parser Diagnostic", "color: #3b82f6; font-weight: bold;")
  console.log("%cRaw Speech Transcript:", "color: #64748b;", rawText)
  console.log("%cNormalized (Numbers Parsed):", "color: #059669; font-weight: bold;", text)

  const logResult = (ruleName: string, intent: CaptureIntent) => {
    console.log("%cMatched Pattern:", "color: #8b5cf6; font-weight: bold;", ruleName)
    console.log("%cExtracted Intent Object:", "color: #10b981; font-weight: bold;", intent)
    console.groupEnd()
    return intent
  }

  // 1. Paid me pattern e.g. "John paid me 50000 today for the website" or "Ada paid me 25000"
  const paidMeMatch = text.match(
    /\b([a-z][a-z0-9]+)\s+paid\s+me\s+(?:₦|naira|ngn|\$)?\s*(\d+)(?:\s+(today|yesterday|tomorrow))?(?:\s+for\s+(.+))?/i
  )
  if (paidMeMatch) {
    const person = paidMeMatch[1].charAt(0).toUpperCase() + paidMeMatch[1].slice(1)
    const amount = Number(paidMeMatch[2])
    const dateStr = paidMeMatch[3] ? extractDate(paidMeMatch[3]) : extractDate(text)
    const desc = paidMeMatch[4] ? paidMeMatch[4].trim() : "Payment received"
    return logResult("Rule #1: Paid Me Pattern", {
      type: "income",
      title: `${person} payment`,
      amount,
      person,
      note: desc,
      category: extractCategory(desc) || "work",
      dueDate: dateStr,
      confidence: 0.95,
      source: "rules",
    })
  }

  // 2. Borrowed / Lent given pattern e.g. "I borrowed Ada 20k yesterday" or "I lent Ada 20k"
  const borrowedToMatch = text.match(
    /\bi\s+(?:borrowed|lent|gave\s+loan\s+to)\s+([a-z][a-z0-9]+)\s+(?:₦|naira|ngn|\$)?\s*(\d+)(?:\s+(today|yesterday|tomorrow))?/i
  )
  if (borrowedToMatch) {
    const person = borrowedToMatch[1].charAt(0).toUpperCase() + borrowedToMatch[1].slice(1)
    const amount = Number(borrowedToMatch[2])
    const dateStr = borrowedToMatch[3] ? extractDate(borrowedToMatch[3]) : extractDate(text)
    return logResult("Rule #2: Loan Given / Receivable Pattern", {
      type: "owed_to_me",
      title: person,
      person,
      amount,
      category: "loan",
      dueDate: dateStr,
      confidence: 0.95,
      source: "rules",
    })
  }

  // 3. Borrowed from pattern e.g. "I borrowed 100000 from Musa"
  const borrowedFromMatch = text.match(
    /\bi\s+(?:borrowed|took\s+loan)\s+(?:₦|naira|ngn|\$)?\s*(\d+)\s+from\s+([a-z][a-z0-9]+)(?:\s+(today|yesterday|tomorrow))?/i
  )
  if (borrowedFromMatch) {
    const amount = Number(borrowedFromMatch[1])
    const person = borrowedFromMatch[2].charAt(0).toUpperCase() + borrowedFromMatch[2].slice(1)
    const dateStr = borrowedFromMatch[3] ? extractDate(borrowedFromMatch[3]) : extractDate(text)
    return logResult("Rule #3: Loan Taken / Payable Pattern", {
      type: "i_owe",
      title: person,
      person,
      amount,
      dueDate: dateStr,
      confidence: 0.95,
      source: "rules",
    })
  }

  // 4. Owes me pattern e.g. "John owes me 15000"
  const owesMeMatch = text.match(
    /\b([a-z][a-z0-9]+)\s+owes?\s+me\s+(?:₦|naira|ngn|\$)?\s*(\d+)/i
  )
  if (owesMeMatch) {
    const person = owesMeMatch[1].charAt(0).toUpperCase() + owesMeMatch[1].slice(1)
    const amount = Number(owesMeMatch[2])
    return logResult("Rule #4: Owes Me Pattern", {
      type: "owed_to_me",
      title: person,
      person,
      amount,
      confidence: 0.95,
      source: "rules",
    })
  }

  // 5. Explicit command pattern e.g. "Record expense 5000 for fuel"
  const recordCmdMatch = text.match(
    /\brecord\s+(expense|income|payable|receivable)\s+(?:₦|naira|ngn|\$)?\s*(\d+)(?:\s+for\s+(.+))?/i
  )
  if (recordCmdMatch) {
    const rawKind = recordCmdMatch[1].toLowerCase()
    const amount = Number(recordCmdMatch[2])
    const rawTitle = recordCmdMatch[3] ? recordCmdMatch[3].trim() : ""
    const type = rawKind === "income" ? "income" : rawKind === "payable" ? "i_owe" : rawKind === "receivable" ? "owed_to_me" : "expense"
    return logResult("Rule #5: Explicit Command Pattern", {
      type,
      title: rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : "Recorded Transaction",
      amount,
      category: extractCategory(rawTitle) || (type === "expense" ? "general" : "work"),
      confidence: 0.95,
      source: "rules",
    })
  }

  // 6. Wallet transfer pattern
  const transferMatch = text.match(
    /(?:transfer|move|send)\s*(?:₦|naira|ngn|\$)?\s*([\d,]+)?\s*(?:from\s+)?(cash|bank|savings)?\s*(?:to|into)\s*(cash|bank|savings)/i
  )
  if (transferMatch || /\b(transfer|move)\b/.test(text)) {
    const amount = transferMatch?.[1]
      ? Number(transferMatch[1].replace(/,/g, ""))
      : extractAmount(text)
    return logResult("Rule #6: Wallet Transfer Pattern", {
      type: "transfer",
      title: "Wallet transfer",
      amount,
      fromWallet: (transferMatch?.[2] || "bank").toLowerCase(),
      toWallet: (transferMatch?.[3] || "cash").toLowerCase(),
      confidence: transferMatch ? 0.9 : 0.5,
      source: "rules",
    })
  }

  // 7. General receivables pattern
  if (
    /\b(will\s+receive|receiving|receive|expecting|receivable)\b/i.test(text) ||
    /\bowes?\s+me\b|\blent\b|\bloan\s+to\b/i.test(text)
  ) {
    const person = extractPerson(text) || "Someone"
    const amount = extractAmount(text)
    const wallet = extractWallet(text)
    const category = extractCategory(text) || "work"
    const dueDate = extractDate(text)
    return logResult("Rule #7: General Receivables Pattern", {
      type: "owed_to_me",
      title: person,
      person,
      amount,
      wallet,
      category,
      dueDate,
      confidence: amount ? 0.9 : 0.6,
      source: "rules",
    })
  }

  // 8. General payables pattern
  if (/\bi\s+owe\b|\bowing\b|\bpayable\b|\bneed\b\s+to\s+pay\b/i.test(text)) {
    const personMatch = text.match(/\b(?:owe|pay)\s+([a-z][a-z\s]{0,24}?)(?:\s+\d|\s*$)/i)
    const person = (personMatch?.[1] || extractPerson(text) || "Someone").trim()
    const amount = extractAmount(text)
    const wallet = extractWallet(text)
    const dueDate = extractDate(text)
    return logResult("Rule #8: General Payables Pattern", {
      type: "i_owe",
      title: person,
      person,
      amount,
      wallet,
      dueDate,
      confidence: amount ? 0.9 : 0.6,
      source: "rules",
    })
  }

  // 9. Bill pattern
  if (/\b(bill|due|rent|subscription)\b/.test(text) && extractAmount(text)) {
    return logResult("Rule #9: Bill Pattern", {
      type: "bill",
      title: cleanTitle(text) || "Bill",
      amount: extractAmount(text),
      wallet: extractWallet(text),
      category: extractCategory(text) || "utilities",
      dueDate: extractDate(text),
      confidence: 0.85,
      source: "rules",
    })
  }

  // 10. Task pattern
  if (/\b(remind|task|todo|remember)\b/.test(text)) {
    return logResult("Rule #10: Task Pattern", {
      type: "task",
      title: cleanTitle(text),
      amount: null,
      dueDate: extractDate(text),
      confidence: 0.85,
      source: "rules",
    })
  }

  // 11. General income pattern
  if (/\b(received|income|salary|got paid|earned)\b/.test(text)) {
    const amount = extractAmount(text)
    return logResult("Rule #11: General Income Pattern", {
      type: "income",
      title: cleanTitle(text) || "Income",
      amount,
      wallet: extractWallet(text),
      category: extractCategory(text) || "salary",
      confidence: amount ? 0.85 : 0.5,
      source: "rules",
    })
  }

  // 12. Fallback expense pattern
  const amount = extractAmount(text)
  if (amount || /\b(spent|paid|bought|buy|expense)\b/.test(text)) {
    return logResult("Rule #12: Expense Pattern", {
      type: "expense",
      title: cleanTitle(text) || "Expense",
      amount,
      wallet: extractWallet(text),
      category: extractCategory(text) || "general",
      confidence: amount ? 0.85 : 0.5,
      source: "rules",
    })
  }

  return logResult("Fallback: Unknown Pattern", {
    type: "unknown",
    title: transcript.trim() || "Capture",
    amount: null,
    confidence: 0.2,
    source: "rules",
  })
}

function extractPerson(text: string): string | null {
  const m = text.match(/\b(?:to|from|client|for)\s+([a-z][a-z]+(?:\s+[a-z]+)?)\b/i)
  if (!m) return null
  const word = m[1].toLowerCase()
  if (["cash", "bank", "savings", "freelance", "job", "work", "lunch", "fuel", "groceries"].includes(word)) return null
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function extractWallet(text: string): string | undefined {
  if (/\b(cash)\b/i.test(text)) return "cash"
  if (/\b(bank|card|transfer)\b/i.test(text)) return "bank"
  if (/\b(savings|vault)\b/i.test(text)) return "savings"
  return undefined
}

function extractCategory(text: string): string | undefined {
  if (/\b(freelance|project|gig|client|work|website)\b/i.test(text)) return "work"
  if (/\b(food|lunch|dinner|breakfast|groceries|restaurant)\b/i.test(text)) return "food"
  if (/\b(fuel|petrol|transport|cab|uber|taxi)\b/i.test(text)) return "transport"
  if (/\b(salary|paycheck|income)\b/i.test(text)) return "salary"
  if (/\b(rent|utilities|bill|subscription|electricity)\b/i.test(text)) return "utilities"
  return undefined
}

function extractAmount(text: string): number | null {
  const amountMatch = text.match(
    /(?:₦|naira|ngn|\$)?\s*([\d,]+(?:\.\d+)?)\s*(?:k\b|naira|ngn|bucks|dollars)?/i
  )
  if (!amountMatch) return null
  let amount = Number(amountMatch[1].replace(/,/g, ""))
  if (Number.isNaN(amount)) return null
  if (/\dk\b/i.test(text) || amountMatch[0].toLowerCase().includes("k")) {
    if (amount < 1000) amount *= 1000
  }
  return amount
}

function cleanTitle(text: string): string {
  let title = text
    .replace(/(?:₦|naira|ngn|\$)?\s*[\d,]+(?:\.\d+)?\s*(?:k|naira|ngn)?/gi, " ")
    .replace(
      /\b(spent|spend|paid|pay|bought|buy|received|income|salary|transfer|move|from|to|into|for|on|at|a|an|the|of|remind|me|to|task|owe|owes|client|loan|lent)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
  if (!title) return ""
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/** Public entry used by Today / Money / Planner / voice. */
export async function interpretCapture(transcript: string): Promise<CaptureIntent> {
  return parseUtteranceWithAi(transcript)
}

export function getAiEngineStatus(): {
  engine: string
  ready: boolean
  note: string
} {
  const engine = localStorage.getItem("pos_ai_engine") || "transformers"
  const model = localStorage.getItem("pos_ai_model") || "HuggingFaceTB/SmolLM2-135M-Instruct"
  return {
    engine,
    ready: true,
    note:
      engine === "rules"
        ? "Deterministic pattern parser (0 MB, instant local parsing)."
        : `Transformers.js (${model}) in Web Worker; rule-based parser active as primary instant parser.`,
  }
}
