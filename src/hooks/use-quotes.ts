import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchQuote, fetchQuotesBatch } from "@/lib/quotes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { upsertWalletThunk } from "@/store/dataSlice"

export function useInvestmentQuotes(enabled = true) {
  const wallets = useAppSelector((state) => state.data.wallets)
  const dispatch = useAppDispatch()
  const symbols = wallets
    .filter((w) => w.kind === "investment" && w.symbol)
    .map((w) => w.symbol!)

  return useQuery({
    queryKey: ["quotes", symbols.sort().join(",")],
    queryFn: async () => {
      if (!symbols.length) return []
      const quotes = await fetchQuotesBatch(symbols)
      for (const q of quotes) {
        const matchingWallets = wallets.filter(
          (w) => w.kind === "investment" && w.symbol === q.symbol
        )
        for (const w of matchingWallets) {
          const newBalance = (w.shares || 0) * q.price
          void dispatch(
            upsertWalletThunk({
              ...w,
              balance: newBalance,
              lastPrice: q.price,
              lastPriceCurrency: q.currency,
            })
          )
        }
      }
      return quotes
    },
    enabled: enabled && symbols.length > 0,
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: 12 * 60 * 60 * 1000,
  })
}

export function useRefreshQuote() {
  const qc = useQueryClient()
  const dispatch = useAppDispatch()
  const wallets = useAppSelector((state) => state.data.wallets)

  return useMutation({
    mutationFn: async (input: { walletId: string; symbol: string }) => {
      const quote = await fetchQuote(input.symbol)
      const target = wallets.find((w) => w.id === input.walletId)
      if (target) {
        const newBalance = (target.shares || 0) * quote.price
        await dispatch(
          upsertWalletThunk({
            ...target,
            balance: newBalance,
            lastPrice: quote.price,
            lastPriceCurrency: quote.currency,
          })
        )
      }
      return quote
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}
