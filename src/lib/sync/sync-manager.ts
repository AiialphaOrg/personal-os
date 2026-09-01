/**
 * Personal OS Sync Manager & Outbox Queue
 *
 * Local-First Architecture:
 *   1. All writes execute instantly against LocalStorage.
 *   2. Write mutations are appended to `pos_sync_queue`.
 *   3. If network is online, Sync Manager sends mutations to backend.
 *   4. Supports full JSON data Backup & Restore.
 */

export type SyncStatus = {
  online: boolean
  pendingCount: number
  syncing: boolean
  lastSyncedAt: string | null
}

export type OutboxMutation = {
  id: string
  entity: "wallets" | "timeline" | "debts" | "goals" | "tasks" | "settings"
  action: "upsert" | "delete"
  data: any
  timestamp: string
}

const STORAGE_KEYS = [
  "pos_wallets",
  "pos_timeline",
  "pos_debts",
  "pos_goals",
  "pos_tasks",
  "pos_user_name",
  "pos_currency",
  "pos_budget",
  "pos_ai_engine",
  "pos_ai_model",
] as const

const SYNC_QUEUE_KEY = "pos_sync_queue"
const LAST_SYNC_KEY = "pos_last_synced_at"

export function getOutboxQueue(): OutboxMutation[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function queueMutation(entity: OutboxMutation["entity"], action: OutboxMutation["action"], data: any) {
  const queue = getOutboxQueue()
  const mutation: OutboxMutation = {
    id: crypto.randomUUID(),
    entity,
    action,
    data,
    timestamp: new Date().toISOString(),
  }
  queue.push(mutation)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new Event("pos:sync-status"))
}

export function clearOutboxQueue() {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]))
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  window.dispatchEvent(new Event("pos:sync-status"))
}

export function getSyncStatus(): SyncStatus {
  const queue = getOutboxQueue()
  const lastSyncedAt = localStorage.getItem(LAST_SYNC_KEY)
  const online = typeof navigator !== "undefined" ? navigator.onLine : true
  return {
    online,
    pendingCount: queue.length,
    syncing: false,
    lastSyncedAt,
  }
}

/** One-click Export Backup to JSON file */
export function exportJsonBackup() {
  const backupData: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
  }

  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key)
    if (val !== null) {
      try {
        backupData[key] = JSON.parse(val)
      } catch {
        backupData[key] = val
      }
    }
  }

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const dateStr = new Date().toISOString().split("T")[0]
  link.href = url
  link.download = `PersonalOS-Backup-${dateStr}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Import JSON Backup file */
export async function importJsonBackup(file: File): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    if (!json || typeof json !== "object") {
      return { ok: false, count: 0, error: "Invalid backup JSON file." }
    }

    let restoredCount = 0
    for (const key of STORAGE_KEYS) {
      if (json[key] !== undefined) {
        const val = typeof json[key] === "string" ? json[key] : JSON.stringify(json[key])
        localStorage.setItem(key, val)
        restoredCount++
      }
    }

    window.dispatchEvent(new Event("pos:data"))
    window.dispatchEvent(new Event("pos:sync-status"))
    return { ok: true, count: restoredCount }
  } catch (err: any) {
    return { ok: false, count: 0, error: err.message || "Failed to parse JSON backup" }
  }
}

/** Attempts HTTP sync to Local-First backend */
export async function triggerSync(): Promise<{ ok: boolean; syncedCount: number; error?: string }> {
  const status = getSyncStatus()
  if (!status.online) {
    return { ok: false, syncedCount: 0, error: "Device is currently offline." }
  }

  const queue = getOutboxQueue()
  if (queue.length === 0) {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
    window.dispatchEvent(new Event("pos:sync-status"))
    return { ok: true, syncedCount: 0 }
  }

  try {
    const res = await fetch("http://localhost:4000/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: queue }),
    })

    if (!res.ok) {
      throw new Error(`Sync server responded with ${res.status}`)
    }

    const count = queue.length
    clearOutboxQueue()
    return { ok: true, syncedCount: count }
  } catch (err: any) {
    return {
      ok: false,
      syncedCount: 0,
      error: err.message || "Could not connect to local sync server on port 4000.",
    }
  }
}
