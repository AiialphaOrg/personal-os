import { useKeyboardInset } from "@/hooks/use-keyboard-inset"

interface AuthShellProps {
  children: React.ReactNode
  headline?: string
  subcopy?: string
}

export function AuthShell({ children }: AuthShellProps) {
  const keyboardInset = useKeyboardInset()

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden lg:flex-row">
 
      <div
        className="flex flex-1 items-start justify-center overflow-y-auto bg-background px-4 py-8 sm:px-8 lg:items-center lg:px-12 lg:py-10"
        style={{ paddingBottom: `max(2rem, ${keyboardInset + 24}px)` }}
      >
        <div className="w-full max-w-md space-y-5">{children}</div>
      </div>
    </div>
  )
}
