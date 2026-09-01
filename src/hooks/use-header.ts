import { useEffect } from "react"
import { useHeaderStore } from "@/stores/header-store"
import type { ReactNode } from "react"

export function useHeader(config: {
  title: string
  leftNode?: ReactNode
  rightNode?: ReactNode
}) {
  const setHeader = useHeaderStore((state) => state.setHeader)

  useEffect(() => {
    setHeader({
      title: config.title,
      leftNode: config.leftNode,
      rightNode: config.rightNode,
    })
  }, [config.title, config.leftNode, config.rightNode, setHeader])
}
