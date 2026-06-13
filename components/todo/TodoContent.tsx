'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Trash2, Edit3, Calendar,
  Circle, GripVertical, List, LayoutGrid, Eye,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
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
const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'completed']

function priorityVariant(p: Priority) {
  return ({ critical: 'critical', high: 'high', medium: 'medium', low: 'low' } as const)[p]
}

function statusLabel(s: TaskStatus): string {
  return ({ todo: 'Todo', 'in-progress': 'In Progress', completed: 'Done' })[s]
}

function statusDot(s: TaskStatus): string {
  return ({ todo: 'bg-muted-foreground', 'in-progress': 'bg-primary', completed: 'bg-success' })[s]
}

function statusColumnColor(s: TaskStatus): string {
  return ({
    todo: 'border-border',
    'in-progress': 'border-primary/40',
    completed: 'border-success/40',
  })[s]
}

function statusHeaderColor(s: TaskStatus): string {
  return ({
    todo: 'text-muted-foreground',
    'in-progress': 'text-primary',
    completed: 'text-success',
  })[s]
}

interface TaskFormData {
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  category: string
  deadline: string
}

const DEFAULT_FORM: TaskFormData = {
  title: '', description: '', priority: 'medium',
  status: 'todo', category: '', deadline: '',
}

function TaskDialog({ open, onClose, onSave, initial, defaultStatus = 'todo' }: {
  open: boolean
  onClose: () => void
  onSave: (data: TaskFormData) => void
  initial?: Task | null
  defaultStatus?: TaskStatus
}) {
  const [form, setForm] = useState<TaskFormData>(DEFAULT_FORM)

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
          }
        : { ...DEFAULT_FORM, status: defaultStatus }
    )
  }, [open, initial, defaultStatus])

  const set = (k: keyof TaskFormData) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input placeholder="Task title..." value={form.title} onChange={(e) => set('title')(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Optional description..." value={form.description} onChange={(e) => set('description')(e.target.value)} className="h-20" />
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
              <Input placeholder="e.g. Work, Personal" value={form.category} onChange={(e) => set('category')(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => set('deadline')(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (form.title.trim()) { onSave(form); onClose() } }}>
            {initial ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const DESC_PREVIEW_LIMIT = 100

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function TaskDetailDialog({ task, open, onClose, onEdit }: {
  task: Task | null
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
  if (!task) return null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-4">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={priorityVariant(task.priority)} className="capitalize">{task.priority}</Badge>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs text-muted-foreground">
              <div className={cn('w-1.5 h-1.5 rounded-full', statusDot(task.status))} />
              {statusLabel(task.status)}
            </div>
            {task.category && (
              <span className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground">
                {task.category}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}

          {/* Meta */}
          {(task.deadline || task.createdAt) && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
              {task.deadline && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Deadline</p>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
              {task.createdAt && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{format(new Date(task.createdAt), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onEdit() }} className="gap-2">
            <Edit3 className="w-3.5 h-3.5" /> Edit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── List View ───────────────────────────────────────────────────────────────

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
        'flex items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-border last:border-0 group',
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
          task.status === 'completed' ? 'border-success bg-success/10' : 'border-border hover:border-primary'
        )}
      >
        {task.status === 'completed' && <div className="w-2 h-2 rounded-full bg-success" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
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
              className="text-xs text-primary hover:underline cursor-pointer"
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
        <Badge variant={priorityVariant(task.priority)} className="capitalize">
          {task.priority}
        </Badge>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs text-muted-foreground">
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

// ─── Board View ───────────────────────────────────────────────────────────────

function BoardCard({ task, onEdit, onDelete, onStatusChange, onDetail }: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus) => void
  onDetail: () => void
}) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    'todo': 'in-progress',
    'in-progress': 'completed',
    'completed': 'todo',
  }
  const isLong = task.description ? task.description.length > DESC_PREVIEW_LIMIT : false

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group rounded-lg border border-border bg-card p-3 flex flex-col gap-2 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onDetail}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn(
          'text-sm font-medium text-foreground leading-snug flex-1',
          task.status === 'completed' && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        {/* Actions — visible on hover */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {task.description ? (
        <div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
          {isLong && (
            <button
              onClick={(e) => { e.stopPropagation(); onDetail() }}
              className="text-xs text-primary hover:underline mt-0.5 cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Read more
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40 italic">No description</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={priorityVariant(task.priority)} className="capitalize text-[10px] px-1.5 py-0">
            {task.priority}
          </Badge>
          {task.category && (
            <span className="text-[10px] px-1.5 py-0 rounded border border-border text-muted-foreground">
              {task.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{format(new Date(task.deadline), 'MMM d')}</span>
            </div>
          )}
          <button
            title={`Move to ${statusLabel(nextStatus[task.status])}`}
            onClick={() => onStatusChange(nextStatus[task.status])}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer',
              'border-border text-muted-foreground hover:border-primary hover:text-primary'
            )}
          >
            → {statusLabel(nextStatus[task.status])}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function BoardView({ tasks, onEdit, onDelete, onStatusChange, onAdd, onDetail }: {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onAdd: (status: TaskStatus) => void
  onDetail: (task: Task) => void
}) {
  const columns: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'Todo' },
    { status: 'in-progress', label: 'In Progress' },
    { status: 'completed', label: 'Done' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {columns.map(({ status, label }) => {
        const colTasks = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            className={cn(
              'rounded-xl border-2 bg-muted/30 flex flex-col min-h-[200px]',
              statusColumnColor(status)
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', statusDot(status))} />
                <span className={cn('text-xs font-semibold uppercase tracking-widest', statusHeaderColor(status))}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => onAdd(status)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={`Add ${label} task`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-3 flex-1">
              <AnimatePresence mode="popLayout">
                {colTasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task.id)}
                    onStatusChange={(s) => onStatusChange(task.id, s)}
                    onDetail={() => onDetail(task)}
                  />
                ))}
              </AnimatePresence>
              {colTasks.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Circle className="w-6 h-6 opacity-20" />
                  <p className="text-xs">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'personal', label: 'Personal' },
  { id: 'work', label: 'Work' },
  { id: 'urgent', label: 'Urgent' },
]

export function TodoContent() {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks, toggleTask } = useTodos()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over?.id)
      const moved = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({ ...t, order: i }))
      reorderTasks(moved)
    }
  }

  function openAddWithStatus(status: TaskStatus) {
    setDefaultStatus(status)
    setEditTask(null)
    setDialogOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your daily development pipeline.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors cursor-pointer',
                viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'p-2 transition-colors cursor-pointer',
                viewMode === 'board' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="Board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setEditTask(null); setDefaultStatus('todo'); setDialogOpen(true) }} className="gap-2" size="sm">
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
            <SelectTrigger className="flex-1 sm:w-32 h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {viewMode === 'list' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 sm:w-32 h-9">
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
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence mode="popLayout">
                  {filtered.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task.id)}
                      onEdit={() => { setEditTask(task); setDialogOpen(true) }}
                      onDelete={() => deleteTask(task.id)}
                      onDetail={() => setDetailTask(task)}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Circle className="w-10 h-10 opacity-30" />
                <p className="text-sm">No tasks found</p>
                <Button variant="ghost" size="sm" onClick={() => { setEditTask(null); setDefaultStatus('todo'); setDialogOpen(true) }}>
                  + Add a task
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <BoardView
              tasks={filtered}
              onEdit={(task) => { setEditTask(task); setDialogOpen(true) }}
              onDelete={deleteTask}
              onStatusChange={(id, status) => updateTask(id, { status })}
              onAdd={openAddWithStatus}
              onDetail={(task) => setDetailTask(task)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Showing {filtered.length} of {tasks.length} tasks
        </p>
      )}

      <TaskDetailDialog
        task={detailTask}
        open={detailTask !== null}
        onClose={() => setDetailTask(null)}
        onEdit={() => { setEditTask(detailTask); setDialogOpen(true) }}
      />

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTask(null) }}
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
            })
          } else {
            addTask({
              title: data.title,
              description: data.description,
              priority: data.priority,
              status: data.status,
              category: data.category,
              deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
            })
          }
        }}
      />
    </div>
  )
}
