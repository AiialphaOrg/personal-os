import { create } from "zustand"
import { persist } from "zustand/middleware"

export type UserSession = {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

interface AuthState {
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserSession) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "pos_auth_store",
    }
  )
)
