'use client'
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, Copy, Trash2, Check, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Mode = 'encode' | 'decode'

export function Base64Content() {
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const process = useCallback((text: string, m: Mode) => {
    setInput(text)
    setError('')
    if (!text.trim()) { setOutput(''); return }
    try {
      if (m === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(text))))
      } else {
        setOutput(decodeURIComponent(escape(atob(text.trim()))))
      }
    } catch {
      setError(m === 'decode' ? 'Invalid Base64 string' : 'Encoding failed')
      setOutput('')
    }
  }, [])

  const handleInput = (v: string) => process(v, mode)

  const switchMode = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode'
    setMode(newMode)
    const newInput = output
    process(newInput, newMode)
  }

  const copy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const clear = () => { setInput(''); setOutput(''); setError('') }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Base64 Encoder / Decoder</h1>
        <p className="text-muted-foreground mt-1">Encode text to Base64 or decode Base64 strings.</p>
      </motion.div>

      {/* Mode selector */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => { setMode('encode'); process(input, 'encode') }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer',
              mode === 'encode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Lock className="w-4 h-4" /> Encode
          </button>
          <button
            onClick={() => { setMode('decode'); process(input, 'decode') }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer',
              mode === 'decode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Unlock className="w-4 h-4" /> Decode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* Input */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {mode === 'encode' ? 'Plain Text' : 'Base64 String'}
            </span>
            <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            className="w-full h-64 resize-none bg-transparent p-4 font-mono text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
            placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Swap button */}
        <div className="flex items-center justify-center md:mt-24">
          <button
            onClick={switchMode}
            className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            title="Swap input/output"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Output */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
            </span>
            <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <textarea
            className="w-full h-64 resize-none bg-transparent p-4 font-mono text-sm text-foreground focus:outline-none cursor-default"
            value={output}
            readOnly
            placeholder="Output will appear here..."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
        >
          <span>⚠ {error}</span>
        </motion.div>
      )}

      {/* Stats */}
      {(input || output) && (
        <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
          <span>Input: {input.length} chars</span>
          <span>Output: {output.length} chars</span>
          {input && output && (
            <span>Ratio: {((output.length / Math.max(input.length, 1)) * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </div>
  )
}
