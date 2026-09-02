/**
 * Neon Auth & Google OAuth Integration for Personal OS
 * Connects frontend with Neon's Auth (Better Auth) & Postgres database.
 */

import { setStoredSession, type UserSession } from "@/lib/api-client"

export const NEON_AUTH_URL = (import.meta.env.VITE_NEON_AUTH_URL || "").replace(/\/+$/, "")

/**
 * Initiates Google Authentication via Neon Auth (Better Auth protocol)
 * Sends POST /sign-in/social to receive the Google OAuth URL.
 */
export async function startNeonGoogleAuth(): Promise<{ handled: boolean; token?: string; user?: UserSession }> {
  if (!NEON_AUTH_URL) {
    return { handled: false }
  }

  try {
    const callbackURL = `${window.location.origin}/login`
    const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        provider: "google",
        callbackURL,
      }),
    })

    const data = await res.json()
    if (data?.url) {
      window.location.href = data.url
      return { handled: true }
    } else if (data?.error || data?.message || data?.code) {
      const errorMsg = data.message || data.error || data.code
      if (errorMsg === "INVALID_CALLBACKURL" || errorMsg.includes("callbackURL")) {
        throw new Error(
          `Neon Auth: Please add "${window.location.origin}" to Allowed Redirect URLs in the Neon Console (Auth -> Settings).`
        )
      }
      throw new Error(errorMsg)
    }
  } catch (err: any) {
    console.error("Neon Google Auth error:", err)
    throw err
  }

  return { handled: false }
}

/**
 * Check for active Neon Auth session or URL callback parameters
 */
export async function handleNeonAuthCallback(): Promise<{ token: string; user: UserSession } | null> {
  try {
    // 1. Check URL parameters
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get("token") || params.get("session_token") || params.get("access_token")
    const urlEmail = params.get("email") || params.get("user_email")

    if (urlToken && urlEmail) {
      const user: UserSession = {
        id: params.get("user_id") || params.get("id") || `neon_${Date.now()}`,
        email: urlEmail,
        name: params.get("name") || params.get("user_name") || urlEmail.split("@")[0] || "User",
        avatarUrl: params.get("avatar") || params.get("picture") || undefined,
      }
      setStoredSession(urlToken, user)
      return { token: urlToken, user }
    }

    // 2. Query Better Auth /get-session
    if (NEON_AUTH_URL) {
      const res = await fetch(`${NEON_AUTH_URL}/get-session`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          const token = data.session?.token || data.session?.id || `neon_token_${data.user.id}`
          const user: UserSession = {
            id: data.user.id || `neon_${Date.now()}`,
            email: data.user.email,
            name: data.user.name || data.user.email?.split("@")[0] || "User",
            avatarUrl: data.user.image || data.user.avatarUrl || undefined,
          }
          setStoredSession(token, user)
          return { token, user }
        }
      }
    }
  } catch (err) {
    console.warn("Neon session check:", err)
  }
  return null
}
