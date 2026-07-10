import { useEffect, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { Card, Button } from './ui'
import { formatDuration } from '../lib/time'

const PRESETS = [30, 60, 90, 120]
const MIN_DURATION = 5
const ADJUST_STEP = 15

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
    oscillator.onended = () => ctx.close()
  } catch {
    // Web Audio unsupported; skip the alert sound.
  }
}

interface RestTimerProps {
  autoStart?: boolean
}

export function RestTimer({ autoStart = false }: RestTimerProps) {
  const [duration, setDuration] = useState(60)
  const [remaining, setRemaining] = useState(60)
  const [running, setRunning] = useState(autoStart)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false)
          playBeep()
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [running])

  function setPreset(seconds: number) {
    setDuration(seconds)
    setRemaining(seconds)
    setRunning(false)
  }

  function adjust(delta: number) {
    setDuration((d) => {
      const next = Math.max(MIN_DURATION, d + delta)
      if (!running) setRemaining(next)
      return next
    })
  }

  function toggleRunning() {
    if (remaining === 0) setRemaining(duration)
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setRemaining(duration)
  }

  return (
    <Card className="bg-emerald-500/5 ring-1 ring-emerald-500/30">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Rest Timer</h3>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                duration === p
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p}s
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => adjust(-ADJUST_STEP)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Decrease rest duration"
        >
          <Minus size={18} />
        </button>
        <div
          className={`w-28 text-center text-4xl font-bold tabular-nums ${
            remaining === 0 ? 'text-red-400' : 'text-slate-100'
          }`}
        >
          {formatDuration(remaining)}
        </div>
        <button
          onClick={() => adjust(ADJUST_STEP)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Increase rest duration"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button onClick={toggleRunning} icon={running ? <Pause size={16} /> : <Play size={16} />}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="secondary" onClick={reset} icon={<RotateCcw size={16} />}>
          Reset
        </Button>
      </div>
    </Card>
  )
}
