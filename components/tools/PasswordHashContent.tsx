'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Copy, Check, Eye, EyeOff, Shield, Settings, Shuffle, Terminal, Sparkles, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function PasswordHashContent() {
  // Generator State
  const [length, setLength] = useState(16)
  const [includeUpper, setIncludeUpper] = useState(true)
  const [includeLower, setIncludeLower] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copiedGen, setCopiedGen] = useState(false)

  // Hasher State
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [salt, setSalt] = useState('developer-hub-salt')
  const [iterations, setIterations] = useState(10000)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Hashes Output State
  const [sha1Hex, setSha1Hex] = useState('')
  const [sha1B64, setSha1B64] = useState('')
  const [sha256Hex, setSha256Hex] = useState('')
  const [sha256B64, setSha256B64] = useState('')
  const [sha512Hex, setSha512Hex] = useState('')
  const [sha512B64, setSha512B64] = useState('')
  const [pbkdf2Hex, setPbkdf2Hex] = useState('')
  const [pbkdf2B64, setPbkdf2B64] = useState('')

  // Copy feedbacks
  const [copiedHash, setCopiedHash] = useState<Record<string, boolean>>({})

  // Generate Password function
  const generatePassword = useCallback(() => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    let chars = ''
    if (includeUpper) chars += upper
    if (includeLower) chars += lower
    if (includeNumbers) chars += numbers
    if (includeSymbols) chars += symbols

    if (!chars) {
      setGeneratedPassword('')
      return
    }

    let result = ''
    const array = new Uint32Array(length)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }
    setGeneratedPassword(result)
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols])

  // Generate on mount
  useEffect(() => {
    generatePassword()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate Strength
  const getStrength = () => {
    if (!generatedPassword) return { score: 0, label: 'None', color: 'bg-muted' }
    let pool = 0
    if (includeUpper) pool += 26
    if (includeLower) pool += 26
    if (includeNumbers) pool += 10
    if (includeSymbols) pool += 26

    const entropy = length * Math.log2(pool || 1)
    if (entropy < 40) return { score: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' }
    if (entropy < 60) return { score: 2, label: 'Medium', color: 'bg-amber-500', text: 'text-amber-500' }
    if (entropy < 80) return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' }
    return { score: 4, label: 'Very Strong', color: 'bg-indigo-500', text: 'text-indigo-500' }
  }
  const strength = getStrength()

  // Calculate Hashes
  useEffect(() => {
    const calculateHashes = async () => {
      if (!password) {
        setSha1Hex('')
        setSha1B64('')
        setSha256Hex('')
        setSha256B64('')
        setSha512Hex('')
        setSha512B64('')
        setPbkdf2Hex('')
        setPbkdf2B64('')
        return
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(password)

      try {
        // SHA-1
        const sha1Buf = await crypto.subtle.digest('SHA-1', data)
        const sha1Arr = Array.from(new Uint8Array(sha1Buf))
        setSha1Hex(sha1Arr.map(b => b.toString(16).padStart(2, '0')).join(''))
        setSha1B64(btoa(String.fromCharCode(...sha1Arr)))

        // SHA-256
        const sha256Buf = await crypto.subtle.digest('SHA-256', data)
        const sha256Arr = Array.from(new Uint8Array(sha256Buf))
        setSha256Hex(sha256Arr.map(b => b.toString(16).padStart(2, '0')).join(''))
        setSha256B64(btoa(String.fromCharCode(...sha256Arr)))

        // SHA-512
        const sha512Buf = await crypto.subtle.digest('SHA-512', data)
        const sha512Arr = Array.from(new Uint8Array(sha512Buf))
        setSha512Hex(sha512Arr.map(b => b.toString(16).padStart(2, '0')).join(''))
        setSha512B64(btoa(String.fromCharCode(...sha512Arr)))

        // PBKDF2
        const pbkdf2Salt = encoder.encode(salt || 'dev-hub-salt')
        const baseKey = await crypto.subtle.importKey(
          'raw',
          data,
          { name: 'PBKDF2' },
          false,
          ['deriveBits']
        )
        const pbkdf2Buf = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: pbkdf2Salt,
            iterations: iterations || 1000,
            hash: 'SHA-256'
          },
          baseKey,
          256
        )
        const pbkdf2Arr = Array.from(new Uint8Array(pbkdf2Buf))
        setPbkdf2Hex(pbkdf2Arr.map(b => b.toString(16).padStart(2, '0')).join(''))
        setPbkdf2B64(btoa(String.fromCharCode(...pbkdf2Arr)))
      } catch (err) {
        console.error('Hashing failed:', err)
      }
    }

    calculateHashes()
  }, [password, salt, iterations])

  const copyText = async (text: string, id: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    if (id === 'gen') {
      setCopiedGen(true)
      setTimeout(() => setCopiedGen(false), 2000)
    } else {
      setCopiedHash(prev => ({ ...prev, [id]: true }))
      setTimeout(() => setCopiedHash(prev => ({ ...prev, [id]: false })), 2000)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          Password Hasher & Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate secure random passwords and compute cryptographic hashes client-side.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Generator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border/80">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Password Generator</h2>
            </div>

            {/* Generated Password Output Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/80 font-mono text-sm break-all relative group select-all">
                <span>{generatedPassword || <span className="text-muted-foreground/40 italic">Check options below</span>}</span>
                {generatedPassword && (
                  <button
                    onClick={() => copyText(generatedPassword, 'gen')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer border-none bg-transparent"
                    title="Copy generated password"
                  >
                    {copiedGen ? <Check className="w-4 h-4 text-emerald-500 animate-scale-up" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Strength Indicator */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Strength</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        'h-full flex-1 transition-colors duration-300 rounded-full',
                        step <= strength.score ? strength.color : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Length Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <Label htmlFor="length-slider">Length</Label>
                <span className="text-xs font-mono bg-muted/65 px-2 py-0.5 rounded border border-border">{length} characters</span>
              </div>
              <input
                id="length-slider"
                type="range"
                min="8"
                max="64"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Config Checkboxes */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Include Characters</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'upper', label: 'Uppercase (A-Z)', val: includeUpper, set: setIncludeUpper },
                  { id: 'lower', label: 'Lowercase (a-z)', val: includeLower, set: setIncludeLower },
                  { id: 'num', label: 'Numbers (0-9)', val: includeNumbers, set: setIncludeNumbers },
                  { id: 'sym', label: 'Symbols (!@#...)', val: includeSymbols, set: setIncludeSymbols },
                ].map((chk) => (
                  <label key={chk.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={chk.val}
                      onChange={(e) => chk.set(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span>{chk.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-3">
              <Button onClick={generatePassword} variant="outline" className="flex-1 gap-2 text-xs">
                <Shuffle className="w-3.5 h-3.5" /> Re-generate
              </Button>
              <Button
                onClick={() => setPassword(generatedPassword)}
                disabled={!generatedPassword}
                className="flex-1 gap-2 text-xs"
              >
                <Hash className="w-3.5 h-3.5" /> Use in Hasher
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: Hasher */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Password Hasher</h2>
              </div>
              <button
                onClick={() => setShowAdvanced(p => !p)}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer border-none bg-transparent"
              >
                <Settings className="w-3.5 h-3.5" /> {showAdvanced ? 'Hide Advanced' : 'Configure PBKDF2'}
              </button>
            </div>

            {/* Password Input */}
            <div className="grid gap-2">
              <Label htmlFor="hasher-password-input">Password to Hash</Label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Input
                  id="hasher-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter or paste password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent p-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Advanced configurations */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3.5 p-3 rounded-lg border border-border/80 bg-muted/15"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="grid gap-1.5">
                      <Label htmlFor="pbkdf2-salt-input">PBKDF2 Salt</Label>
                      <Input
                        id="pbkdf2-salt-input"
                        placeholder="e.g. dev-hub-salt"
                        value={salt}
                        onChange={(e) => setSalt(e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pbkdf2-iterations-input">PBKDF2 Iterations</Label>
                      <Input
                        id="pbkdf2-iterations-input"
                        type="number"
                        min="1000"
                        max="1000000"
                        value={iterations}
                        onChange={(e) => setIterations(Math.max(1000, parseInt(e.target.value) || 1000))}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1">
                    <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    PBKDF2 derives secure key bits using HMAC-SHA-256 with the specified salt and iterations. Recommended for secure password hashing schemes.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hash outputs */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculated Hashes</p>

              {[
                { id: 'sha256', label: 'SHA-256', hex: sha256Hex, b64: sha256B64 },
                { id: 'sha512', label: 'SHA-512', hex: sha512Hex, b64: sha512B64 },
                { id: 'pbkdf2', label: 'PBKDF2-SHA256', hex: pbkdf2Hex, b64: pbkdf2B64 },
                { id: 'sha1', label: 'SHA-1 (Legacy)', hex: sha1Hex, b64: sha1B64 },
              ].map((algo) => (
                <div key={algo.id} className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">{algo.label}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Hex format */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Hex Hash</span>
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded bg-black/5 dark:bg-black/25 border border-border/60 font-mono text-[10px] text-foreground">
                        <span className="truncate pr-1">{algo.hex || <span className="text-muted-foreground/35 italic">Enter password...</span>}</span>
                        {algo.hex && (
                          <button
                            onClick={() => copyText(algo.hex, `${algo.id}-hex`)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer border-none bg-transparent"
                            title="Copy Hex hash"
                          >
                            {copiedHash[`${algo.id}-hex`] ? <Check className="w-3 h-3 text-emerald-500 animate-scale-up" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Base64 format */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Base64 Hash</span>
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded bg-black/5 dark:bg-black/25 border border-border/60 font-mono text-[10px] text-foreground">
                        <span className="truncate pr-1">{algo.b64 || <span className="text-muted-foreground/35 italic">Enter password...</span>}</span>
                        {algo.b64 && (
                          <button
                            onClick={() => copyText(algo.b64, `${algo.id}-b64`)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer border-none bg-transparent"
                            title="Copy Base64 hash"
                          >
                            {copiedHash[`${algo.id}-b64`] ? <Check className="w-3 h-3 text-emerald-500 animate-scale-up" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
