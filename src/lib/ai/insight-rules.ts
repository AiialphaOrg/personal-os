/**
 * Deterministic insight from spending numbers — always available offline.
 * Used when Transformers.js fails, is cold, or engine is "rules".
 */

export type InsightCard = {
  headline: string
  advice: string
  risk: "low" | "medium" | "high"
  source: "rules" | "on-device-ai"
  debugLog?: string[]
}

export type InsightNumbers = {
  income: number
  expenses: number
  balance: number
  iOwe: number
  owedToMe: number
  categories: { name: string; value: number; pct: number }[]
  currency?: string
  question?: string
}

function fmt(n: number, currency = "₦") {
  return `${currency}${Math.round(n).toLocaleString()}`
}

/** Build a grounded insight from real wallet / spend data. */
export function buildInsightFromRules(n: InsightNumbers): InsightCard {
  const currency = n.currency || "₦"
  const net = n.income - n.expenses
  const top = n.categories[0]
  const q = (n.question || "").toLowerCase()

  // Voice question routing
  if (q.includes("owe") || q.includes("debt") || q.includes("payable")) {
    if (n.iOwe <= 0 && n.owedToMe <= 0) {
      return {
        headline: "No open debts",
        advice: "You’re clear on payables and receivables right now.",
        risk: "low",
        source: "rules",
      }
    }
    return {
      headline: n.iOwe > n.owedToMe ? "Payables need attention" : "Money coming back",
      advice: `You owe ${fmt(n.iOwe, currency)}; owed to you ${fmt(n.owedToMe, currency)}.`,
      risk: n.iOwe > n.balance * 0.3 ? "high" : n.iOwe > 0 ? "medium" : "low",
      source: "rules",
    }
  }

  if (q.includes("save") || q.includes("saving") || q.includes("budget")) {
    const saveRate = n.income > 0 ? Math.round((net / n.income) * 100) : 0
    return {
      headline: saveRate >= 20 ? "Solid save rate" : saveRate > 0 ? "Thin savings" : "Not saving yet",
      advice:
        n.income > 0
          ? `Net is ${saveRate}% of income. Aim for 20%+ when you can.`
          : "Log income so savings rate can be measured.",
      risk: saveRate < 0 ? "high" : saveRate < 10 ? "medium" : "low",
      source: "rules",
    }
  }

  if (q.includes("food") || q.includes("category") || q.includes("spend on")) {
    if (top) {
      return {
        headline: `${top.name} leads spend`,
        advice: `${top.name} is ${top.pct}% of expenses (${fmt(top.value, currency)}). Cut there first if needed.`,
        risk: top.pct >= 40 ? "medium" : "low",
        source: "rules",
      }
    }
  }

  // Default card from numbers
  if (n.expenses <= 0 && n.income <= 0) {
    return {
      headline: "Not enough data yet",
      advice: "Log a few expenses and income entries, then refresh.",
      risk: "low",
      source: "rules",
    }
  }

  if (net < 0) {
    return {
      headline: "Spending ahead of income",
      advice: `You’re ${fmt(Math.abs(net), currency)} over logged income. Pause non-essentials this week.`,
      risk: "high",
      source: "rules",
    }
  }

  if (top && top.pct >= 40) {
    return {
      headline: `${capitalize(top.name)} dominates spend`,
      advice: `${top.pct}% of expenses is ${top.name}. Cap that category to free cash.`,
      risk: "medium",
      source: "rules",
    }
  }

  if (n.iOwe > 0 && n.iOwe > n.balance * 0.25) {
    return {
      headline: "Debts vs balance",
      advice: `Payables ${fmt(n.iOwe, currency)} are high vs balance ${fmt(n.balance, currency)}. Settle soon.`,
      risk: "high",
      source: "rules",
    }
  }

  if (n.owedToMe > 0) {
    return {
      headline: "Collect what’s owed",
      advice: `${fmt(n.owedToMe, currency)} owed to you. Follow up on clients or loans.`,
      risk: "medium",
      source: "rules",
    }
  }

  return {
    headline: "Income covers spending",
    advice: `Net ${fmt(net, currency)}. Balance ${fmt(n.balance, currency)}. Keep logging daily.`,
    risk: "low",
    source: "rules",
  }
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Parse the compact summary string Insights used to send the worker. */
export function parseInsightSummaryString(summary: string): Partial<InsightNumbers> {
  const income = Number(summary.match(/Income\s+([\d.]+)/i)?.[1] || 0)
  const expenses = Number(summary.match(/expenses\s+([\d.]+)/i)?.[1] || 0)
  const balance = Number(summary.match(/balance\s+([\d.]+)/i)?.[1] || 0)
  const iOwe = Number(summary.match(/you owe\s+([\d.]+)/i)?.[1] || 0)
  const owedToMe = Number(summary.match(/owed to you\s+([\d.]+)/i)?.[1] || 0)
  const question = summary.match(/User asked:\s*"""([\s\S]*?)"""/i)?.[1]?.trim()
  const catPart = summary.match(/categories:\s*(.+)$/i)?.[1] || ""
  const categories: InsightNumbers["categories"] = []
  if (catPart && catPart !== "none") {
    let total = 0
    const pairs = catPart.split(",").map((p) => p.trim()).filter(Boolean)
    for (const p of pairs) {
      const [name, val] = p.split(":")
      const value = Number(val) || 0
      total += value
      if (name) categories.push({ name: name.trim(), value, pct: 0 })
    }
    for (const c of categories) {
      c.pct = total > 0 ? Math.round((c.value / total) * 100) : 0
    }
    categories.sort((a, b) => b.value - a.value)
  }
  return { income, expenses, balance, iOwe, owedToMe, categories, question }
}
