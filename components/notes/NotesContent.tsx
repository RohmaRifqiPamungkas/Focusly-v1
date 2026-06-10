'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Pin, Trash2, Edit3, Tag, X, StickyNote } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'
import { Note } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface NoteFormData {
  title: string
  content: string
  tags: string
}

function NoteDialog({
  open, onClose, onSave, initial,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: NoteFormData) => void
  initial?: Note | null
}) {
  const [form, setForm] = useState<NoteFormData>(
    initial
      ? { title: initial.title, content: initial.content, tags: initial.tags.join(', ') }
      : { title: '', content: '', tags: '' }
  )

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { title: initial.title, content: initial.content, tags: initial.tags.join(', ') }
          : { title: '', content: '', tags: '' }
      )
    }
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Note' : 'New Note'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="Note title..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Content</Label>
            <Textarea
              placeholder="Write your note..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="h-36"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Tags (comma separated)</Label>
            <Input
              placeholder="e.g. work, ideas, important"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (form.title.trim()) {
                onSave(form)
                onClose()
              }
            }}
          >
            {initial ? 'Save Changes' : 'Add Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteCard({
  note, onEdit, onDelete, onPin,
}: {
  note: Note
  onEdit: () => void
  onDelete: () => void
  onPin: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm text-foreground line-clamp-1 flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onPin}
            className={cn(
              'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
              note.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {note.pinned && (
          <Pin className={cn('w-3.5 h-3.5 text-primary shrink-0', 'group-hover:hidden')} />
        )}
      </div>

      {note.content && (
        <p className="text-xs text-muted-foreground line-clamp-3 flex-1 leading-relaxed">{note.content}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {format(new Date(note.updatedAt), 'MMM d')}
        </span>
      </div>
    </motion.div>
  )
}

export function NotesContent() {
  const { notes, addNote, updateNote, deleteNote, togglePin } = useNotes()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)))

  const filtered = notes.filter((n) => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false
    if (filterTag && !n.tags.includes(filterTag)) return false
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quick Notes</h1>
          <p className="text-muted-foreground mt-1">Capture ideas, meeting notes, and more.</p>
        </div>
        <Button
          onClick={() => { setEditNote(null); setDialogOpen(true) }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Note
        </Button>
      </motion.div>

      {/* Search + tag filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterTag(null)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer',
              !filterTag
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer',
                filterTag === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Tag className="w-3 h-3" /> {tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes grid */}
      {filtered.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => { setEditNote(note); setDialogOpen(true) }}
                onDelete={() => deleteNote(note.id)}
                onPin={() => togglePin(note.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground"
        >
          <StickyNote className="w-12 h-12 opacity-20" />
          <p className="text-sm">No notes found</p>
          <Button variant="ghost" size="sm" onClick={() => { setEditNote(null); setDialogOpen(true) }}>
            + Create your first note
          </Button>
        </motion.div>
      )}

      <NoteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditNote(null) }}
        initial={editNote}
        onSave={(data) => {
          const tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          if (editNote) {
            updateNote(editNote.id, { title: data.title, content: data.content, tags })
          } else {
            addNote({ title: data.title, content: data.content, tags })
          }
        }}
      />
    </div>
  )
}
