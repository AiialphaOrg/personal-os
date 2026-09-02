import { z } from "zod"

export const quoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  currency: z.string(),
  source: z.string(),
  fetchedAt: z.string(),
  cached: z.boolean(),
})

export type StockQuote = z.infer<typeof quoteSchema>

const LOCAL_CACHE_KEY = "pos_quote_cache"

type LocalCache = Record<
  string,
  { price: number; currency: string; source: string; fetchedAt: string }
>

function readLocalCache(): LocalCache {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as LocalCache
  } catch {
    return {}
  }
}

function writeLocalCache(cache: LocalCache) {
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache))
}

function isFresh(fetchedAt: string, ttlHours = 24) {
  return Date.now() - new Date(fetchedAt).getTime() < ttlHours * 60 * 60 * 1000
}

export function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) || "https://personal-backend-blond.vercel.app"
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/, "")
}

/**
 * Prefer backend (daily MySQL cache). Fall back to localStorage daily cache.
 * Without VITE_API_URL, returns local cache only (manual price if missing).
 */
export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const sym = symbol.trim().toUpperCase()
  const local = readLocalCache()[sym]
  if (local && isFresh(local.fetchedAt)) {
    return {
      symbol: sym,
      price: local.price,
      currency: local.currency,
      source: local.source,
      fetchedAt: local.fetchedAt,
      cached: true,
    }
  }

  const base = getApiBaseUrl()
  if (!base) {
    if (local) {
      return {
        symbol: sym,
        price: local.price,
        currency: local.currency,
        source: local.source,
        fetchedAt: local.fetchedAt,
        cached: true,
      }
    }
    throw new Error("Set VITE_API_URL to refresh stock prices, or enter price manually.")
  }

  const res = await fetch(`${base}/api/quotes/${encodeURIComponent(sym)}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    if (local) {
      return {
        symbol: sym,
        price: local.price,
        currency: local.currency,
        source: local.source,
        fetchedAt: local.fetchedAt,
        cached: true,
      }
    }
    throw new Error(body.error || `Quote failed (${res.status})`)
  }
  const quote = quoteSchema.parse(await res.json())
  const cache = readLocalCache()
  cache[sym] = {
    price: quote.price,
    currency: quote.currency,
    source: quote.source,
    fetchedAt: quote.fetchedAt,
  }
  writeLocalCache(cache)
  return quote
}

export async function fetchQuotesBatch(symbols: string[]): Promise<StockQuote[]> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  const base = getApiBaseUrl()
  if (base && unique.length) {
    try {
      const res = await fetch(`${base}/api/quotes/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: unique }),
      })
      if (res.ok) {
        const data = (await res.json()) as { quotes: unknown[] }
        const quotes = data.quotes.map((q) => quoteSchema.parse(q))
        const cache = readLocalCache()
        for (const q of quotes) {
          cache[q.symbol] = {
            price: q.price,
            currency: q.currency,
            source: q.source,
            fetchedAt: q.fetchedAt,
          }
        }
        writeLocalCache(cache)
        return quotes
      }
    } catch {
      /* fall through to per-symbol */
    }
  }
  const out: StockQuote[] = []
  for (const s of unique) {
    out.push(await fetchQuote(s))
  }
  return out
}

/** Store a manual price in the same local daily cache. */
export function cacheManualQuote(symbol: string, price: number, currency = "USD") {
  const sym = symbol.trim().toUpperCase()
  const cache = readLocalCache()
  cache[sym] = {
    price,
    currency,
    source: "manual",
    fetchedAt: new Date().toISOString(),
  }
  writeLocalCache(cache)
}
