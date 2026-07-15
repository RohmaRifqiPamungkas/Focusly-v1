'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Trash2, Edit3, Calendar,
  Circle, GripVertical, List, LayoutGrid, Eye,
  X, Check, Sparkles, Folder, Tag, AlertTriangle,
  Bold, Italic, ListOrdered, CheckSquare,
  Image as ImageIcon, Loader2, Paperclip, ExternalLink
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay,
  useDroppable, PointerSensorOptions, DragOverEvent
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTodos } from '@/hooks/useTodos'
import { Task, Priority, TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type ViewMode = 'list' | 'board'

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'completed']

const PRESET_GRADIENTS: Record<string, string> = {
  sunset: 'bg-gradient-to-r from-orange-400 to-pink-500',
  ocean: 'bg-gradient-to-r from-cyan-500 to-blue-600',
  emerald: 'bg-gradient-to-r from-emerald-400 to-teal-600',
  cosmic: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
  slate: 'bg-gradient-to-r from-slate-500 to-slate-700',
}

function priorityVariant(p: Priority) {
  return ({ critical: 'critical', high: 'high', medium: 'medium', low: 'low' } as const)[p]
}

function priorityColor(p: Priority) {
  return ({
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    low: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  })[p]
}

function statusLabel(s: TaskStatus): string {
  return ({
    backlog: 'Backlog',
    todo: 'Todo',
    'in-progress': 'In Progress',
    review: 'Review',
    completed: 'Completed'
  })[s]
}

function statusDot(s: TaskStatus): string {
  return ({
    backlog: 'bg-purple-400',
    todo: 'bg-slate-400',
    'in-progress': 'bg-sky-500 animate-pulse',
    review: 'bg-amber-500',
    completed: 'bg-emerald-500'
  })[s]
}

function statusColumnColor(s: TaskStatus): string {
  return ({
    backlog: 'border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/5',
    todo: 'border-border/60 bg-slate-50/50 dark:bg-slate-950/20',
    'in-progress': 'border-sky-500/20 bg-sky-50/20 dark:bg-sky-950/5',
    review: 'border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/5',
    completed: 'border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/5',
  })[s]
}

function statusHeaderColor(s: TaskStatus): string {
  return ({
    backlog: 'text-purple-600 dark:text-purple-400',
    todo: 'text-slate-600 dark:text-slate-400',
    'in-progress': 'text-sky-600 dark:text-sky-400',
    review: 'text-amber-600 dark:text-amber-400',
    completed: 'text-emerald-600 dark:text-emerald-400',
  })[s]
}

function getAttachments(coverValue?: string): string[] {
  if (!coverValue) return []
  try {
    const parsed = JSON.parse(coverValue)
    if (Array.isArray(parsed)) return parsed.map(String)
    return [coverValue]
  } catch {
    return coverValue.split(',').filter(Boolean)
  }
}

function renderInlineMarkdown(text: string) {
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g
  const tokens = text.split(regex)
  
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={i} className="italic text-foreground">{token.slice(1, -1)}</em>
    }
    return token
  })
}

function parseMarkdown(text: string, onToggleTodo?: (lineIndex: number, checked: boolean) => void) {
  if (!text) return null
  
  const lines = text.split('\n')
  const parsedElements: React.ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null

  const flushList = (key: string | number) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        parsedElements.push(
          <ul key={`ul-${key}`} className="list-disc pl-5 my-1.5 space-y-1">
            {currentList.items}
          </ul>
        )
      } else {
        parsedElements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-5 my-1.5 space-y-1">
            {currentList.items}
          </ol>
        )
      }
      currentList = null
    }
  }

  lines.forEach((line, idx) => {
    const checklistMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)/)
    if (checklistMatch) {
      flushList(idx)
      const checked = checklistMatch[1].toLowerCase() === 'x'
      const content = checklistMatch[2]
      parsedElements.push(
        <div key={`check-${idx}`} className="flex items-start gap-2 my-1">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => {
              if (onToggleTodo) {
                onToggleTodo(idx, e.target.checked)
              }
            }}
            disabled={!onToggleTodo}
            className="rounded border-border text-primary focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer disabled:cursor-default" 
          />
          <span 
            onClick={() => {
              if (onToggleTodo) {
                onToggleTodo(idx, !checked)
              }
            }}
            className={cn(
              "text-sm text-foreground select-none", 
              checked && "line-through text-muted-foreground/60",
              onToggleTodo && "cursor-pointer hover:text-primary transition-colors"
            )}
          >
            {renderInlineMarkdown(content)}
          </span>
        </div>
      )
      return
    }

    const bulletMatch = line.match(/^-\s+(.*)/)
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(idx)
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(
        <li key={`li-${idx}`} className="text-sm text-foreground leading-relaxed">
          {renderInlineMarkdown(bulletMatch[1])}
        </li>
      )
      return
    }

    const numberMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(idx)
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(
        <li key={`li-${idx}`} className="text-sm text-foreground leading-relaxed" value={parseInt(numberMatch[1], 10)}>
          {renderInlineMarkdown(numberMatch[2])}
        </li>
      )
      return
    }

    flushList(idx)
    if (line.trim() === '') {
      parsedElements.push(<div key={`empty-${idx}`} className="h-2" />)
    } else {
      parsedElements.push(
        <p key={`p-${idx}`} className="text-sm text-foreground leading-relaxed min-h-[1rem]">
          {renderInlineMarkdown(line)}
        </p>
      )
    }
  })

  flushList('final')
  return <div className="space-y-1">{parsedElements}</div>
}

function DescriptionEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('task-desc-textarea') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    
    const replacement = prefix + (selected || '') + suffix
    const newValue = text.substring(0, start) + replacement + text.substring(end)
    
    onChange(newValue)
    
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + selected.length + suffix.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget
      const val = textarea.value
      const start = textarea.selectionStart
      
      const beforeCursor = val.substring(0, start)
      const lineStartIdx = beforeCursor.lastIndexOf('\n') + 1
      const currentLine = beforeCursor.substring(lineStartIdx)

      const checklistMatch = currentLine.match(/^-\s+\[([ xX])\]\s*(.*)/)
      const bulletMatch = currentLine.match(/^-\s+(.*)/)
      const numberMatch = currentLine.match(/^(\d+)\.\s*(.*)/)

      if (checklistMatch) {
        e.preventDefault()
        const content = checklistMatch[2]
        if (content.trim() === '') {
          const newValue = val.substring(0, lineStartIdx) + val.substring(start)
          onChange(newValue)
          setTimeout(() => textarea.setSelectionRange(lineStartIdx, lineStartIdx), 0)
        } else {
          const prefix = '\n- [ ] '
          const newValue = val.substring(0, start) + prefix + val.substring(start)
          onChange(newValue)
          const nextPos = start + prefix.length
          setTimeout(() => textarea.setSelectionRange(nextPos, nextPos), 0)
        }
        return
      }

      if (bulletMatch) {
        e.preventDefault()
        const content = bulletMatch[1]
        if (content.trim() === '') {
          const newValue = val.substring(0, lineStartIdx) + val.substring(start)
          onChange(newValue)
          setTimeout(() => textarea.setSelectionRange(lineStartIdx, lineStartIdx), 0)
        } else {
          const prefix = '\n- '
          const newValue = val.substring(0, start) + prefix + val.substring(start)
          onChange(newValue)
          const nextPos = start + prefix.length
          setTimeout(() => textarea.setSelectionRange(nextPos, nextPos), 0)
        }
        return
      }

      if (numberMatch) {
        e.preventDefault()
        const num = parseInt(numberMatch[1], 10)
        const content = numberMatch[2]
        if (content.trim() === '') {
          const newValue = val.substring(0, lineStartIdx) + val.substring(start)
          onChange(newValue)
          setTimeout(() => textarea.setSelectionRange(lineStartIdx, lineStartIdx), 0)
        } else {
          const nextNum = num + 1
          const prefix = `\n${nextNum}. `
          const newValue = val.substring(0, start) + prefix + val.substring(start)
          onChange(newValue)
          const nextPos = start + prefix.length
          setTimeout(() => textarea.setSelectionRange(nextPos, nextPos), 0)
        }
        return
      }
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden resize-y min-h-[160px] h-[220px]">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-1.5 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
              activeTab === 'write' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
              activeTab === 'preview' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Preview
          </button>
        </div>

        {activeTab === 'write' && (
          <div className="flex items-center gap-0.5 border-l border-border/60 pl-2">
            <button
              type="button"
              title="Bold"
              onClick={() => insertFormatting('**', '**')}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Italic"
              onClick={() => insertFormatting('*', '*')}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Bullet List"
              onClick={() => insertFormatting('- ')}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Numbered List"
              onClick={() => insertFormatting('1. ')}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Checklist"
              onClick={() => insertFormatting('- [ ] ')}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex">
        {activeTab === 'write' ? (
          <textarea
            id="task-desc-textarea"
            placeholder="Add details, bullet points (-), checklists (- [ ]), or bold text (**text**)..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full h-full p-3 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none resize-none overflow-y-auto text-foreground"
          />
        ) : (
          <div className="flex-1 p-3.5 h-full bg-muted/10 overflow-y-auto">
            {value.trim() ? (
              parseMarkdown(value)
            ) : (
              <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskFormData {
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  category: string
  deadline: string
  cover: string
}

const DEFAULT_FORM: TaskFormData = {
  title: '', description: '', priority: 'medium',
  status: 'todo', category: '', deadline: '', cover: '',
}

function TaskDialog({ open, onClose, onSave, initial, defaultStatus = 'todo', onPreviewImage }: {
  open: boolean
  onClose: () => void
  onSave: (data: TaskFormData) => void
  initial?: Task | null
  defaultStatus?: TaskStatus
  onPreviewImage: (url: string) => void
}) {
  const [form, setForm] = useState<TaskFormData>(DEFAULT_FORM)

  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? {
            title: initial.title,
            description: initial.description ?? '',
            priority: initial.priority,
            status: initial.status,
            category: initial.category ?? '',
            deadline: initial.deadline ? initial.deadline.slice(0, 10) : '',
            cover: initial.cover ?? '',
          }
        : { ...DEFAULT_FORM, status: defaultStatus }
    )
  }, [open, initial, defaultStatus])

  const set = (k: keyof TaskFormData) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const attachments = getAttachments(form.cover)

  const addAttachment = (newUrl: string) => {
    const updated = [...attachments, newUrl]
    set('cover')(JSON.stringify(updated))
  }

  const removeAttachment = (indexToRemove: number) => {
    const updated = attachments.filter((_, i) => i !== indexToRemove)
    set('cover')(updated.length > 0 ? JSON.stringify(updated) : '')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden text-foreground">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {initial ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input placeholder="What needs to be done?" value={form.title} onChange={(e) => set('title')(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <DescriptionEditor value={form.description} onChange={set('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Input placeholder="e.g. Frontend, Marketing" value={form.category} onChange={(e) => set('category')(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => set('deadline')(e.target.value)} />
            </div>
          </div>

          {/* Attachment Management Section */}
          <div className="grid gap-2 border-t border-border/80 pt-3">

            {/* Custom Image Upload using Imgbb API */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  
                  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY
                  if (!apiKey) {
                    alert("NEXT_PUBLIC_IMGBB_API_KEY tidak ditemukan di environment variables Anda (.env.local)")
                    return
                  }

                  const formData = new FormData()
                  formData.append('image', file)
                  setUploading(true)

                  try {
                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                      method: 'POST',
                      body: formData,
                    })
                    const result = await response.json()
                    if (result.success) {
                      addAttachment(result.data.display_url)
                    } else {
                      alert(result.error?.message || "Upload ke Imgbb gagal.")
                    }
                  } catch (err) {
                    console.error(err)
                    alert("Terjadi kesalahan saat mengupload berkas gambar.")
                  } finally {
                    setUploading(false)
                  }
                }}
                id="cover-file-upload"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                disabled={uploading}
                onClick={() => document.getElementById('cover-file-upload')?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                {uploading ? "Uploading..." : "Attach Local Image"}
              </Button>
            </div>

            {/* Cover Previews inside Dialog */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                {attachments.map((item, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-border/80 h-20 relative group">
                    {item.startsWith('gradient:') ? (
                      <div className={cn("w-full h-full", PRESET_GRADIENTS[item.split(':')[1]])} />
                    ) : (
                      <img 
                        src={item} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                        alt={`Attachment ${idx + 1}`}
                        onClick={() => onPreviewImage(item)}
                        title="Click to preview"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80 text-white flex items-center justify-center transition-all cursor-pointer shadow opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 flex-row justify-end shrink-0 bg-muted/10">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (form.title.trim()) { onSave(form); onClose() } }}>
            {initial ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const DESC_PREVIEW_LIMIT = 100

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function TaskDetailDialog({ task, open, onClose, onEdit, onUpdate, onPreviewImage }: {
  task: Task | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onPreviewImage: (url: string) => void
}) {
  if (!task) return null
  const attachments = getAttachments(task.cover)

  const handleToggleTodo = (lineIndex: number, isChecked: boolean) => {
    if (!task.description) return
    const lines = task.description.split('\n')
    const line = lines[lineIndex]
    const checklistMatch = line.match(/^-\s+\[([ xX])\]\s*(.*)/)
    if (checklistMatch) {
      const content = checklistMatch[2]
      lines[lineIndex] = `- [${isChecked ? 'x' : ' '}] ${content}`
      const updatedDescription = lines.join('\n')
      onUpdate(task.id, { description: updatedDescription })
    }
  }

  const handleRemoveAttachment = (indexToRemove: number) => {
    const updated = attachments.filter((_, i) => i !== indexToRemove)
    const newCover = updated.length > 0 ? JSON.stringify(updated) : undefined
    onUpdate(task.id, { cover: newCover })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden text-foreground">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
          <DialogTitle className="leading-snug pr-4 text-xl font-bold flex items-start gap-2">
            <span className="mt-1 block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ({ backlog: '#c084fc', todo: '#94a3b8', 'in-progress': '#0ea5e9', review: '#f59e0b', completed: '#10b981' })[task.status] }} />
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('capitalize border', priorityColor(task.priority))} variant="outline">{task.priority}</Badge>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground bg-muted/40 font-medium">
              <div className={cn('w-1.5 h-1.5 rounded-full', statusDot(task.status))} />
              {statusLabel(task.status)}
            </div>
            {task.category && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-muted/20 flex items-center gap-1 font-medium">
                <Folder className="w-3 h-3" />
                {task.category}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
            {task.description ? (
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 text-sm text-foreground leading-relaxed">
                {parseMarkdown(task.description, handleToggleTodo)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-1">No description provided.</p>
            )}
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="space-y-2.5 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((item, idx) => (
                  <div key={idx} className="group/attach relative rounded-xl border border-border/80 overflow-hidden bg-muted/10 h-32 shadow-sm transition-all hover:shadow">
                    {item.startsWith('gradient:') ? (
                       <div className={cn("w-full h-full", PRESET_GRADIENTS[item.split(':')[1]])} />
                    ) : (
                      <>
                        <img src={item} className="w-full h-full object-cover animate-fade-in" alt={`Attachment ${idx + 1}`} />
                        <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover/attach:opacity-100 transition-opacity flex items-end sm:items-center justify-end sm:justify-center p-1.5 sm:p-0 gap-1.5 bg-black/10 sm:bg-black/40">
                          <button
                            type="button"
                            onClick={() => onPreviewImage(item)}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-background hover:bg-muted text-foreground transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1 shadow-sm border border-transparent"
                            title="Preview image"
                          >
                            <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span>
                          </button>
                          <a
                            href={item}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-background hover:bg-muted text-foreground transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1 shadow-sm border border-transparent"
                            title="Open full size"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Full</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-background hover:bg-destructive hover:text-destructive-foreground text-foreground transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1 shadow-sm border border-transparent"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {(task.deadline || task.createdAt) && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/80">
              {task.deadline && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deadline</p>
                  <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
              {task.createdAt && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground font-medium">{format(new Date(task.createdAt), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 flex-row justify-end shrink-0 bg-muted/10">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onEdit() }} className="gap-2">
            <Edit3 className="w-4 h-4" /> Edit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── List View Sortable Item ───────────────────────────────────────────────

function SortableTaskItem({ task, onToggle, onEdit, onDelete, onDetail }: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDetail: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <motion.div
      ref={setNodeRef} style={style}
      className={cn(
        'flex items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 border-b border-border last:border-0 group bg-card transition-colors duration-150',
        isDragging && 'opacity-50 bg-accent/30'
      )}
      layout
    >
      <button
        {...attributes} {...listeners}
        className="hidden sm:block cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={onToggle}
        className={cn(
          'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all cursor-pointer mt-0.5',
          task.status === 'completed' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-primary'
        )}
      >
        {task.status === 'completed' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
      </button>

      <div className="flex-1 min-w-0" onClick={onDetail}>
        <p className={cn('text-sm font-medium text-foreground hover:text-primary cursor-pointer transition-colors', task.status === 'completed' && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description ? (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 mt-1 italic">No description</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{format(new Date(task.deadline), 'MMM d')}</span>
            </div>
          )}
          {task.description && task.description.length > DESC_PREVIEW_LIMIT && (
            <button
              onClick={(e) => { e.stopPropagation(); onDetail() }}
              className="text-xs text-primary hover:underline cursor-pointer font-medium"
            >
              Read more
            </button>
          )}
          <div className="flex sm:hidden items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn('w-1.5 h-1.5 rounded-full', statusDot(task.status))} />
            {statusLabel(task.status)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Badge className={cn('capitalize border text-[10px] px-1.5 py-0', priorityColor(task.priority))} variant="outline">
          {task.priority}
        </Badge>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs text-muted-foreground font-medium">
          <div className={cn('w-1.5 h-1.5 rounded-full', statusDot(task.status))} />
          {statusLabel(task.status)}
        </div>
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
          <button onClick={onDetail} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="View detail">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Board View Card Component (Draggable) ───────────────────────────────────

function BoardCard({ task, onEdit, onDelete, onDetail, isOverlay = false }: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onDetail: () => void
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  }

  const handleInteraction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    e.preventDefault()
    action()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card/70 backdrop-blur-xs p-4 flex flex-col gap-2.5 transition-all duration-250 cursor-grab active:cursor-grabbing select-none hover:shadow-md hover:border-primary/20 dark:hover:border-primary/35 hover:-translate-y-0.5",
        isOverlay && "shadow-xl border-primary/50 cursor-grabbing scale-[1.02] rotate-[2deg] bg-card/95 backdrop-blur-md"
      )}
      onClick={() => onDetail()}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn(
          'text-sm font-semibold text-foreground leading-snug flex-1 pr-1 cursor-pointer group-hover:text-primary transition-colors',
          task.status === 'completed' && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        <div
          className="flex items-center gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <button
            onClick={(e) => handleInteraction(e, onEdit)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleInteraction(e, onDelete)}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {task.description ? (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
      ) : (
        <p className="text-xs text-muted-foreground/30 italic">No description</p>
      )}

      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50 gap-2 flex-wrap text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn('capitalize border text-[9px] px-1.5 py-0 font-semibold', priorityColor(task.priority))} variant="outline">
            {task.priority}
          </Badge>
          {task.category && (
            <span className="px-1.5 py-0 rounded border border-border text-muted-foreground bg-muted/30 font-medium">
              {task.category}
            </span>
          )}
          {task.cover && getAttachments(task.cover).length > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0 rounded border border-border/50 text-muted-foreground bg-muted/20 font-medium text-[9px]" title="Has attachments">
              <Paperclip className="w-2.5 h-2.5" /> {getAttachments(task.cover).length}
            </span>
          )}
        </div>
        {task.deadline && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="font-medium">{format(new Date(task.deadline), 'MMM d')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Board Column Component (Droppable Container) ──────────────────────────

function BoardColumn({
  status,
  label,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onDetail,
  onSaveInline,
  inlineAdding,
  setInlineAdding
}: {
  status: TaskStatus
  label: string
  tasks: Task[]
  onAdd: () => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onDetail: (task: Task) => void
  onSaveInline: (title: string) => void
  inlineAdding: boolean
  setInlineAdding: (val: boolean) => void
}) {
  const { setNodeRef } = useDroppable({ id: status })
  const [inlineTitle, setInlineTitle] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [scrolledTop, setScrolledTop] = useState(true)
  const [scrolledBottom, setScrolledBottom] = useState(true)

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    setScrolledTop(el.scrollTop === 0)
    setScrolledBottom(Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 2)
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    handleScroll()
    el.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [tasks])

  const handleSave = () => {
    if (inlineTitle.trim()) {
      onSaveInline(inlineTitle.trim())
      setInlineTitle('')
    }
    setInlineAdding(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border flex flex-col w-full md:w-[320px] shrink-0 min-h-[480px] max-h-[calc(100vh-260px)] transition-all duration-300 shadow-sm bg-card/45 backdrop-blur-md border-border/50 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/35',
        statusColumnColor(status)
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', statusDot(status))} />
          <span className={cn('text-xs font-bold uppercase tracking-wider', statusHeaderColor(status))}>
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-bold">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAdd}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={`Add task to ${label}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards list container with scroll indicators */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Top shadow gradient indicator */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/5 dark:from-black/20 to-transparent pointer-events-none z-10 transition-opacity duration-200", 
            scrolledTop ? "opacity-0" : "opacity-100"
          )} 
        />

        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin"
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                onDetail={() => onDetail(task)}
              />
            ))}
          </SortableContext>

          {/* Empty status message */}
          {tasks.length === 0 && !inlineAdding && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground border border-dashed border-border/40 rounded-xl m-1">
              <Circle className="w-7 h-7 opacity-20" />
              <p className="text-xs font-medium">Drop tasks here</p>
            </div>
          )}

          {/* Inline Card Creator */}
          {inlineAdding && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-card border border-primary/30 rounded-xl flex flex-col gap-2 shadow-sm"
            >
              <Textarea
                placeholder="Enter a title for this card..."
                value={inlineTitle}
                onChange={(e) => setInlineTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSave()
                  }
                  if (e.key === 'Escape') {
                    setInlineAdding(false)
                    setInlineTitle('')
                  }
                }}
                className="text-xs resize-none h-16 min-h-[50px] border-none focus-visible:ring-0 p-0 shadow-none text-foreground"
                autoFocus
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setInlineAdding(false)
                    setInlineTitle('')
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-7 px-3 text-[11px] gap-1 font-bold"
                >
                  <Check className="w-3.5 h-3.5" /> Add Card
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom shadow gradient indicator */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/5 dark:from-black/20 to-transparent pointer-events-none z-10 transition-opacity duration-200", 
            scrolledBottom ? "opacity-0" : "opacity-100"
          )} 
        />
      </div>

      {/* Footer Add Card trigger */}
      {!inlineAdding && (
        <button
          onClick={() => setInlineAdding(true)}
          className="mx-3 my-2.5 py-2 px-3 rounded-xl hover:bg-muted text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium border border-transparent hover:border-border/40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add a card
        </button>
      )}
    </div>
  )
}

// ─── Main TodoContent Component ───────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'personal', label: 'Personal' },
  { id: 'work', label: 'Work' },
  { id: 'urgent', label: 'Urgent' },
]

export function TodoContent() {
  const { tasks: dbTasks, addTask, updateTask, deleteTask, reorderTasks, toggleTask } = useTodos()
  const [tasks, setTasks] = useState<Task[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('board') // Default to board for trello view!
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [inlineAddingColumn, setInlineAddingColumn] = useState<TaskStatus | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const editTask = tasks.find((t) => t.id === editTaskId) || null
  const detailTask = tasks.find((t) => t.id === detailTaskId) || null

  useEffect(() => {
    if (!activeDragId) {
      setTasks(dbTasks)
    }
  }, [dbTasks, activeDragId])

  const activeDragTask = tasks.find((t) => t.id === activeDragId)

  // Configure sensors for touch and drag sensitivity
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before starting so normal clicks/taps still work
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filtered = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (activeTab === 'personal' && t.category?.toLowerCase() !== 'personal') return false
      if (activeTab === 'work' && t.category?.toLowerCase() !== 'work') return false
      if (activeTab === 'urgent' && t.priority !== 'critical' && t.priority !== 'high') return false
      return true
    })
    .sort((a, b) => a.order - b.order)

  const urgentCount = tasks.filter((t) => t.priority === 'critical' || t.priority === 'high').length

  // List View sorting drag handler
  function handleListDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over?.id)
      const moved = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({ ...t, order: i }))
      reorderTasks(moved)
    }
  }

  const [dragStartTasks, setDragStartTasks] = useState<Task[]>([])

  // Board View drag handlers
  function handleBoardDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
    setDragStartTasks(tasks)
  }

  function handleBoardDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    let activeStatus = activeTask.status

    let overStatus: TaskStatus | null = null
    if (STATUSES.includes(overId as TaskStatus)) {
      overStatus = overId as TaskStatus
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) {
        overStatus = overTask.status
      }
    }

    if (!overStatus) return

    // Case 1: Dragging over a different column
    if (activeStatus !== overStatus) {
      setTasks((prevTasks) => {
        const newTasks = prevTasks.map((t) => {
          if (t.id === activeId) {
            return { ...t, status: overStatus! }
          }
          return t
        })

        const activeIdx = newTasks.findIndex((t) => t.id === activeId)
        const activeItem = newTasks[activeIdx]
        
        let filteredTasks = newTasks.filter((t) => t.id !== activeId)
        
        if (STATUSES.includes(overId as TaskStatus)) {
          filteredTasks.push(activeItem)
        } else {
          const overIdx = filteredTasks.findIndex((t) => t.id === overId)
          if (overIdx !== -1) {
            filteredTasks.splice(overIdx, 0, activeItem)
          } else {
            filteredTasks.push(activeItem)
          }
        }

        return filteredTasks.map((t, idx) => ({ ...t, order: idx }))
      })
    }
    // Case 2: Dragging within the same column
    else {
      setTasks((prevTasks) => {
        const activeIdx = prevTasks.findIndex((t) => t.id === activeId)
        const overIdx = prevTasks.findIndex((t) => t.id === overId)

        if (activeIdx !== -1 && overIdx !== -1) {
          const moved = arrayMove(prevTasks, activeIdx, overIdx)
          return moved.map((t, idx) => ({ ...t, order: idx }))
        }
        return prevTasks
      })
    }
  }

  function handleBoardDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    setDragStartTasks([])

    if (!over) {
      setTasks(dragStartTasks)
      return
    }

    // Persist final tasks to database
    reorderTasks(tasks)
  }

  function handleSaveInline(title: string, status: TaskStatus) {
    addTask({
      title,
      description: '',
      priority: 'medium',
      status,
      category: activeTab !== 'all' && activeTab !== 'urgent' ? activeTab : undefined,
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col min-h-screen relative overflow-hidden">
      {/* Decorative gradient glow background */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[300px] bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[-5%] left-[5%] w-[250px] h-[250px] bg-gradient-to-r from-violet-500/5 to-pink-500/5 rounded-full blur-[80px] pointer-events-none -z-10" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Task Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organize, track, and drag-and-drop your daily development roadmap.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors cursor-pointer',
                viewMode === 'list' ? 'bg-accent text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'p-2 transition-colors cursor-pointer',
                viewMode === 'board' ? 'bg-accent text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="Board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setEditTaskId(null); setDefaultStatus('todo'); setDialogOpen(true) }} className="gap-2" size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </motion.div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="flex-1 sm:w-36 h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {viewMode === 'list' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 sm:w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.id === 'urgent' && urgentCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                {urgentCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Views */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleListDragEnd}>
                <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTask(task.id)}
                        onEdit={() => { setEditTaskId(task.id); setDialogOpen(true) }}
                        onDelete={() => deleteTask(task.id)}
                        onDetail={() => setDetailTaskId(task.id)}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Circle className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">No tasks found</p>
                  <Button variant="ghost" size="sm" onClick={() => { setEditTaskId(null); setDefaultStatus('todo'); setDialogOpen(true) }}>
                    + Add a task
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full"
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleBoardDragStart}
                onDragOver={handleBoardDragOver}
                onDragEnd={handleBoardDragEnd}
              >
                <div className="flex flex-col md:flex-row gap-5 overflow-x-auto pb-4 items-start select-none">
                  {STATUSES.map((status) => {
                    const colTasks = filtered.filter((t) => t.status === status)
                    return (
                      <BoardColumn
                        key={status}
                        status={status}
                        label={statusLabel(status)}
                        tasks={colTasks}
                        onAdd={() => {
                          setInlineAddingColumn(status)
                        }}
                        onEdit={(task) => {
                          setEditTaskId(task.id)
                          setDialogOpen(true)
                        }}
                        onDelete={deleteTask}
                        onDetail={(task) => setDetailTaskId(task.id)}
                        inlineAdding={inlineAddingColumn === status}
                        setInlineAdding={(val) => {
                          setInlineAddingColumn(val ? status : null)
                        }}
                        onSaveInline={(title) => handleSaveInline(title, status)}
                      />
                    )
                  })}
                </div>

                {/* Drag Overlay for smooth card movement previews */}
                <DragOverlay>
                  {activeDragTask ? (
                    <BoardCard
                      task={activeDragTask}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onDetail={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
          Showing {filtered.length} of {tasks.length} tasks
        </p>
      )}

      <TaskDetailDialog
        task={detailTask}
        open={detailTaskId !== null}
        onClose={() => setDetailTaskId(null)}
        onEdit={() => { setEditTaskId(detailTaskId); setDialogOpen(true) }}
        onUpdate={updateTask}
        onPreviewImage={setPreviewImageUrl}
      />

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTaskId(null) }}
        initial={editTask}
        defaultStatus={defaultStatus}
        onSave={(data) => {
          if (editTask) {
            updateTask(editTask.id, {
              title: data.title,
              description: data.description,
              priority: data.priority,
              status: data.status,
              category: data.category,
              deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
              cover: data.cover || undefined,
            })
          } else {
            addTask({
              title: data.title,
              description: data.description,
              priority: data.priority,
              status: data.status,
              category: data.category,
              deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
              cover: data.cover || undefined,
            })
          }
        }}
        onPreviewImage={setPreviewImageUrl}
      />

      {/* Full Image Preview Lightbox */}
      <Dialog open={previewImageUrl !== null} onOpenChange={(o) => !o && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 border-none bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden">
          <button 
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 hover:bg-white/20 text-white transition-all cursor-pointer shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
          {previewImageUrl && (
            <div className="relative w-full h-full flex items-center justify-center p-6">
              <img 
                src={previewImageUrl} 
                alt="Preview Full" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
