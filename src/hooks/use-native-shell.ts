import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

/** Native shell polish: status bar + keyboard resize when running in Capacitor. */
export function useNativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false

    ;(async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar")
        if (cancelled) return
        await StatusBar.setStyle({ style: Style.Default })
      } catch {
        /* optional plugin */
      }

      try {
        const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard")
        if (cancelled) return
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
        await Keyboard.setScroll({ isDisabled: false })
      } catch {
        /* optional plugin */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
