'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, Timer, StickyNote, Code2,
  Braces, Clock, Settings, User, LogOut, HelpCircle, X, KeyRound,
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
  { href: '/password-hash', label: 'Password Hasher', icon: KeyRound },
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
        <h1 className="text-base font-bold text-foreground tracking-tight">Focusly Pro</h1>
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
        <div className="h-px bg-border mx-2 my-2" />

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

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Desktop sidebar — always in document flow at lg+ */}
      <aside className="hidden lg:flex flex-col w-[220px] min-h-screen border-r border-border bg-sidebar shrink-0">
        <SidebarContent />
      </aside>

      {/*
        Mobile drawer — conditionally mounted so it is NEVER in the DOM on
        desktop. This avoids Safari bugs where CSS-transform + lg:hidden can
        conflict and let the drawer bleed through at desktop widths.
      */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="sidebar-drawer"
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar border-r border-border flex flex-col lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
