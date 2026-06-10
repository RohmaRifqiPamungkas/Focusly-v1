'use client'
import { motion } from 'framer-motion'
import { RotateCcw, Pause, Play, SkipForward, Target, Clock } from 'lucide-react'
import { usePomodoro } from '@/hooks/usePomodoro'
import { PomodoroMode } from '@/types'
import { formatTime, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MODES: { id: PomodoroMode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short-break', label: 'Short Break' },
  { id: 'long-break', label: 'Long Break' },
]

function CircularProgress({ progress, timeRemaining, label }: { progress: number; timeRemaining: number; label: string }) {
  const r = 120
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
      <svg
        className="-rotate-90 absolute inset-0"
        viewBox="0 0 280 280"
        width="300"
        height="300"
      >
        <circle
          cx="140" cy="140" r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          cx="140" cy="140" r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-6xl font-bold font-mono text-foreground tracking-tight">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-medium">
          {label}
        </div>
      </div>
    </div>
  )
}

function WeekChart({ sessions }: { sessions: { key: number; day: string; count: number; isToday: boolean }[] }) {
  const max = Math.max(...sessions.map((s) => s.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {sessions.map(({ key, day, count, isToday }) => (
        <div key={key} className="flex flex-col items-center gap-1 flex-1">
          <div
            className={cn(
              'w-full rounded-sm transition-all',
              isToday ? 'bg-primary' : 'bg-border'
            )}
            style={{ height: `${Math.max((count / max) * 52, count > 0 ? 6 : 2)}px` }}
          />
          <span className="text-[10px] text-muted-foreground">{day}</span>
        </div>
      ))}
    </div>
  )
}

export function PomodoroContent() {
  const { state, start, pause, reset, skip, setMode, todaySessions, focusTimeToday, progress, totalDuration } = usePomodoro()

  const focusSessions = todaySessions.filter((s) => s.mode === 'focus')

  const weekSessions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toDateString()
    const isToday = i === 6
    const count = state.sessions.filter((s) => new Date(s.completedAt).toDateString() === dayStr && s.mode === 'focus').length
    return { key: i, day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][d.getDay() === 0 ? 6 : d.getDay() - 1], count, isToday }
  })

  return (
    <div className="min-h-full flex">
      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8 gap-8">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                'px-5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer',
                state.mode === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <motion.div
          key={state.mode}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CircularProgress
            progress={progress}
            timeRemaining={state.timeRemaining}
            label={state.label ?? 'Focus'}
          />
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={state.isRunning ? pause : start}
            className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all cursor-pointer shadow-lg"
          >
            {state.isRunning
              ? <Pause className="w-6 h-6" />
              : <Play className="w-6 h-6 ml-0.5" />
            }
          </button>
          <button
            onClick={skip}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 border-l border-border bg-card p-5 flex flex-col gap-5 shrink-0">
        {/* Durations */}
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Durations</h3>
          <div className="space-y-2">
            {[
              { label: 'Focus', value: `${state.settings.focus}m`, icon: '🎯', mode: 'focus' as PomodoroMode },
              { label: 'Short Break', value: `${state.settings.shortBreak}m`, icon: '☕', mode: 'short-break' as PomodoroMode },
              { label: 'Long Break', value: `${state.settings.longBreak}m`, icon: '🛋️', mode: 'long-break' as PomodoroMode },
            ].map(({ label, value, icon, mode }) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer',
                  state.mode === mode
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-sm font-mono font-semibold">{value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Daily Goal */}
        <div className="rounded-xl border border-border bg-background p-4 flex-1">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Daily Goal</h3>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-foreground">{focusSessions.length}</span>
            <span className="text-sm text-muted-foreground">/ {state.settings.dailyGoal} sessions</span>
          </div>
          <WeekChart sessions={weekSessions} />
          {focusTimeToday > 0 && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Total: {formatDuration(focusTimeToday)}</span>
            </div>
          )}
        </div>

        {/* Session history */}
        {todaySessions.length > 0 && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Today</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {[...todaySessions].reverse().slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{s.mode.replace('-', ' ')}</span>
                  <span className="text-foreground font-mono">{formatDuration(s.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
