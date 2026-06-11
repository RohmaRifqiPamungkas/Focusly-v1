'use client'
import { useState, useEffect, useCallback } from 'react'
import { Task, Priority, TaskStatus } from '@/types'
import { generateId } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type DbTask = {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  category?: string
  deadline?: string
  created_at: string
  order: number
}

function toTask(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as Priority,
    status: row.status as TaskStatus,
    category: row.category,
    deadline: row.deadline,
    createdAt: row.created_at,
    order: row.order,
  }
}

export function useTodos() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })
        .then(({ data }) => {
          if (data) setTasks((data as DbTask[]).map(toTask))
          setLoading(false)
        })
    })
  }, [])

  const addTask = useCallback(
    async (data: {
      title: string
      description?: string
      priority: Priority
      status: TaskStatus
      category?: string
      deadline?: string
    }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const id = generateId()
      const now = new Date().toISOString()
      const newTask: Task = { ...data, id, createdAt: now, order: tasks.length }
      setTasks((prev) => [...prev, newTask])
      await supabase.from('tasks').insert({
        id,
        user_id: user.id,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: data.status,
        category: data.category ?? null,
        deadline: data.deadline ?? null,
        created_at: now,
        order: tasks.length,
      })
    },
    [tasks.length]
  )

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
      const supabase = createClient()
      const dbPatch: Record<string, unknown> = {}
      if ('title' in updates) dbPatch.title = updates.title
      if ('description' in updates) dbPatch.description = updates.description ?? null
      if ('priority' in updates) dbPatch.priority = updates.priority
      if ('status' in updates) dbPatch.status = updates.status
      if ('category' in updates) dbPatch.category = updates.category ?? null
      if ('deadline' in updates) dbPatch.deadline = updates.deadline ?? null
      if ('order' in updates) dbPatch.order = updates.order
      await supabase.from('tasks').update(dbPatch).eq('id', id)
    },
    []
  )

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
  }, [])

  const toggleTask = useCallback(async (id: string) => {
    const supabase = createClient()
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id) return t
        const status: TaskStatus = t.status === 'completed' ? 'todo' : 'completed'
        supabase.from('tasks').update({ status }).eq('id', id)
        return { ...t, status }
      })
      return updated
    })
  }, [])

  const reorderTasks = useCallback(async (newTasks: Task[]) => {
    setTasks(newTasks)
    const supabase = createClient()
    await Promise.all(
      newTasks.map((t, i) => supabase.from('tasks').update({ order: i }).eq('id', t.id))
    )
  }, [])

  return { tasks, loading, addTask, updateTask, deleteTask, reorderTasks, toggleTask }
}
