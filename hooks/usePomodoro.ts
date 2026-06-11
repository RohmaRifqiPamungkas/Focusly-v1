'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { PomodoroState, PomodoroMode, PomodoroSession } from '@/types'
import { generateId } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

function playCompletionSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.28, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      osc.start(t)
      osc.stop(t + 1.4)
    })
  } catch { /* Web Audio API not available */ }
}

// Timer state stays local — only settings and completed sessions go to Supabase
const TIMER_KEY = 'devhub-pomodoro-timer'

const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, dailyGoal: 8 }

const DEFAULT_STATE: PomodoroState = {
  mode: 'focus',
  timeRemaining: 25 * 60,
  isRunning: false,
  sessions: [],
  settings: DEFAULT_SETTINGS,
  label: 'Deep Work',
}

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>(DEFAULT_STATE)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevTimeRef = useRef(state.timeRemaining)

  // Play sound on completion
  useEffect(() => {
    if (prevTimeRef.current > 0 && state.timeRemaining === 0) {
      playCompletionSound()
    }
    prevTimeRef.current = state.timeRemaining
  }, [state.timeRemaining])

  // Load timer state from localStorage and settings from Supabase
  useEffect(() => {
    // Restore timer position from localStorage
    try {
      const stored = localStorage.getItem(TIMER_KEY)
      if (stored) {
        const parsed: PomodoroState = JSON.parse(stored)
        if (parsed.isRunning && parsed.startedAt) {
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000)
          const newRemaining = Math.max(0, parsed.timeRemaining - elapsed)
          setState({
            ...parsed,
            timeRemaining: newRemaining > 0 ? newRemaining : 0,
            isRunning: newRemaining > 0,
            startedAt: newRemaining > 0 ? Date.now() : undefined,
          })
        } else {
          setState(parsed)
        }
      }
    } catch { /* ignore */ }

    // Load settings and today's sessions from Supabase
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setSettingsLoaded(true); return }

      const [settingsRes, sessionsRes] = await Promise.all([
        supabase.from('pomodoro_settings').select('*').eq('user_id', user.id).single(),
        supabase
          .from('pomodoro_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ])

      const settings = settingsRes.data
        ? {
            focus: settingsRes.data.focus,
            shortBreak: settingsRes.data.short_break,
            longBreak: settingsRes.data.long_break,
            dailyGoal: settingsRes.data.daily_goal,
          }
        : DEFAULT_SETTINGS

      const sessions: PomodoroSession[] = (sessionsRes.data ?? []).map((r) => ({
        id: r.id,
        mode: r.mode as PomodoroMode,
        duration: r.duration,
        completedAt: r.completed_at,
      }))

      setState((prev) => {
        const duration = getModeDuration(prev.mode, settings)
        return {
          ...prev,
          settings,
          sessions,
          // Only reset timeRemaining if we have fresh settings and no saved timer
          timeRemaining: localStorage.getItem(TIMER_KEY) ? prev.timeRemaining : duration,
        }
      })
      setSettingsLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist timer position to localStorage every tick
  const saveTimer = useCallback((s: PomodoroState) => {
    setState(s)
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [])

  // Countdown interval
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.isRunning) return prev
          const newRemaining = prev.timeRemaining - 1
          if (newRemaining <= 0) {
            const session: PomodoroSession = {
              id: generateId(),
              mode: prev.mode,
              duration:
                prev.settings[
                  prev.mode === 'focus' ? 'focus' : prev.mode === 'short-break' ? 'shortBreak' : 'longBreak'
                ] * 60,
              completedAt: new Date().toISOString(),
            }
            // Persist completed session to Supabase
            createClient().auth.getUser().then(({ data: { user } }) => {
              if (!user) return
              createClient().from('pomodoro_sessions').insert({
                id: session.id,
                user_id: user.id,
                mode: session.mode,
                duration: session.duration,
                completed_at: session.completedAt,
              })
            })
            const next: PomodoroState = {
              ...prev,
              isRunning: false,
              timeRemaining: 0,
              sessions: [...prev.sessions, session],
              startedAt: undefined,
            }
            try { localStorage.setItem(TIMER_KEY, JSON.stringify(next)) } catch { /* ignore */ }
            return next
          }
          const next = { ...prev, timeRemaining: newRemaining }
          try { localStorage.setItem(TIMER_KEY, JSON.stringify(next)) } catch { /* ignore */ }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [state.isRunning])

  const start = useCallback(() => {
    saveTimer({ ...state, isRunning: true, startedAt: Date.now() })
  }, [state, saveTimer])

  const pause = useCallback(() => {
    saveTimer({ ...state, isRunning: false, startedAt: undefined })
  }, [state, saveTimer])

  const reset = useCallback(() => {
    const duration = getModeDuration(state.mode, state.settings)
    saveTimer({ ...state, isRunning: false, timeRemaining: duration, startedAt: undefined })
  }, [state, saveTimer])

  const setMode = useCallback((mode: PomodoroMode) => {
    const duration = getModeDuration(mode, state.settings)
    const labelMap: Record<PomodoroMode, string> = {
      focus: 'Deep Work',
      'short-break': 'Short Break',
      'long-break': 'Long Break',
    }
    saveTimer({ ...state, mode, isRunning: false, timeRemaining: duration, startedAt: undefined, label: labelMap[mode] })
  }, [state, saveTimer])

  const skip = useCallback(() => {
    const modeOrder: PomodoroMode[] = ['focus', 'short-break', 'long-break']
    const next = modeOrder[(modeOrder.indexOf(state.mode) + 1) % modeOrder.length]
    setMode(next)
  }, [state.mode, setMode])

  const updateSettings = useCallback(
    async (settings: typeof DEFAULT_SETTINGS) => {
      const duration = getModeDuration(state.mode, settings)
      saveTimer({ ...state, settings, timeRemaining: duration, isRunning: false, startedAt: undefined })

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('pomodoro_settings').upsert({
        user_id: user.id,
        focus: settings.focus,
        short_break: settings.shortBreak,
        long_break: settings.longBreak,
        daily_goal: settings.dailyGoal,
      })
    },
    [state, saveTimer]
  )

  const todaySessions = state.sessions.filter((s) => {
    const today = new Date().toDateString()
    return new Date(s.completedAt).toDateString() === today
  })

  const focusTimeToday = todaySessions
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + s.duration, 0)

  const totalDuration = getModeDuration(state.mode, state.settings)
  const progress = totalDuration > 0 ? ((totalDuration - state.timeRemaining) / totalDuration) * 100 : 0

  return {
    state,
    settingsLoaded,
    start,
    pause,
    reset,
    skip,
    setMode,
    updateSettings,
    todaySessions,
    focusTimeToday,
    progress,
    totalDuration,
  }
}

function getModeDuration(mode: PomodoroMode, settings: typeof DEFAULT_SETTINGS): number {
  if (mode === 'focus') return settings.focus * 60
  if (mode === 'short-break') return settings.shortBreak * 60
  return settings.longBreak * 60
}
