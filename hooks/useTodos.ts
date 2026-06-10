'use client'
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Task, Priority, TaskStatus } from '@/types'
import { generateId } from '@/lib/utils'

const STORAGE_KEY = 'devhub-todos'

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Implement authentication flow',
    priority: 'high',
    status: 'todo',
    category: 'Frontend',
    createdAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: '2',
    title: 'Update API documentation for v2',
    priority: 'medium',
    status: 'todo',
    category: 'Docs',
    createdAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: '3',
    title: 'Refactor user settings module',
    priority: 'low',
    status: 'completed',
    category: 'Refactor',
    createdAt: new Date().toISOString(),
    order: 2,
  },
  {
    id: '4',
    title: 'Fix responsive layout on dashboard',
    priority: 'high',
    status: 'todo',
    category: 'UI/UX',
    createdAt: new Date().toISOString(),
    order: 3,
  },
  {
    id: '5',
    title: 'Migrate Auth Service to OAuth2.1',
    priority: 'critical',
    status: 'in-progress',
    category: 'Work',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    order: 4,
  },
  {
    id: '6',
    title: 'Update React Components to Server Components',
    priority: 'high',
    status: 'todo',
    category: 'Work',
    deadline: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date().toISOString(),
    order: 5,
  },
  {
    id: '7',
    title: 'Refactor Navigation Shared Components JSON',
    priority: 'medium',
    status: 'todo',
    category: 'Work',
    deadline: new Date(Date.now() + 1209600000).toISOString(),
    createdAt: new Date().toISOString(),
    order: 6,
  },
  {
    id: '8',
    title: 'Update Readme Documentation',
    priority: 'low',
    status: 'completed',
    category: 'Personal',
    createdAt: new Date().toISOString(),
    order: 7,
  },
]

export function useTodos() {
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEY, INITIAL_TASKS)

  const addTask = useCallback(
    (data: { title: string; description?: string; priority: Priority; status: TaskStatus; category?: string; deadline?: string }) => {
      const newTask: Task = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        order: tasks.length,
      }
      setTasks((prev) => [...prev, newTask])
    },
    [tasks.length, setTasks]
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    },
    [setTasks]
  )

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    },
    [setTasks]
  )

  const reorderTasks = useCallback(
    (newTasks: Task[]) => {
      setTasks(newTasks)
    },
    [setTasks]
  )

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' }
            : t
        )
      )
    },
    [setTasks]
  )

  return { tasks, addTask, updateTask, deleteTask, reorderTasks, toggleTask }
}
