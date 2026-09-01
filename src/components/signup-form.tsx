import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Eye, EyeOff, Loader2, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function GoogleIcon({ className }: { className?: string }) {
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

import { useAppDispatch } from "@/store/hooks"
import { registerThunk, googleAuthThunk } from "@/store/authSlice"
import { fetchPosData } from "@/store/dataSlice"

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogle = async () => {
    setError("")
    setGoogleLoading(true)
    try {
      await dispatch(googleAuthThunk({ email: "user@gmail.com", name: "Google Account" })).unwrap()
      dispatch(fetchPosData())
      setGoogleLoading(false)
      navigate("/home", { replace: true })
    } catch (err: any) {
      setGoogleLoading(false)
      setError(err || "Google sign-up failed")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await dispatch(registerThunk({ email, name: name.trim() || email.split("@")[0] })).unwrap()
      dispatch(fetchPosData())
      setLoading(false)
      navigate("/home", { replace: true })
    } catch (err: any) {
      setLoading(false)
      setError(err || "Failed to create account")
    }
  }


  return (
    <div className={cn("space-y-5", className)}>
      <div className="text-center lg:text-left">
        <Link to="/home" className="mb-6 inline-flex items-center gap-2 lg:hidden">
          <Activity className="size-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight text-foreground">Personal OS</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Set up Personal OS in a few quiet steps.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <form className="space-y-3.5" onSubmit={handleSubmit} {...props}>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="relative border-b border-border">
            <label
              htmlFor="name"
              className="absolute top-2 left-3.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border-0 bg-transparent px-3.5 pt-5 pb-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
          </div>

          <div className="relative border-b border-border">
            <label
              htmlFor="email"
              className="absolute top-2 left-3.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full border-0 bg-transparent px-3.5 pt-5 pb-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
          </div>

          <div className="relative border-b border-border">
            <label
              htmlFor="password"
              className="absolute top-2 left-3.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border-0 bg-transparent px-3.5 pt-5 pr-11 pb-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
            <button
              type="button"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <div className="relative">
            <label
              htmlFor="confirm-password"
              className="absolute top-2 left-3.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full border-0 bg-transparent px-3.5 pt-5 pb-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          By continuing, you agree to Personal OS terms and privacy policy.
        </p>

        <Button type="submit" size="sm" className="h-10 w-full" disabled={loading || googleLoading}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {loading ? "Creating account…" : "Agree and continue"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 font-medium text-muted-foreground">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || googleLoading}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
