/**
 * Neon Auth & Google OAuth Integration for Personal OS
 * Connects frontend directly with Neon's integrated Auth & Postgres database.
 */

import { setStoredSession, type UserSession } from "@/lib/api-client"

export const NEON_AUTH_URL = (import.meta.env.VITE_NEON_AUTH_URL || "").replace(/\/+$/, "")

/**
 * Initiates Google Authentication via Neon Auth
 * Redirects to Neon Auth Google provider if VITE_NEON_AUTH_URL is configured.
 */
export async function startNeonGoogleAuth(): Promise<{ handled: boolean; token?: string; user?: UserSession }> {
  if (NEON_AUTH_URL) {
    const callbackUrl = encodeURIComponent(`${window.location.origin}/login`)
    // Neon Auth social login URL
    const neonGoogleUrl = `${NEON_AUTH_URL}/sign-in/social?provider=google&callbackURL=${callbackUrl}`
    window.location.href = neonGoogleUrl
    return { handled: true }
  }

  return { handled: false }
}

/**
 * Parse Neon Auth callback parameters from URL if returning from OAuth redirect
 */
export function handleNeonAuthCallback(): { token: string; user: UserSession } | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token") || params.get("session_token") || params.get("access_token")
    const email = params.get("email") || params.get("user_email")
    const name = params.get("name") || params.get("user_name") || email?.split("@")[0] || "User"
    const userId = params.get("user_id") || params.get("id") || `neon_${Date.now()}`

    if (token && email) {
      const user: UserSession = {
        id: userId,
        email,
        name,
        avatarUrl: params.get("avatar") || params.get("picture") || undefined,
      }
      setStoredSession(token, user)
      return { token, user }
    }
  } catch (err) {
    console.error("Failed to parse Neon Auth callback:", err)
  }
  return null
}
