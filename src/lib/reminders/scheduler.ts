import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import {
  type ReminderItem,
} from "@/lib/storage"

const NOTIF_ENABLED_KEY = "pos_notifications_enabled"
const DAILY_REVIEW_ENABLED_KEY = "pos_daily_review_enabled"
const DAILY_REVIEW_TIME_KEY = "pos_daily_review_time"
const FIRED_GRACE_MS = 60_000

let memoryReminders: ReminderItem[] = []

function loadReminders(): ReminderItem[] {
  try {
    const raw = sessionStorage.getItem("pos_reminders")
    return raw ? JSON.parse(raw) : memoryReminders
  } catch {
    return memoryReminders
  }
}

function saveReminders(items: ReminderItem[]) {
  memoryReminders = items
  try {
    sessionStorage.setItem("pos_reminders", JSON.stringify(items))
  } catch {}
}

export function notificationsEnabled(): boolean {
  try {
    return localStorage.getItem(NOTIF_ENABLED_KEY) !== "false"
  } catch {
    return true
  }
}

export function setNotificationsEnabled(on: boolean) {
  try {
    localStorage.setItem(NOTIF_ENABLED_KEY, on ? "true" : "false")
  } catch {}
}

export function dailyReviewRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(DAILY_REVIEW_ENABLED_KEY) === "true"
  } catch {
    return false
  }
}

export function setDailyReviewRemindersEnabled(on: boolean) {
  try {
    localStorage.setItem(DAILY_REVIEW_ENABLED_KEY, on ? "true" : "false")
  } catch {}
  if (on) ensureDailyReviewReminder()
  else disableDailyReviewReminders()
}

export function getDailyReviewTime(): string {
  try {
    return localStorage.getItem(DAILY_REVIEW_TIME_KEY) || "20:00"
  } catch {
    return "20:00"
  }
}

export function setDailyReviewTime(hhmm: string) {
  try {
    localStorage.setItem(DAILY_REVIEW_TIME_KEY, hhmm)
  } catch {}
  if (dailyReviewRemindersEnabled()) ensureDailyReviewReminder()
}

function nextDailyReviewDueAt(hhmm = getDailyReviewTime()): string {
  const [hStr, mStr] = hhmm.split(":")
  const h = Number(hStr) || 20
  const m = Number(mStr) || 0
  const due = new Date()
  due.setHours(h, m, 0, 0)
  if (due.getTime() <= Date.now()) due.setDate(due.getDate() + 1)
  return due.toISOString()
}

export function ensureDailyReviewReminder() {
  const reminders = loadReminders()
  const existing = reminders.find((r: ReminderItem) => r.kind === "daily_review")
  const dueAt = nextDailyReviewDueAt()
  if (existing) {
    saveReminders(
      reminders.map((r: ReminderItem) =>
        r.kind === "daily_review"
          ? { ...r, title: "Time for your daily review", dueAt, enabled: true, firedAt: undefined }
          : r
      )
    )
  } else {
    saveReminders([
      ...reminders,
      {
        id: "daily_review",
        title: "Time for your daily review",
        dueAt,
        kind: "daily_review",
        enabled: true,
      },
    ])
  }
}

export function disableDailyReviewReminders() {
  const reminders = loadReminders()
  saveReminders(
    reminders.map((r: ReminderItem) =>
      r.kind === "daily_review" ? { ...r, enabled: false } : r
    )
  )
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.requestPermissions()
    return status.display === "granted"
  }
  if (typeof Notification !== "undefined") {
    const perm = await Notification.requestPermission()
    return perm === "granted"
  }
  return false
}

export async function getNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === "granted") return "granted"
    if (status.display === "denied") return "denied"
    return "default"
  }
  if (typeof Notification !== "undefined") {
    return Notification.permission
  }
  return "unsupported"
}

export async function sendTestNotification(): Promise<boolean> {
  const title = "Personal OS Test"
  const body = "Notifications are working!"
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    })
    return true
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body })
    return true
  }
  return false
}

export function getUpcomingReminders(limit = 5): ReminderItem[] {
  const now = Date.now()
  return loadReminders()
    .filter((r: ReminderItem) => r.enabled)
    .filter((r: ReminderItem) => {
      const due = new Date(r.dueAt).getTime()
      if (isNaN(due)) return false
      if (r.firedAt) {
        const fired = new Date(r.firedAt).getTime()
        if (now - fired < FIRED_GRACE_MS) return false
      }
      return due >= now - 60_000
    })
    .sort((a: ReminderItem, b: ReminderItem) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit)
}

export const upcomingReminders = getUpcomingReminders

export function addReminder(reminder: ReminderItem) {
  const reminders = loadReminders()
  saveReminders([reminder, ...reminders])
}

export function deleteReminder(id: string) {
  const reminders = loadReminders()
  saveReminders(reminders.filter((r) => r.id !== id))
}

export function startReminderScheduler() {
  if (typeof window === "undefined") return () => {}
  const interval = setInterval(() => {
    if (!notificationsEnabled()) return
    const reminders = loadReminders()
    const now = Date.now()
    reminders.forEach((r) => {
      if (!r.enabled) return
      const due = new Date(r.dueAt).getTime()
      if (due <= now && (!r.firedAt || now - new Date(r.firedAt).getTime() > FIRED_GRACE_MS)) {
        r.firedAt = new Date().toISOString()
        saveReminders(reminders)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(r.title, { body: "Personal OS Reminder" })
        }
      }
    })
  }, 10_000)

  return () => clearInterval(interval)
}
