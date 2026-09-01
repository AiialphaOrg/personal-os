import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Sparkles, Loader2, Lock, Mail, User, AlertCircle, Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useAppDispatch } from "@/store/hooks"
import { loginDirectThunk, registerThunk, googleAuthThunk, setAuthSession } from "@/store/authSlice"
import { fetchPosData } from "@/store/dataSlice"
import { startNeonGoogleAuth, handleNeonAuthCallback } from "@/lib/neon-auth"

function OfficialGoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Listen for Neon Auth redirect callback on page load
  useEffect(() => {
    const callbackSession = handleNeonAuthCallback()
    if (callbackSession) {
      dispatch(setAuthSession(callbackSession))
      finishAuth(callbackSession.user.name)
    }
  }, [dispatch])

  const finishAuth = (userName: string) => {
    dispatch(fetchPosData())
    toast.success(`Welcome, ${userName}!`)
    navigate("/home", { replace: true })
  }

  const handleGoogle = async () => {
    setErrorMessage(null)
    setGoogleLoading(true)
    try {
      // 1. Try Neon Auth Google Redirect if VITE_NEON_AUTH_URL is configured
      const neonResult = await startNeonGoogleAuth()
      if (neonResult.handled) {
        return
      }

      // 2. Fallback to direct backend Google auth endpoint
      const result = await dispatch(googleAuthThunk({ email: "user@gmail.com", name: "Google Account" })).unwrap()
      setGoogleLoading(false)
      finishAuth(result.user.name)
    } catch (err: any) {
      setGoogleLoading(false)
      const msg = typeof err === "string" ? err : err?.message || "Google sign-in failed"
      setErrorMessage(msg)
      toast.error(msg)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !email.includes("@")) {
      const msg = "Please enter a valid email address."
      setErrorMessage(msg)
      toast.error(msg)
      return
    }
    if (!password || password.length < 6) {
      const msg = "Password must be at least 6 characters."
      setErrorMessage(msg)
      toast.error(msg)
      return
    }

    setLoading(true)
    try {
      if (mode === "register") {
        const res = await dispatch(registerThunk({ email, password, name })).unwrap()
        finishAuth(res.user.name)
      } else {
        const res = await dispatch(loginDirectThunk({ email, password })).unwrap()
        finishAuth(res.user.name)
      }
    } catch (err: any) {
      setLoading(false)
      const msg = typeof err === "string" ? err : err?.message || `${mode === "register" ? "Registration" : "Login"} failed`
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1 shadow-xs border border-primary/20">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Personal OS</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to manage your finances & daily agenda"
            : "Create your account to start tracking"}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 rounded-xl bg-muted/70 p-1 text-sm font-semibold border border-border">
        <button
          type="button"
          onClick={() => {
            setMode("login")
            setErrorMessage(null)
          }}
          className={cn(
            "rounded-lg py-2 transition-all text-center text-sm font-medium",
            mode === "login"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register")
            setErrorMessage(null)
          }}
          className={cn(
            "rounded-lg py-2 transition-all text-center text-sm font-medium",
            mode === "register"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Create Account
        </button>
      </div>

      {/* Error Alert Box Feedback */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Google 1-Tap */}
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl font-medium text-sm transition-all active:scale-[0.99] border-border bg-card hover:bg-muted/50"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
      >
        {googleLoading ? (
          <Loader2 className="size-4.5 animate-spin mr-2" />
        ) : (
          <OfficialGoogleLogo className="size-4.5 shrink-0 mr-2.5" />
        )}
        Continue with Google
      </Button>

      <FieldSeparator className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        or continue with email
      </FieldSeparator>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup className="space-y-3.5">
          {mode === "register" && (
            <Field>
              <FieldLabel className="text-xs font-medium text-foreground mb-1.5 block">Full Name</FieldLabel>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. Ahmad Ismail"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl text-sm pl-10.5 pr-4 border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <User className="size-4 absolute left-3.5 top-4 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
          )}

          <Field>
            <FieldLabel className="text-xs font-medium text-foreground mb-1.5 block">Email Address</FieldLabel>
            <div className="relative">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-12 rounded-xl text-sm pl-10.5 pr-4 border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <Mail className="size-4 absolute left-3.5 top-4 text-muted-foreground pointer-events-none" />
            </div>
          </Field>

          <Field>
            <FieldLabel className="text-xs font-medium text-foreground mb-1.5 block">Password</FieldLabel>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                className="h-12 rounded-xl text-sm pl-10.5 pr-11 border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <Lock className="size-4 absolute left-3.5 top-4 text-muted-foreground pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-sm font-semibold shadow-xs transition-transform active:scale-[0.99] mt-2"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <Loader2 className="size-4.5 animate-spin mr-2" />
          ) : null}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </div>
  )
}
