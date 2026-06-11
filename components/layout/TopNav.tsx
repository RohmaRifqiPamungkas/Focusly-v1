'use client'
import { useState, useEffect } from 'react'
import { Search, Bell, Sun, Moon, Menu, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/lib/sidebar-context'

export function TopNav() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { open, setOpen } = useSidebar()

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-3 sm:px-6">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden shrink-0"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Search bar — hidden on mobile unless expanded */}
      <div className={`relative flex-1 max-w-md ${searchOpen ? 'flex' : 'hidden sm:flex'}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-16 h-8 bg-muted border-transparent text-sm w-full"
          placeholder="Search tasks, notes, or tools..."
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center justify-center h-5 w-5 text-[10px] font-medium text-muted-foreground border border-border rounded">
            ⌘
          </kbd>
          <kbd className="hidden sm:inline-flex items-center justify-center h-5 w-5 text-[10px] font-medium text-muted-foreground border border-border rounded">
            K
          </kbd>
          {/* Close search on mobile */}
          {searchOpen && (
            <button className="sm:hidden ml-1" onClick={() => setSearchOpen(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Search toggle — mobile only */}
        {!searchOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          suppressHydrationWarning
        >
          {mounted
            ? resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </Button>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/30 transition-colors cursor-pointer">
              A
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Alex Johnson</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
