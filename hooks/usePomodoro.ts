'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { PomodoroState, PomodoroMode, PomodoroSession } from '@/types'
import { generateId } from '@/lib/utils'

function playCompletionSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    // Ascending C major triad arpeggio: C5 → E5 → G5
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

const STORAGE_KEY = 'devhub-pomodoro'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevTimeRef = useRef(state.timeRemaining)

  useEffect(() => {
    if (prevTimeRef.current > 0 && state.timeRemaining === 0) {
      playCompletionSound()
    }
    prevTimeRef.current = state.timeRemaining
  }, [state.timeRemaining])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: PomodoroState = JSON.parse(stored)
        if (parsed.isRunning && parsed.startedAt) {
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000)
          const newRemaining = Math.max(0, parsed.timeRemaining - elapsed)
          if (newRemaining > 0) {
            setState({ ...parsed, timeRemaining: newRemaining, startedAt: Date.now() })
          } else {
            setState({ ...parsed, isRunning: false, timeRemaining: 0 })
          }
        } else {
          setState(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const save = useCallback((s: PomodoroState) => {
    setState(s)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [])

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
              duration: prev.settings[prev.mode === 'focus' ? 'focus' : prev.mode === 'short-break' ? 'shortBreak' : 'longBreak'] * 60,
              completedAt: new Date().toISOString(),
            }
            const next: PomodoroState = {
              ...prev,
              isRunning: false,
              timeRemaining: 0,
              sessions: [...prev.sessions, session],
              startedAt: undefined,
            }
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
            return next
          }
          const next = { ...prev, timeRemaining: newRemaining }
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [state.isRunning])

  const start = useCallback(() => {
    save({ ...state, isRunning: true, startedAt: Date.now() })
  }, [state, save])

  const pause = useCallback(() => {
    save({ ...state, isRunning: false, startedAt: undefined })
  }, [state, save])

  const reset = useCallback(() => {
    const duration = getModeDuration(state.mode, state.settings)
    save({ ...state, isRunning: false, timeRemaining: duration, startedAt: undefined })
  }, [state, save])

  const setMode = useCallback((mode: PomodoroMode) => {
    const duration = getModeDuration(mode, state.settings)
    const labelMap: Record<PomodoroMode, string> = {
      focus: 'Deep Work',
      'short-break': 'Short Break',
      'long-break': 'Long Break',
    }
    save({ ...state, mode, isRunning: false, timeRemaining: duration, startedAt: undefined, label: labelMap[mode] })
  }, [state, save])

  const skip = useCallback(() => {
    const modeOrder: PomodoroMode[] = ['focus', 'short-break', 'long-break']
    const next = modeOrder[(modeOrder.indexOf(state.mode) + 1) % modeOrder.length]
    setMode(next)
  }, [state.mode, setMode])

  const updateSettings = useCallback((settings: typeof DEFAULT_SETTINGS) => {
    const duration = getModeDuration(state.mode, settings)
    save({ ...state, settings, timeRemaining: duration, isRunning: false, startedAt: undefined })
  }, [state, save])

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
