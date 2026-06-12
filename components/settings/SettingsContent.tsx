'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Monitor, Bell, Timer, User, Trash2, Save, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePomodoro } from '@/hooks/usePomodoro'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const section = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export function SettingsContent() {
  const { theme, setTheme } = useTheme()
  const { state, updateSettings } = usePomodoro()
  const { user, signOut } = useAuth()
  const [pomSettings, setPomSettings] = useState({
    focus: state.settings.focus,
    shortBreak: state.settings.shortBreak,
    longBreak: state.settings.longBreak,
    dailyGoal: state.settings.dailyGoal,
  })
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [autoStart, setAutoStart] = useState(false)
  const [clearing, setClearing] = useState(false)

  const savePomodoro = () => {
    updateSettings(pomSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const clearAllData = async () => {
    if (!confirm('This will delete all your tasks, notes, and timer history. Are you sure?')) return
    if (!user) return
    setClearing(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('notes').delete().eq('user_id', user.id),
      supabase.from('tasks').delete().eq('user_id', user.id),
      supabase.from('pomodoro_sessions').delete().eq('user_id', user.id),
      supabase.from('pomodoro_settings').delete().eq('user_id', user.id),
    ])
    localStorage.removeItem('devhub-pomodoro-timer')
    setClearing(false)
    window.location.reload()
  }

  const THEMES = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your DevHub experience.</p>
      </motion.div>

      <div className="space-y-6">
        {/* Row 1: Appearance (Full Width) */}
        <motion.div variants={section} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-4 h-4" /> Appearance
              </CardTitle>
              <CardDescription>Choose how DevHub looks for you.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEMES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                      theme === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', theme === id ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', theme === id ? 'text-primary' : 'text-muted-foreground')}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 2: Pomodoro & Notifications (2 Columns on Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pomodoro */}
          <motion.div variants={section} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Pomodoro Timer
                </CardTitle>
                <CardDescription>Customize your focus sessions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'focus', label: 'Focus Duration', unit: 'min' },
                    { key: 'shortBreak', label: 'Short Break', unit: 'min' },
                    { key: 'longBreak', label: 'Long Break', unit: 'min' },
                    { key: 'dailyGoal', label: 'Daily Goal', unit: 'sessions' },
                  ].map(({ key, label, unit }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={key === 'dailyGoal' ? 20 : 60}
                          value={pomSettings[key as keyof typeof pomSettings]}
                          onChange={(e) => setPomSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
                          className="w-full sm:w-20 font-mono"
                        />
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={autoStart} onCheckedChange={setAutoStart} />
                    <Label className="text-sm cursor-pointer" onClick={() => setAutoStart((v) => !v)}>
                      Auto-start next session
                    </Label>
                  </div>
                  <Button onClick={savePomodoro} size="sm" className="gap-2 shrink-0">
                    <Save className="w-3.5 h-3.5" />
                    {saved ? 'Saved!' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={section} initial="hidden" animate="show" transition={{ delay: 0.3 }} className="h-full">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications
                </CardTitle>
                <CardDescription>Configure when to be notified.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Timer completed', desc: 'When a Pomodoro session ends', checked: notifications, toggle: () => setNotifications((v) => !v) },
                  { label: 'Task reminders', desc: 'For tasks with upcoming deadlines', checked: false, toggle: () => { } },
                ].map(({ label, desc, checked, toggle }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <div className="pr-4">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch checked={checked} onCheckedChange={toggle} className="shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Row 3: Profile & Danger Zone (2 Columns on Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile */}
          <motion.div variants={section} initial="hidden" animate="show" transition={{ delay: 0.4 }} className="h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile
                </CardTitle>
                <CardDescription>Manage your account settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} readOnly className="bg-muted" />
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={signOut}>
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger zone */}
          <motion.div variants={section} initial="hidden" animate="show" transition={{ delay: 0.5 }} className="h-full">
            <Card className="border-destructive/30 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" /> Danger Zone
                </CardTitle>
                <CardDescription>These actions are irreversible.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Clear all data</p>
                    <p className="text-xs text-muted-foreground">Delete all tasks, notes, and history</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={clearAllData} disabled={clearing} className="gap-2 shrink-0 w-full sm:w-auto">
                    <Trash2 className="w-3.5 h-3.5" /> {clearing ? 'Clearing…' : 'Clear Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}