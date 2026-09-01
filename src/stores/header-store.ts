import { create } from "zustand"
import type { ReactNode } from "react"

export interface HeaderState {
  title: string
  leftNode?: ReactNode
  rightNode?: ReactNode
  setHeader: (config: { title: string; leftNode?: ReactNode; rightNode?: ReactNode }) => void
  clearHeader: () => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: "",
  leftNode: undefined,
  rightNode: undefined,
  setHeader: (config) => set(config),
  clearHeader: () => set({ title: "", leftNode: undefined, rightNode: undefined }),
}))
