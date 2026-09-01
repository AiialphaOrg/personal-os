import { useState } from "react"
import { Link } from "react-router"
import { Loader2, Activity } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthShell
      headline="Reset access and get back to your desk."
      subcopy="We’ll email a secure link if an account exists."
    >
      <div className="space-y-5">
        <div className="text-center lg:text-left">
          <Link to="/home" className="mb-6 inline-flex items-center gap-2 lg:hidden">
            <Activity className="size-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight text-foreground">Personal OS</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Forgot password?
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we’ll send a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-sm font-medium text-foreground">Check your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists for {email}, a reset link is on the way.
            </p>
          </div>
        ) : (
          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative">
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
            </div>

            <Button type="submit" size="sm" className="h-10 w-full" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
