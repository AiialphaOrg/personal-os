import { AuthShell } from "@/components/auth-shell"
import { SignupForm } from "@/components/signup-form"

export function SignupPage() {
  return (
    <AuthShell
      headline="Build a personal operating system that fits how you live."
      subcopy="Start free. Customize wallets, budget, and focus in a few steps."
    >
      <SignupForm />
    </AuthShell>
  )
}
