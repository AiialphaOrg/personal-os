import type { ComponentProps } from "react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import { Calendar } from "@/components/ui/calendar"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { usePosData } from "@/hooks/use-pos-data"
import { CheckSquare, AlertCircle, Mic, ArrowRightLeft } from "lucide-react"

export function SidebarRight({ ...props }: ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const path = location.pathname
  const { wallets, timeline, balance, debts } = usePosData()
  const currency = localStorage.getItem("pos_currency") || "₦"
  const iOwe = debts
    .filter((d) => d.status !== "paid" && d.direction === "i_owe")
    .reduce((s, d) => s + d.remaining, 0)
  const owedToMe = debts
    .filter((d) => d.status !== "paid" && d.direction === "owed_to_me")
    .reduce((s, d) => s + d.remaining, 0)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [quickNote, setQuickNote] = useState(() => localStorage.getItem("pos_quick_note") || "")

  useEffect(() => {
    localStorage.setItem("pos_quick_note", quickNote)
  }, [quickNote])

  const tasks = timeline.filter((t) => t.type === "task")
  const bills = timeline.filter((t) => t.type === "bill")
  const spentToday = timeline
    .filter((i) => i.type === "expense" || i.type === "bill")
    .reduce((sum, i) => sum + (i.amount || 0), 0)
  const budget = Number(localStorage.getItem("pos_budget") || 100000)
  const budgetPct = Math.min(100, Math.round((spentToday / budget) * 100))

  const user = {
    name: localStorage.getItem("pos_user_name") || "Aiilapha",
    email: "you@personalos.app",
    avatar: "",
  }

  const renderTodayWidgets = () => (
    <>
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Snapshot
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-2 px-2">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">Available</p>
            <p className="text-lg font-semibold tabular-nums">
              {currency}
              {balance.toLocaleString()}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${budgetPct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {budgetPct}% of today&apos;s budget used
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("pos:quick-add"))}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Mic className="size-3.5" />
            Quick expense
          </button>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0 -mx-1">
        <SidebarGroupContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="w-full bg-transparent"
          />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Today&apos;s tasks
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-1 px-2">
            {tasks.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No open tasks</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 py-1 text-xs">
                  <CheckSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground">{task.title}</span>
                </div>
              ))
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Upcoming bills
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2 px-2">
            {bills.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing due</p>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">{bill.title}</span>
                  <span className="font-semibold tabular-nums">
                    {currency}
                    {(bill.amount || 0).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Quick notes
        </SidebarGroupLabel>
        <SidebarGroupContent className="px-2">
          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Scratch notes for today..."
            className="h-16 w-full resize-none rounded-lg border border-border bg-transparent p-2 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )

  const renderMoneyWidgets = () => (
    <>
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Wallet balances
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-2 px-2">
          {wallets.map((w) => (
            <div key={w.id} className="flex justify-between py-0.5 text-xs">
              <span className="text-muted-foreground">{w.name}</span>
              <span className="font-semibold tabular-nums">
                {currency}
                {w.balance.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-xs">
            <span className="font-medium">Total</span>
            <span className="font-semibold tabular-nums">
              {currency}
              {balance.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pos:quick-add-transfer"))}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <ArrowRightLeft className="size-3.5" />
            Transfer wallets
          </button>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Debts
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-1.5 px-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">You owe</span>
            <span className="font-semibold tabular-nums">
              {currency}
              {iOwe.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owed to you</span>
            <span className="font-semibold tabular-nums text-emerald-600">
              {currency}
              {owedToMe.toLocaleString()}
            </span>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Budget health
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-2 px-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Today</span>
              <span className="font-medium tabular-nums">
                {currency}
                {spentToday.toLocaleString()} / {currency}
                {budget.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  budgetPct > 85 ? "bg-red-500" : budgetPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
          {budgetPct > 75 && (
            <div className="flex items-start gap-2 text-xs text-amber-600">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                You&apos;ve used {budgetPct}% of today&apos;s budget.
              </p>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Recent activity
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-1.5 px-2">
          {timeline
            .filter((t) => t.type !== "task")
            .slice(0, 5)
            .map((t) => (
              <div key={t.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{t.title}</span>
                {t.amount != null && (
                  <span className="shrink-0 font-medium tabular-nums">
                    {t.type === "income" ? "+" : t.type === "transfer" ? "" : "-"}
                    {currency}
                    {t.amount.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          <Link to="/money" className="block pt-1 text-xs font-semibold text-primary">
            Open Money
          </Link>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )

  const renderPlannerWidgets = () => (
    <>
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Focus today
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-2 px-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks on the board</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2 text-xs">
                <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground">{task.time}</p>
                </div>
              </div>
            ))
          )}
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="p-0">
        <SidebarGroupContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-xl border border-border bg-transparent"
          />
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )

  const renderInsightsWidgets = () => {
    const income = timeline
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0)
    const expenses = timeline
      .filter((t) => t.type === "expense" || t.type === "bill")
      .reduce((s, t) => s + (t.amount || 0), 0)

    return (
      <>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Net position
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-medium text-muted-foreground">All wallets</span>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                {currency}
                {balance.toLocaleString()}
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Today&apos;s flow
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1 px-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income</span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                +{currency}
                {income.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-semibold text-red-500 tabular-nums">
                -{currency}
                {expenses.toLocaleString()}
              </span>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </>
    )
  }

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh w-80 border-l border-border bg-sidebar lg:flex"
      {...props}
    >
      <SidebarHeader className="flex h-16 justify-center border-b border-border px-4">
        <NavUser user={user} />
      </SidebarHeader>

      <SidebarContent className="space-y-6 overflow-y-auto px-3 py-4">
        {(path === "/home" || path === "/" || path === "/settings") && renderTodayWidgets()}
        {path === "/money" && renderMoneyWidgets()}
        {path === "/planner" && renderPlannerWidgets()}
        {path === "/insights" && renderInsightsWidgets()}
      </SidebarContent>
    </Sidebar>
  )
}
