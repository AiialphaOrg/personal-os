import { useEffect, useState } from "react"

/**
 * Keeps focused inputs above the mobile keyboard by tracking
 * visualViewport inset and scrolling the active field into view.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(next)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    window.addEventListener("focusin", update)
    window.addEventListener("focusout", update)

    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("focusin", update)
      window.removeEventListener("focusout", update)
    }
  }, [])

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return

      // Delay so the keyboard animation can start first
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 280)
    }

    document.addEventListener("focusin", onFocusIn)
    return () => document.removeEventListener("focusin", onFocusIn)
  }, [])

  return inset
}
