'use client'
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Note } from '@/types'
import { generateId } from '@/lib/utils'

const STORAGE_KEY = 'devhub-notes'

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Architecture Meeting Notes',
    content: 'Discussed the transition to microservices for the payment module. Key decisions: use gRPC for internal communication, deploy on K8s.',
    tags: ['architecture', 'meeting'],
    pinned: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    title: 'Ideas for Q3 Hackathon',
    content: 'AI driven code review tool leveraging the new Anthropic API. Could integrate with GitHub PR workflow.',
    tags: ['ideas', 'hackathon', 'ai'],
    pinned: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Deployment Checklist',
    content: '1. Backup DB\n2. Run migrations\n3. Swap staging to blue\n4. Monitor error rates\n5. Notify team on Slack',
    tags: ['devops', 'checklist'],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function useNotes() {
  const [notes, setNotes] = useLocalStorage<Note[]>(STORAGE_KEY, INITIAL_NOTES)

  const addNote = useCallback(
    (data: { title: string; content: string; tags: string[] }) => {
      const now = new Date().toISOString()
      const newNote: Note = {
        ...data,
        id: generateId(),
        pinned: false,
        createdAt: now,
        updatedAt: now,
      }
      setNotes((prev) => [newNote, ...prev])
    },
    [setNotes]
  )

  const updateNote = useCallback(
    (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
        )
      )
    },
    [setNotes]
  )

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id))
    },
    [setNotes]
  )

  const togglePin = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
      )
    },
    [setNotes]
  )

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return { notes: sortedNotes, addNote, updateNote, deleteNote, togglePin }
}
