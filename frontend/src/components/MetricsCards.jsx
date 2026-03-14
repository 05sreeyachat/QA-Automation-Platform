import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Animated counter hook — counts from 0 to `end` over `duration` ms
 */
function useCountUp(end, duration = 1200, active = true) {
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active || end === 0) { setCount(0); return }
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(eased * end))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [end, duration, active])

  return count
}

const CARDS = [
  {
    key: 'total_tests',
    label: 'Total Tests',
    icon: '🧪',
    color: 'from-indigo-500/20 to-violet-500/20',
    border: 'hover:border-indigo-400/40',
    textColor: 'text-indigo-300',
  },
  {
    key: 'passed',
    label: 'Passed',
    icon: '✅',
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'hover:border-emerald-400/40',
    textColor: 'text-emerald-400',
  },
  {
    key: 'failed',
    label: 'Failed',
    icon: '❌',
    color: 'from-red-500/20 to-pink-500/20',
    border: 'hover:border-red-400/40',
    textColor: 'text-red-400',
  },
  {
    key: 'pass_rate',
    label: 'Pass Rate',
    icon: '📊',
    suffix: '%',
    color: 'from-sky-500/20 to-cyan-500/20',
    border: 'hover:border-sky-400/40',
    textColor: 'text-sky-300',
  },
]

function MetricCard({ card, value, execTime, loading, index }) {
  const numericVal = typeof value === 'number' ? value : parseFloat(value) || 0
  const count = useCountUp(numericVal, 1200, !loading && numericVal > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={[
        'glass-card p-6 flex flex-col gap-3 cursor-default select-none',
        'bg-gradient-to-br', card.color, card.border
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">
          {card.label}
        </span>
        <span className="text-2xl">{card.icon}</span>
      </div>

      {loading ? (
        <div className="h-10 w-24 rounded-lg shimmer" />
      ) : (
        <span className={`text-4xl font-bold font-mono tracking-tight ${card.textColor}`}>
          {count}{card.suffix || ''}
        </span>
      )}

      {/* Exec time only on total_tests card */}
      {card.key === 'total_tests' && (
        <span className="text-xs text-slate-500 font-mono">
          {loading ? '…' : execTime !== '--' ? `⏱ ${execTime}` : 'No run yet'}
        </span>
      )}

      {/* Pass rate bar */}
      {card.key === 'pass_rate' && !loading && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${numericVal}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.div>
  )
}

export default function MetricsCards({ data, hasRun, loading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => (
        <MetricCard
          key={card.key}
          card={card}
          value={data[card.key] ?? 0}
          execTime={data.execution_time}
          loading={loading}
          index={i}
        />
      ))}
    </div>
  )
}
