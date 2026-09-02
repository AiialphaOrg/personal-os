/**
 * Neon Auth & Google OAuth Integration for Personal OS
 * Connects frontend with Neon's Auth & backend database.
 */

import { loginWithGoogle, type UserSession } from "@/lib/api-client"

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

    const data = await res.json().catch(() => ({}))
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
 * Check for active Neon Auth OAuth return in URL query parameters.
 * Automatically handles ?neon_auth_session_verifier=... from Google OAuth
 * and syncs the verified user directly with the backend database.
 */
export async function handleNeonAuthCallback(): Promise<{ token: string; user: UserSession } | null> {
  try {
    const search = window.location.search
    if (!search) return null

    const params = new URLSearchParams(search)
    const hasVerifier =
      params.has("neon_auth_session_verifier") ||
      params.has("state") ||
      params.has("code") ||
      params.has("session_token") ||
      params.has("token") ||
      params.has("email")

    if (!hasVerifier) {
      return null
    }

    // 1. Direct query param email fallback
    const urlEmail = params.get("email") || params.get("user_email")
    const urlName = params.get("name") || params.get("user_name")
    const urlAvatar = params.get("avatar") || params.get("picture")

    if (urlEmail) {
      const syncRes = await loginWithGoogle(urlEmail, urlName || undefined, urlAvatar || undefined)
      window.history.replaceState({}, document.title, window.location.pathname)
      return syncRes
    }

    // 2. Fetch session from Neon Auth with credentials / verifier
    if (NEON_AUTH_URL) {
      // Try get-session with query params first, then fallback to standard get-session
      let res = await fetch(`${NEON_AUTH_URL}/get-session?${params.toString()}`, {
        credentials: "include",
      }).catch(() => null)

      if (!res || !res.ok) {
        res = await fetch(`${NEON_AUTH_URL}/get-session`, {
          credentials: "include",
        }).catch(() => null)
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => null)
        const user = data?.user
        if (user && user.email) {
          // Sync with backend API & Postgres database
          const syncRes = await loginWithGoogle(
            user.email,
            user.name || undefined,
            user.image || user.avatarUrl || undefined
          )
          window.history.replaceState({}, document.title, window.location.pathname)
          return syncRes
        }
      }
    }

    // Clean URL params if verification could not find session
    window.history.replaceState({}, document.title, window.location.pathname)
  } catch (err) {
    console.error("Failed to complete Neon OAuth callback:", err)
    try {
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch {}
  }

  return null
}
