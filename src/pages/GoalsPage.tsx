import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import {
  todayISODate,
  type GoalItem,
} from "@/lib/storage"
import { Plus, Target, Trash2 } from "lucide-react"
import { usePosQuery, usePosMutations } from "@/hooks/use-pos-query"
import { toast } from "sonner"

export function GoalsPage() {
  const keyboardInset = useKeyboardInset()
  const isMobile = useIsMobile()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const { goals, wallets } = usePosQuery()
  const mutations = usePosMutations()

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [target, setTarget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [createError, setCreateError] = useState("")

  const [contribOpen, setContribOpen] = useState(false)
  const [activeGoal, setActiveGoal] = useState<GoalItem | null>(null)
  const [contribAmount, setContribAmount] = useState("")
  const [contribWallet, setContribWallet] = useState("w-bank")
  const [contribError, setContribError] = useState("")

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)

  const openCreate = () => {
    setTitle("")
    setTarget("")
    setDeadline("")
    setCreateError("")
    setCreateOpen(true)
  }

  const saveGoal = async () => {
    setCreateError("")

    const t = title.trim()
    const amt = Number(target)
    if (!t) {
      setCreateError("Enter a goal title.")
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreateError("Enter a target amount.")
      return
    }
    const item: GoalItem = {
      id: `g-${Date.now()}`,
      title: t,
      target: amt,
      current: 0,
      deadline: deadline || undefined,
      walletId: wallets[0]?.id || "w-savings",
      createdAt: todayISODate(),
    }
    try {
      await mutations.addGoal.mutateAsync(item)
      toast.success("Goal created online")
      setCreateOpen(false)
    } catch (err: any) {
      setCreateError(err.message || "Failed to create goal")
    }
  }

  const triggerDeleteGoal = (id: string) => {
    setGoalToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const removeGoal = async () => {
    if (!goalToDelete) return
    try {
      await mutations.deleteGoal.mutateAsync(goalToDelete)
      toast.success("Goal removed")
      setGoalToDelete(null)
      setDeleteConfirmOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete goal")
    }
  }

  const openContribute = (goal: GoalItem) => {
    setActiveGoal(goal)
    setContribAmount("")
    setContribWallet(goal.walletId || wallets[0]?.id || "w-bank")
    setContribError("")
    setContribOpen(true)
  }

  const confirmContribute = async () => {
    if (!activeGoal) return
    const amt = Number(contribAmount)
    if (!amt || amt <= 0) {
      setContribError("Enter a valid contribution amount")
      return
    }
    try {
      await mutations.addGoal.mutateAsync({
        ...activeGoal,
        current: activeGoal.current + amt,
      })
      await mutations.addTransaction.mutateAsync({
        title: `Goal Savings: ${activeGoal.title}`,
        amount: amt,
        type: "expense",
        category: "savings",
        walletId: contribWallet,
        goalId: activeGoal.id,
      })
      toast.success("Contribution logged online")
      setContribOpen(false)
    } catch (err: any) {
      setContribError(err.message || "Failed to contribute")
    }
  }

  const createForm = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Goal Name</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Emergency fund, Laptop, Relocation…"
          className="h-11 rounded-lg text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Target Amount ({currency})</label>
        <FormattedNumberInput
          value={target}
          onValueChange={setTarget}
          className="h-11 rounded-lg text-sm font-semibold tabular-nums"
          placeholder="0"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Target Deadline (Optional)</label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-11 rounded-lg text-sm font-medium"
        />
      </div>
      {createError && <p className="text-xs font-medium text-destructive">{createError}</p>}
      {isMobile ? (
        <DrawerFooter className="px-0 pt-2 gap-2">
          <Button className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs" onClick={saveGoal}>
            Save Goal
          </Button>
          <Button variant="outline" className="w-full h-11 rounded-xl text-xs" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter className="pt-2">
          <Button variant="outline" className="h-11 rounded-xl px-4 text-xs" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button className="h-11 rounded-xl px-5 text-xs font-semibold" onClick={saveGoal}>Save Goal</Button>
        </DialogFooter>
      )}
    </div>
  )

  const contribForm = (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 p-3 space-y-1 border border-border/40">
        <p className="text-xs font-semibold text-foreground">
          Contributing to <span className="font-bold text-primary">{activeGoal?.title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Current Progress: {currency}{(activeGoal?.current || 0)?.toLocaleString()} / {currency}{(activeGoal?.target || 0)?.toLocaleString()}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Contribution Amount ({currency})</label>
        <FormattedNumberInput
          value={contribAmount}
          onValueChange={setContribAmount}
          placeholder="0"
          className="h-11 rounded-lg text-sm font-semibold tabular-nums"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Deduct From Wallet</label>
        <div className="grid grid-cols-2 gap-2">
          {wallets
            .filter((w) => w.kind !== "investment")
            .map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setContribWallet(w.id)}
              className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                contribWallet === w.id
                  ? "border-primary bg-primary/10 text-primary shadow-2xs font-bold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>
      {contribError && <p className="text-xs font-medium text-destructive">{contribError}</p>}
      {isMobile ? (
        <DrawerFooter className="px-0 pt-2 gap-2">
          <Button className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs" onClick={confirmContribute}>
            Contribute Funds
          </Button>
          <Button variant="outline" className="w-full h-11 rounded-xl text-xs" onClick={() => setContribOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter className="pt-2">
          <Button variant="outline" className="h-11 rounded-xl px-4 text-xs" onClick={() => setContribOpen(false)}>
            Cancel
          </Button>
          <Button className="h-11 rounded-xl px-5 text-xs font-semibold" onClick={confirmContribute}>Contribute Funds</Button>
        </DialogFooter>
      )}
    </div>
  )

  return (
    <div
      className="mx-auto max-w-xl space-y-6"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Goals</p>
          <h1 className="text-2xl font-semibold tracking-tight">Savings targets</h1>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          New
        </Button>
      </header>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="w-full rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground"
          >
            No goals yet — tap to create one (laptop, vacation, emergency fund…)
          </button>
        ) : (
          goals?.map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100))
            const done = g.current >= g.target
            return (
              <section key={g.id} className="rounded-xl border border-border bg-card px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Target className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {currency}
                          {g.current?.toLocaleString()} of {currency}
                          {g.target?.toLocaleString()}
                          {g.deadline ? ` · by ${g.deadline}` : ""}
                          {done ? " · complete" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => triggerDeleteGoal(g.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      {!done && (
                        <Button size="sm" variant="outline" onClick={() => openContribute(g)}>
                          Contribute
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )
          })
        )}
      </div>

      {isMobile ? (
        <>
          <Drawer open={createOpen} onOpenChange={setCreateOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader>
                <DrawerTitle>New Goal</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
                {createForm}
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={contribOpen} onOpenChange={setContribOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader>
                <DrawerTitle>Contribute to Goal</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
                {contribForm}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New goal</DialogTitle>
              </DialogHeader>
              {createForm}
            </DialogContent>
          </Dialog>
          <Dialog open={contribOpen} onOpenChange={setContribOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contribute</DialogTitle>
              </DialogHeader>
              {contribForm}
            </DialogContent>
          </Dialog>
        </>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this goal. Any money contributed to it will remain in your wallets, but the goal tracking will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
