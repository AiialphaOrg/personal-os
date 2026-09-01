import { create } from "zustand"
import type { CaptureType } from "@/lib/storage"

type CapturePresets = {
  title?: string
  amount?: string
  fromWallet?: string
  toWallet?: string
  person?: string
}

/** UI-only state (modals, ephemeral flags). Domain data stays in localStorage. */
type UiState = {
  walletFormOpen: boolean
  editingWalletId: string | null
  openWalletForm: (id?: string | null) => void
  closeWalletForm: () => void

  captureOpen: boolean
  captureType: CaptureType
  capturePresets?: CapturePresets
  openCapture: (type?: CaptureType, presets?: CapturePresets) => void
  closeCapture: () => void
}

export const useUiStore = create<UiState>((set) => ({
  walletFormOpen: false,
  editingWalletId: null,
  openWalletForm: (id = null) => set({ walletFormOpen: true, editingWalletId: id }),
  closeWalletForm: () => set({ walletFormOpen: false, editingWalletId: null }),

  captureOpen: false,
  captureType: "expense",
  capturePresets: undefined,
  openCapture: (type = "expense", presets) =>
    set({ captureOpen: true, captureType: type, capturePresets: presets }),
  closeCapture: () => set({ captureOpen: false, capturePresets: undefined }),
}))
