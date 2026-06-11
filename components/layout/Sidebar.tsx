'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard, ListTodo, Timer, StickyNote, Code2,
  Braces, Clock, Settings, User, LogOut, HelpCircle, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/todo', label: 'Todo List', icon: ListTodo },
  { href: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { href: '/notes', label: 'Quick Notes', icon: StickyNote },
  { href: '/json-formatter', label: 'JSON Formatter', icon: Code2 },
  { href: '/base64', label: 'Base64', icon: Braces },
  { href: '/timestamp', label: 'Timestamp', icon: Clock },
]

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings#profile', label: 'Profile', icon: User },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6">
        <h1 className="text-base font-bold text-foreground tracking-tight">DevHub Pro</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Productivity Suite</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 space-y-0.5">
        <div className="px-2 py-3">
          <button className="w-full bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
            Upgrade to Plus
          </button>
        </div>

        {bottomItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Support</span>
        </button>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { open, setOpen } = useSidebar()
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname, setOpen])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden lg:flex flex-col w-[220px] min-h-screen border-r border-border bg-sidebar shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}
