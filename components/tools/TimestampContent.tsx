'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, RefreshCw, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, fromUnixTime } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])
  return { copy, copiedKey }
}

function CopyButton({ text, id, copy, copiedKey }: { text: string; id: string; copy: (t: string, k: string) => void; copiedKey: string | null }) {
  return (
    <button
      onClick={() => copy(text, id)}
      className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
    >
      {copiedKey === id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function TimestampContent() {
  const [now, setNow] = useState(Date.now())
  const [unixInput, setUnixInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [unixResult, setUnixResult] = useState<Date | null>(null)
  const [dateResult, setDateResult] = useState<number | null>(null)
  const [unixError, setUnixError] = useState('')
  const [dateError, setDateError] = useState('')
  const { copy, copiedKey } = useCopy()

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const convertUnix = useCallback(() => {
    const n = Number(unixInput.trim())
    if (!unixInput.trim() || isNaN(n)) { setUnixError('Enter a valid Unix timestamp'); return }
    try {
      const ms = unixInput.length > 10 ? n : n * 1000
      setUnixResult(new Date(ms))
      setUnixError('')
    } catch { setUnixError('Invalid timestamp') }
  }, [unixInput])

  const convertDate = useCallback(() => {
    if (!dateInput.trim()) { setDateError('Enter a date'); return }
    try {
      const d = new Date(dateInput)
      if (isNaN(d.getTime())) { setDateError('Invalid date format'); return }
      setDateResult(Math.floor(d.getTime() / 1000))
      setDateError('')
    } catch { setDateError('Invalid date') }
  }, [dateInput])

  const currentUnix = Math.floor(now / 1000)
  const currentDate = new Date(now)

  function safeFormatTZ(date: Date, tz: string, fmt: string): string {
    try {
      return formatInTimeZone(date, tz, fmt)
    } catch {
      return format(date, fmt)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Timestamp Converter</h1>
        <p className="text-muted-foreground mt-1">Convert between Unix timestamps and human-readable dates.</p>
      </motion.div>

      {/* Timezone selector */}
      <div className="flex items-center gap-3 mb-6">
        <Label className="text-sm shrink-0">Timezone:</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current time card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Time</CardTitle>
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Unix Timestamp</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-bold font-mono text-foreground">{currentUnix}</code>
                <CopyButton text={String(currentUnix)} id="current-unix" copy={copy} copiedKey={copiedKey} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ISO 8601</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground">{currentDate.toISOString()}</code>
                <CopyButton text={currentDate.toISOString()} id="current-iso" copy={copy} copiedKey={copiedKey} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unix → Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unix → Human Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 1700000000"
                value={unixInput}
                onChange={(e) => setUnixInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && convertUnix()}
                className="font-mono"
              />
              <Button onClick={convertUnix} size="sm" className="shrink-0">Convert</Button>
            </div>
            {unixError && <p className="text-xs text-destructive">{unixError}</p>}
            {unixResult && !unixError && (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'ISO 8601', value: unixResult.toISOString() },
                  { label: 'Local', value: format(unixResult, 'PPpp') },
                  { label: 'UTC', value: format(unixResult, "yyyy-MM-dd HH:mm:ss 'UTC'") },
                  { label: 'Relative', value: `${Math.abs(Math.floor((Date.now() - unixResult.getTime()) / 86400000))} days ago` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground text-xs w-16 shrink-0">{label}</span>
                    <code className="text-xs text-foreground font-mono flex-1 text-right">{value}</code>
                    <CopyButton text={value} id={`unix-${label}`} copy={copy} copiedKey={copiedKey} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date → Unix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Human Date → Unix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 2024-01-15 or now"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && convertDate()}
              />
              <Button onClick={convertDate} size="sm" className="shrink-0">Convert</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['now', 'today', 'tomorrow', '-1 day'].map((quick) => (
                <button
                  key={quick}
                  onClick={() => {
                    let d = new Date()
                    if (quick === 'tomorrow') d.setDate(d.getDate() + 1)
                    if (quick === '-1 day') d.setDate(d.getDate() - 1)
                    const v = format(d, "yyyy-MM-dd'T'HH:mm")
                    setDateInput(v)
                  }}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  {quick}
                </button>
              ))}
            </div>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
            {dateResult !== null && !dateError && (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Seconds', value: String(dateResult) },
                  { label: 'Milliseconds', value: String(dateResult * 1000) },
                  { label: 'Hex', value: dateResult.toString(16) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground text-xs w-24 shrink-0">{label}</span>
                    <code className="text-xs text-foreground font-mono flex-1 text-right">{value}</code>
                    <CopyButton text={value} id={`date-${label}`} copy={copy} copiedKey={copiedKey} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
