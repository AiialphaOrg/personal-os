import { useCallback, useEffect, useState } from "react"
import { useHeader } from "@/hooks/use-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { useVoiceCapture } from "@/hooks/use-voice-capture"
import type { CaptureIntent } from "@/lib/ai/on-device"
import {
  addReminder,
  deleteReminder,
  upcomingReminders,
} from "@/lib/reminders/scheduler"
import type { ReminderItem } from "@/lib/storage"
import { Bell, Check, Mic, Plus, Trash2 } from "lucide-react"

interface TaskItem {
  id: string
  title: string
  completed: boolean
}

interface NoteItem {
  id: string
  title: string
  content: string
  updatedAt: string
}

export function PlannerPage() {
  useHeader({ title: "Planner & Tasks" })
  const isMobile = useIsMobile()
  const keyboardInset = useKeyboardInset()

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem("pos_planner_tasks")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* fallthrough */
      }
    }
    return [
      { id: "t1", title: "Invoice client for milestone 1", completed: false },
      { id: "t2", title: "Review weekly spend", completed: true },
    ]
  })

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem("pos_planner_notes")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* fallthrough */
      }
    }
    return [
      {
        id: "n1",
        title: "Ideas",
        content: "Keep Personal OS capture under 5 seconds.",
        updatedAt: new Date().toISOString(),
      },
    ]
  })

  const [taskOpen, setTaskOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderDue, setReminderDue] = useState("")
  const [reminders, setReminders] = useState<ReminderItem[]>(() => upcomingReminders(30))

  useEffect(() => {
    localStorage.setItem("pos_planner_tasks", JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem("pos_planner_notes", JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    const refresh = () => setReminders(upcomingReminders(30))
    window.addEventListener("pos:data", refresh)
    return () => window.removeEventListener("pos:data", refresh)
  }, [])

  const onCapture = useCallback((intent: CaptureIntent, transcript: string) => {
    setTaskTitle(intent.title || transcript)
    setTaskOpen(true)
  }, [])

  const onNote = useCallback((note: { title: string; content: string }) => {
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteOpen(true)
  }, [])

  const { listening, hint, aiProgress, startVoice } = useVoiceCapture({
    onCapture,
    onNote,
  })

  const addTask = () => {
    if (!taskTitle.trim()) return
    setTasks((prev) => [
      { id: Date.now().toString(), title: taskTitle.trim(), completed: false },
      ...prev,
    ])
    setTaskTitle("")
    setTaskOpen(false)
  }

  const saveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return
    setNotes((prev) => [
      {
        id: Date.now().toString(),
        title: noteTitle.trim() || "Note",
        content: noteContent.trim(),
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setNoteTitle("")
    setNoteContent("")
    setNoteOpen(false)
  }

  const saveReminder = () => {
    if (!reminderTitle.trim() || !reminderDue) return
    const dueAt = reminderDue.includes("T") ? reminderDue : `${reminderDue}T09:00:00`
    addReminder({
      id: `rem-${Date.now()}`,
      title: reminderTitle.trim(),
      dueAt,
      kind: "custom",
      enabled: true,
    })
    setReminderTitle("")
    setReminderDue("")
    setReminderOpen(false)
    setReminders(upcomingReminders(30))
  }


  const reminderForm = (
    <div className="space-y-4">
      <Input
        value={reminderTitle}
        onChange={(e) => setReminderTitle(e.target.value)}
        placeholder="Remind me to…"
        autoFocus
      />
      <Input
        type="datetime-local"
        value={reminderDue}
        onChange={(e) => setReminderDue(e.target.value)}
      />
      {isMobile ? (
        <DrawerFooter className="px-0">
          <Button className="w-full" onClick={saveReminder}>
            Save reminder
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setReminderOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => setReminderOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveReminder}>Save reminder</Button>
        </DialogFooter>
      )}
    </div>
  )

  const taskForm = (
    <div className="space-y-4">
      <Input
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        placeholder="What needs doing?"
        autoFocus
      />
      {isMobile ? (
        <DrawerFooter className="px-0">
          <Button className="w-full" onClick={addTask}>
            Add task
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setTaskOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => setTaskOpen(false)}>
            Cancel
          </Button>
          <Button onClick={addTask}>Add task</Button>
        </DialogFooter>
      )}
    </div>
  )

  const noteForm = (
    <div className="space-y-4">
      <Input
        value={noteTitle}
        onChange={(e) => setNoteTitle(e.target.value)}
        placeholder="Title"
      />
      <Textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write or dictate a note…"
        className="min-h-28"
      />
      {isMobile ? (
        <DrawerFooter className="px-0">
          <Button className="w-full" onClick={saveNote}>
            Save note
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setNoteOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      ) : (
        <DialogFooter>
          <Button variant="outline" onClick={() => setNoteOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveNote}>Save note</Button>
        </DialogFooter>
      )}
    </div>
  )

  return (
    <div
      className="mx-auto max-w-xl space-y-6"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
    >
      {(listening || hint || aiProgress) && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {hint || aiProgress}
        </p>
      )}

      <section className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setTaskTitle("")
            setTaskOpen(true)
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          <Plus className="size-3.5 text-muted-foreground" />
          Task
        </button>
        <button
          type="button"
          onClick={() => {
            setReminderTitle("")
            setReminderDue("")
            setReminderOpen(true)
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          <Bell className="size-3.5 text-muted-foreground" />
          Reminder
        </button>
        <button
          type="button"
          onClick={() => startVoice("capture")}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
        >
          <Mic className="size-3.5" />
          Voice task
        </button>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Focus</h2>
          <span className="text-xs text-muted-foreground">
            {tasks.filter((t) => !t.completed).length} open
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card">
          {tasks.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks yet</p>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < tasks.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === task.id ? { ...t, completed: !t.completed } : t
                      )
                    )
                  }
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    task.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {task.completed && <Check className="size-3" />}
                </button>
                <p
                  className={`min-w-0 flex-1 text-sm font-medium ${
                    task.completed ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Reminders</h2>
          <span className="text-xs text-muted-foreground">{reminders.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-card">
          {reminders.length === 0 ? (
            <button
              type="button"
              onClick={() => setReminderOpen(true)}
              className="w-full px-4 py-8 text-center text-sm text-muted-foreground"
            >
              No reminders — tap to add one
            </button>
          ) : (
            reminders.map((r, idx) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < reminders.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.dueAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {r.firedAt ? " · sent" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    deleteReminder(r.id)
                    setReminders(upcomingReminders(30))
                  }}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Notes (optional)</span>
          <span className="text-xs font-normal text-muted-foreground">{notes.length}</span>
        </summary>
        <div className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNoteTitle("")
                setNoteContent("")
                setNoteOpen(true)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium"
            >
              <Plus className="size-3" />
              Note
            </button>
            <button
              type="button"
              onClick={() => startVoice("note")}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium"
            >
              <Mic className="size-3" />
              Dictate
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Notes are secondary — spending clarity lives in Insights.
            </p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      {isMobile ? (
        <>
          <Drawer open={taskOpen} onOpenChange={setTaskOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader>
                <DrawerTitle>New Task</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
                {taskForm}
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={noteOpen} onOpenChange={setNoteOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader>
                <DrawerTitle>New Note</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
                {noteForm}
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer open={reminderOpen} onOpenChange={setReminderOpen}>
            <DrawerContent className="p-0">
              <DrawerHeader>
                <DrawerTitle>New Reminder</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
                {reminderForm}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <>
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
              </DialogHeader>
              {taskForm}
            </DialogContent>
          </Dialog>
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>New note</DialogTitle>
              </DialogHeader>
              {noteForm}
            </DialogContent>
          </Dialog>
          <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>New reminder</DialogTitle>
              </DialogHeader>
              {reminderForm}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
