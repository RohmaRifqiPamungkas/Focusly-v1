'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ListTodo, Timer, StickyNote, Code2,
  Braces, Clock, Settings, User, LogOut, HelpCircle, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-[220px] min-h-screen border-r border-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <h1 className="text-base font-bold text-foreground tracking-tight">DevHub Pro</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Productivity Suite</p>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
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

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-0.5">
        {/* Upgrade button */}
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
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
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

        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Support</span>
        </button>

        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
