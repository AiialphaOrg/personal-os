import { CaptureSheet, type CaptureSubmit } from "@/components/capture-sheet"
import { getDefaultWalletId } from "@/lib/storage"
import { useUiStore } from "@/stores/ui-store"
import { toast } from "sonner"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"

/** Opens from bottom-nav + anywhere via `useUiStore().openCapture()`. */
export function GlobalQuickCapture() {
  const {
    captureOpen,
    captureType,
    capturePresets,
    closeCapture,
  } = useUiStore()

  const { wallets } = usePosQuery()
  const mutations = usePosMutations()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const defaultWallet = getDefaultWalletId(wallets)

  const onSubmit = async (data: CaptureSubmit) => {
    try {
      if (data.type === "i_owe" || data.type === "owed_to_me") {
        mutations.addDebt.mutateAsync({
          person: data.person || "Someone",
          amount: Number(data.amount) || 0,
          direction: data.type,
          kind: data.debtKind || "loan",
          dueDate: data.dueDate,
          walletId: data.walletId || defaultWallet,
          isCashLoan: true,
          category: data.category,
        }).catch((err: any) => {
          toast.error(err.message || "Failed to sync debt with server")
        })
      } else {
        mutations.addTransaction.mutateAsync({
          title: data.title,
          amount: Number(data.amount) || 0,
          type: data.type,
          category: data.category,
          walletId: data.walletId || defaultWallet,
          fromWallet: data.fromWallet,
          toWallet: data.toWallet,
        }).catch((err: any) => {
          toast.error(err.message || "Failed to sync transaction with server")
        })
      }
      toast.success("Saved")
      closeCapture()
    } catch (err: any) {
      toast.error(err.message || "Failed to save")
    }
  }

  return (
    <CaptureSheet
      open={captureOpen}
      onOpenChange={(open) => {
        if (!open) closeCapture()
      }}
      type={captureType}
      wallets={wallets.filter((w) => w.kind !== "investment")}
      currency={currency}
      defaultWalletId={defaultWallet}
      presets={capturePresets}
      onSubmit={onSubmit}
    />
  )
}
