export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in-progress' | 'completed'
export type PomodoroMode = 'focus' | 'short-break' | 'long-break'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  category?: string
  deadline?: string
  createdAt: string
  order: number
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface PomodoroSettings {
  focus: number
  shortBreak: number
  longBreak: number
  dailyGoal: number
}

export interface PomodoroSession {
  id: string
  mode: PomodoroMode
  duration: number
  completedAt: string
}

export interface PomodoroState {
  mode: PomodoroMode
  timeRemaining: number
  isRunning: boolean
  sessions: PomodoroSession[]
  settings: PomodoroSettings
  startedAt?: number
  label?: string
}

export interface AppStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  focusTimeToday: number
  notesCount: number
  pomodoroSessionsToday: number
}
