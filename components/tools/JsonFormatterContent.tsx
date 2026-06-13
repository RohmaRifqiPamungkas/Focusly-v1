'use client'
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlignLeft, Minimize2, Copy, Trash2, Check, AlertCircle, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'valid' | 'invalid'

function CodeEditor({
  value, onChange, readOnly, label, extra,
}: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  label: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {extra}
      </div>
      <div className="relative flex-1">
        <textarea
          className={cn(
            'absolute inset-0 w-full h-full resize-none bg-transparent p-4 font-mono text-sm text-foreground focus:outline-none',
            readOnly && 'cursor-default select-all'
          )}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
          spellCheck={false}
          placeholder={readOnly ? '' : '{\n  "paste": "your JSON here"\n}'}
        />
      </div>
    </div>
  )
}

export function JsonFormatterContent() {
  const [input, setInput] = useState(`{
  "project": "Focusly",
  "version": 1.0,
  "active": true,
  "features": [
    "formatting",
    "validation"
  ]
}`)
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [indent, setIndent] = useState(2)

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input)
      const formatted = JSON.stringify(parsed, null, indent)
      setOutput(formatted)
      setStatus('valid')
      setError('')
    } catch (e) {
      setStatus('invalid')
      setError((e as Error).message)
      setOutput('')
    }
  }, [input, indent])

  const minify = useCallback(() => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setStatus('valid')
      setError('')
    } catch (e) {
      setStatus('invalid')
      setError((e as Error).message)
      setOutput('')
    }
  }, [input])

  const copy = useCallback(async () => {
    const text = output || input
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output, input])

  const clear = useCallback(() => {
    setInput('')
    setOutput('')
    setStatus('idle')
    setError('')
  }, [])

  const validate = useCallback(() => {
    try {
      JSON.parse(input)
      setStatus('valid')
      setError('')
    } catch (e) {
      setStatus('invalid')
      setError((e as Error).message)
    }
  }, [input])

  const handleInput = useCallback((v: string) => {
    setInput(v)
    if (status !== 'idle') {
      try {
        JSON.parse(v)
        setStatus('valid')
        setError('')
      } catch {
        setStatus(v.trim() ? 'invalid' : 'idle')
        setError('')
      }
    }
  }, [status])

  const bytes = new Blob([output || input]).size
  const lines = (output || input).split('\n').length

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">JSON Formatter</h1>
          <p className="text-muted-foreground mt-1">Format, validate, and beautify JSON data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button onClick={format} className="gap-2">
            <AlignLeft className="w-4 h-4" /> Format
          </Button>
          <Button onClick={minify} variant="outline" className="gap-2">
            <Minimize2 className="w-4 h-4" /> Minify
          </Button>
          <Button onClick={copy} variant="outline" className="gap-2">
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={clear} variant="outline" className="gap-2">
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        </div>
      </motion.div>

      {/* Error banner */}
      {status === 'invalid' && error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-mono text-xs">{error}</span>
        </motion.div>
      )}

      {/* Editors */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 280px)' }}>
        <CodeEditor
          label="Input JSON"
          value={input}
          onChange={handleInput}
          extra={
            <button onClick={validate} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <FileJson className="w-4 h-4" />
            </button>
          }
        />
        <CodeEditor
          label="Formatted Output"
          value={output}
          readOnly
          extra={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndent(2)}
                className={cn('text-xs px-1.5 py-0.5 rounded cursor-pointer', indent === 2 ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              >2</button>
              <button
                onClick={() => setIndent(4)}
                className={cn('text-xs px-1.5 py-0.5 rounded cursor-pointer', indent === 4 ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              >4</button>
            </div>
          }
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {status === 'valid' && (
            <span className="flex items-center gap-1.5 text-success">
              <span className="w-2 h-2 rounded-full bg-success" />
              Valid JSON
            </span>
          )}
          {status === 'invalid' && (
            <span className="flex items-center gap-1.5 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              Invalid JSON
            </span>
          )}
          {status === 'idle' && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground" />Ready</span>}
        </div>
        {(output || input) && (
          <span>Size: {bytes} bytes | Lines: {lines}</span>
        )}
      </div>
    </div>
  )
}
