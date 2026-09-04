import type { CaptureSubmit } from "@/components/capture-sheet"
import { store } from "@/store"
import { addTransactionThunk, addTaskThunk, upsertDebtThunk, fetchPosData } from "@/store/dataSlice"
import { type DebtKind } from "@/lib/storage"

function newId() {
  return `t-${Date.now()}`
}


export function applyCaptureSubmit(data: CaptureSubmit): { ok: boolean; error?: string } {
  const wallets = store.getState().data.wallets

  if (data.type === "transfer") {
    const fromId = data.fromWallet
    const toId = data.toWallet
    if (!fromId || !toId) return { ok: false, error: "Choose both wallets" }
    if (fromId === toId) return { ok: false, error: "Choose different wallets" }
    const amount = Number(data.amount)
    if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" }

    const fromW = wallets.find((w) => w.id === fromId)?.name || "Wallet"
    const toW = wallets.find((w) => w.id === toId)?.name || "Wallet"

    void store.dispatch(
      addTransactionThunk({
        id: newId(),
        type: "transfer",
        title: data.title || `Transfer ${fromW} → ${toW}`,
        amount,
        fromWallet: fromId,
        toWallet: toId,
        walletId: fromId,
        category: "transfer",
        date: new Date().toISOString().split("T")[0],
      })
    )

    return { ok: true }
  }

  if (data.type === "task") {
    const title = data.title.trim()
    if (!title) return { ok: false, error: "Title required" }

    void store.dispatch(
      addTaskThunk({
        id: `task-${Date.now()}`,
        title,
        completed: false,
        dueDate: new Date().toISOString().split("T")[0],
      })
    )

    return { ok: true }
  }

  if (data.type === "i_owe" || data.type === "owed_to_me") {
    const person = (data.person || data.title || "").trim()
    if (!person) return { ok: false, error: "Specify who is involved" }
    const amount = Number(data.amount)
    if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" }

    const debtId = data.id || `d-${Date.now()}`
    const kind: DebtKind = data.debtKind || (data.type === "i_owe" ? "personal" : "loan")

    void store.dispatch(
      upsertDebtThunk({
        id: debtId,
        person,
        amount,
        remaining: amount,
        direction: data.type,
        kind,
        dueDate: data.dueDate,
        walletId: data.walletId,
        isCashLoan: !data.id,
        note: data.note,
        status: "open",
      })
    ).then(() => {
      store.dispatch(fetchPosData())
    })

    return { ok: true }
  }

  // Expense, Income, or Bill
  const amount = Number(data.amount)
  if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" }
  const wid = data.walletId || wallets[0]?.id || "w-cash"
  const category = data.category || (data.type === "income" ? "salary" : "general")
  const title = data.title.trim() || (data.type === "income" ? "Income" : "Expense")

  void store.dispatch(
    addTransactionThunk({
      id: data.id || newId(),
      type: data.type,
      title,
      amount,
      category,
      walletId: wid,
      date: data.dueDate || new Date().toISOString().split("T")[0],
      note: data.note,
    })
  ).then(() => {
    store.dispatch(fetchPosData())
  })

  return { ok: true }
}
