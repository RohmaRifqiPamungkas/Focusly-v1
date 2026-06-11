'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList, CheckCircle2, Clock, FileText, Plus, Play,
  TrendingUp, Calendar, Pause, SkipForward, ExternalLink, Pin,
} from 'lucide-react'
import Link from 'next/link'
import { useTodos } from '@/hooks/useTodos'
import { usePomodoro } from '@/hooks/usePomodoro'
import { useNotes } from '@/hooks/useNotes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatTime, formatDuration } from '@/lib/utils'
import { Priority, TaskStatus } from '@/types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function priorityVariant(p: Priority) {
  return ({ critical: 'critical', high: 'high', medium: 'medium', low: 'low' } as const)[p]
}

function statusLabel(s: TaskStatus): string {
  return ({ todo: 'Todo', 'in-progress': 'In Progress', completed: 'Done' })[s]
}

function PomodoroCircle({ progress, time, label }: { progress: number; time: string; label: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" width="112" height="112">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="var(--primary)" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-lg font-bold font-mono text-foreground leading-none">{time}</div>
        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}

export function DashboardContent() {
  const { tasks } = useTodos()
  const { state, start, pause, skip, progress, focusTimeToday } = usePomodoro()
  const { notes } = useNotes()

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status !== 'completed').length,
    focusTime: focusTimeToday,
    notes: notes.length,
  }), [tasks, focusTimeToday, notes])

  const todayTasks = tasks.slice(0, 4)
  const recentNotes = notes.slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{greeting}, Alex</h1>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/todo">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">Task</span>
            </Button>
          </Link>
          <Link href="/pomodoro">
            <Button size="sm" className="gap-2">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Start Focus</span>
              <span className="sm:hidden">Focus</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        {[
          {
            label: 'TOTAL TASKS', value: stats.total,
            icon: ClipboardList, extra: null,
          },
          {
            label: 'COMPLETED', value: stats.completed,
            icon: CheckCircle2,
            extra: (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xl font-bold text-foreground">{stats.completed}</span>
                  <span className="text-sm text-muted-foreground">/ {stats.total}</span>
                </div>
                <Progress value={stats.total ? (stats.completed / stats.total) * 100 : 0} className="h-1" />
              </div>
            ),
          },
          {
            label: 'FOCUS TIME',
            value: formatDuration(stats.focusTime || 0),
            icon: Clock, extra: null,
          },
          {
            label: 'NOTES CREATED', value: stats.notes,
            icon: FileText,
            extra: (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-xs text-success">+2</span>
              </div>
            ),
          },
        ].map(({ label, value, icon: Icon, extra }, i) => (
          <motion.div
            key={label} variants={item}
            className="rounded-xl border border-border bg-card p-3 sm:p-5"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              </div>
            </div>
            {extra ?? <div className="text-2xl sm:text-3xl font-bold text-foreground">{value}</div>}
          </motion.div>
        ))}
      </motion.div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Today&apos;s Tasks</span>
            <button className="text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-border">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-border'}`}>
                  {task.status === 'completed' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`flex-1 text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={priorityVariant(task.priority)} className="capitalize">
                    {task.priority}
                  </Badge>
                  {task.category && (
                    <span className="hidden sm:inline text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                      {task.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No tasks yet. <Link href="/todo" className="text-primary hover:underline">Add your first task</Link>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <Link href="/todo" className="text-xs text-primary hover:underline">
              View all {tasks.length} tasks →
            </Link>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Pomodoro widget */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card"
          >
            <div className="px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Current Session</span>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <PomodoroCircle
                progress={progress}
                time={formatTime(state.timeRemaining)}
                label={state.label ?? 'Focus'}
              />
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  onClick={state.isRunning ? pause : start}
                >
                  {state.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  onClick={skip}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <Link href="/pomodoro">
                  <Button size="sm" variant="ghost" className="h-10 px-3 text-xs text-muted-foreground">
                    Full View
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Recent Notes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card flex-1"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Recent Notes</span>
              <Link href="/notes">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentNotes.map((note) => (
                <div key={note.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    {note.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                    <p className="text-sm font-medium text-foreground truncate">{note.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  <Link href="/notes" className="text-primary hover:underline">Create your first note</Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
