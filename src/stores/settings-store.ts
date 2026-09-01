import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SettingsState {
  userName: string
  currency: string
  budget: number
  aiEngine: "rules" | "on-device"
  aiModelId: string
  notificationsOn: boolean
  dailyReviewOn: boolean
  dailyReviewTime: string
  updateProfile: (name: string, currency: string, budget: number) => void
  setAiEngine: (engine: "rules" | "on-device") => void
  setNotifications: (on: boolean) => void
  setDailyReview: (on: boolean, time?: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userName: "there",
      currency: "₦",
      budget: 100000,
      aiEngine: "rules",
      aiModelId: "smollm2-360m",
      notificationsOn: false,
      dailyReviewOn: false,
      dailyReviewTime: "20:00",
      updateProfile: (userName, currency, budget) => set({ userName, currency, budget }),
      setAiEngine: (aiEngine) => set({ aiEngine }),
      setNotifications: (notificationsOn) => set({ notificationsOn }),
      setDailyReview: (dailyReviewOn, time) =>
        set((state) => ({ dailyReviewOn, dailyReviewTime: time || state.dailyReviewTime })),
    }),
    {
      name: "pos_settings_store",
    }
  )
)
