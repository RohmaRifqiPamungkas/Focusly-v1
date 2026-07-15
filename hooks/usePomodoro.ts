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

  // PERBAIKAN: Fungsi pembantu diperkuat agar mampu mendeteksi electronAPI global secara aman
  const updateElectronMenuBar = useCallback((text: string) => {
    if (typeof window !== 'undefined') {
      const electron = (window as any).electronAPI || (globalThis as any).electronAPI
      if (electron && typeof electron.updateTimer === 'function') {
        electron.updateTimer(text)
      } else {
        console.warn('Electron API tidak terdeteksi pada lingkup window.')
      }
    }
  }, [])

  // Fungsi pembantu untuk menyimpan sesi ke Supabase
  const saveSessionToSupabase = useCallback((session: PomodoroSession) => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      createClient()
        .from('pomodoro_sessions')
        .insert({
          id: session.id,
          user_id: user.id,
          mode: session.mode,
          duration: session.duration,
          completed_at: session.completedAt,
        })
        .then(({ error }) => {
          if (error) console.error('[usePomodoro] session insert error:', error)
        })
    })
  }, [])

  // Minta izin notifikasi browser saat pertama kali aplikasi dibuka
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [])

  // Penanganan suara & notifikasi ketika timer menyentuh 0 (Aktif maupun Minimize)
  useEffect(() => {
    if (prevTimeRef.current > 0 && state.timeRemaining === 0) {
      if (document.visibilityState === 'visible') {
        playCompletionSound()
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Waktu Selesai! 🎯', {
            body: state.mode === 'focus' ? 'Sesi fokus berakhir, mari istirahat sejenak!' : 'Waktu istirahat selesai, yuk kembali produktif!',
            icon: '/favicon.ico',
          })
        }
        playCompletionSound()
      }
    }
    prevTimeRef.current = state.timeRemaining
  }, [state.timeRemaining, state.mode])

  // Fungsi sinkronisasi mandiri untuk mencocokkan waktu asli vs waktu tersimpan
  const syncTimerState = useCallback(() => {
    try {
      const stored = localStorage.getItem(TIMER_KEY)
      if (!stored) return

      const parsed: PomodoroState = JSON.parse(stored)
      if (parsed.isRunning && parsed.startedAt) {
        const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000)
        const newRemaining = Math.max(0, parsed.timeRemaining - elapsed)

        if (newRemaining <= 0 && parsed.timeRemaining > 0) {
          const completedAtTime = new Date(parsed.startedAt + parsed.timeRemaining * 1000).toISOString()
          const session: PomodoroSession = {
            id: generateId(),
            mode: parsed.mode,
            duration: getModeDuration(parsed.mode, parsed.settings),
            completedAt: completedAtTime,
          }

          saveSessionToSupabase(session)
          updateElectronMenuBar('') // Bersihkan Menu Bar karena waktu habis

          const next: PomodoroState = {
            ...parsed,
            isRunning: false,
            timeRemaining: 0,
            sessions: [...parsed.sessions, session],
            startedAt: undefined,
          }
          setState(next)
          localStorage.setItem(TIMER_KEY, JSON.stringify(next))
        } else {
          setState({
            ...parsed,
            timeRemaining: newRemaining,
            isRunning: newRemaining > 0,
            startedAt: newRemaining > 0 ? Date.now() : undefined,
          })
        }
      } else {
        setState(parsed)
      }
    } catch { /* ignore */ }
  }, [saveSessionToSupabase, updateElectronMenuBar])

  // Pantau transisi Page Visibility (Minimize <-> Open)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimerState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [syncTimerState])

  // Load awal saat aplikasi pertama kali di-close lalu dibuka kembali
  useEffect(() => {
    syncTimerState()

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

      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
        console.error('[usePomodoro] settings fetch error:', settingsRes.error)
      }

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
          timeRemaining: localStorage.getItem(TIMER_KEY) ? prev.timeRemaining : duration,
        }
      })
      setSettingsLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveTimer = useCallback((s: PomodoroState) => {
    setState(s)
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [])

  // Menggunakan delta waktu (Timestamp) di dalam interval untuk mencegah lag/throttling browser
  useEffect(() => {
    if (state.isRunning && state.startedAt) {
      const startTime = state.startedAt
      const startRemaining = state.timeRemaining

      intervalRef.current = setInterval(() => {
        const totalElapsed = Math.floor((Date.now() - startTime) / 1000)
        const newRemaining = Math.max(0, startRemaining - totalElapsed)

        // SINKRONISASI UPDATE MAC MENU BAR ELEKTRON (DI SINI)
        const minutes = Math.floor(newRemaining / 60).toString().padStart(2, '0')
        const seconds = (newRemaining % 60).toString().padStart(2, '0')
        updateElectronMenuBar(`${minutes}:${seconds}`)

        setState((prev) => {
          if (!prev.isRunning) return prev

          if (newRemaining <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current)

            const session: PomodoroSession = {
              id: generateId(),
              mode: prev.mode,
              duration: getModeDuration(prev.mode, prev.settings),
              completedAt: new Date().toISOString(),
            }

            saveSessionToSupabase(session)
            updateElectronMenuBar('') // Hapus timer di menu bar atas saat durasi selesai

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
  }, [state.isRunning, state.startedAt, saveSessionToSupabase, updateElectronMenuBar])

  const start = useCallback(() => {
    const now = Date.now()
    saveTimer({ ...state, isRunning: true, startedAt: now })
  }, [state, saveTimer])

  const pause = useCallback(() => {
    updateElectronMenuBar('') // Kosongkan Menu Bar saat di-pause
    saveTimer({ ...state, isRunning: false, startedAt: undefined })
  }, [state, saveTimer, updateElectronMenuBar])

  const reset = useCallback(() => {
    updateElectronMenuBar('') // Kosongkan Menu Bar saat di-reset
    const duration = getModeDuration(state.mode, state.settings)
    saveTimer({ ...state, isRunning: false, timeRemaining: duration, startedAt: undefined })
  }, [state, saveTimer, updateElectronMenuBar])

  const setMode = useCallback((mode: PomodoroMode) => {
    updateElectronMenuBar('')
    const duration = getModeDuration(mode, state.settings)
    const labelMap: Record<PomodoroMode, string> = {
      focus: 'Deep Work',
      'short-break': 'Short Break',
      'long-break': 'Long Break',
    }
    saveTimer({ ...state, mode, isRunning: false, timeRemaining: duration, startedAt: undefined, label: labelMap[mode] })
  }, [state, saveTimer, updateElectronMenuBar])

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
      const { error } = await supabase.from('pomodoro_settings').upsert({
        user_id: user.id,
        focus: settings.focus,
        short_break: settings.shortBreak,
        long_break: settings.longBreak,
        daily_goal: settings.dailyGoal,
      })
      if (error) console.error('[usePomodoro] settings upsert error:', error)
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