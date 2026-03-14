import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MetricsCards from './components/MetricsCards'
import ResultsCharts from './components/ResultsCharts'
import ResultsTable from './components/ResultsTable'
import BugTracker from './components/BugTracker'

const API_BASE = 'http://localhost:5000'

const EMPTY_STATE = {
  total_tests: 0, passed: 0, failed: 0, skipped: 0,
  pass_rate: 0, execution_time: '--', run_at: null,
  test_results: [], timeline: []
}

export default function App() {
  const [results, setResults]   = useState(EMPTY_STATE)
  const [loading, setLoading]   = useState(false)
  const [hasRun, setHasRun]     = useState(false)
  const [error, setError]       = useState(null)

  const runTests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/run-tests`, { method: 'POST' })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setResults(data)
      setHasRun(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-bg-900">
      {/* Ambient background blobs */}
      <div className="ambient-bg" />

      {/* Grid overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              {/* Live indicator */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
              </span>
              <span className="text-xs font-mono text-brand-400 tracking-widest uppercase">
                QA Automation Platform
              </span>
            </div>
            <h1 className="text-3xl font-bold gradient-text leading-tight">
              Testing Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Selenium UI · JUnit · Postman API · Real-time Analytics
            </p>
          </div>

          {/* Run Button */}
          <RunButton onClick={runTests} loading={loading} />
        </motion.header>

        {/* ── Error Banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card px-5 py-4 border-red-500/30 bg-red-500/10 flex items-center gap-3 text-red-300 text-sm"
            >
              <span className="text-lg">⚠</span>
              <span><strong>Backend Error:</strong> {error} — ensure <code className="font-mono bg-white/10 px-1 rounded">python app.py</code> is running on port 5000.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading overlay text ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card px-5 py-4 flex items-center gap-4 text-slate-300 text-sm"
            >
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-400"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
              <span>Running Selenium UI tests &amp; Postman API tests…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Metrics ── */}
        <MetricsCards data={results} hasRun={hasRun} loading={loading} />

        {/* ── Charts ── */}
        <AnimatePresence>
          {(hasRun || loading) && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <ResultsCharts data={results} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results Table + Bug Tracker ── */}
        <AnimatePresence>
          {(hasRun || loading) && (
            <motion.div
              className="grid grid-cols-1 xl:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <div className="xl:col-span-2">
                <ResultsTable results={results.test_results} loading={loading} />
              </div>
              <div>
                <BugTracker results={results.test_results} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        <AnimatePresence>
          {!hasRun && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-4"
            >
              <div className="text-6xl mb-2 animate-float">🚀</div>
              <h2 className="text-xl font-semibold text-slate-300">Ready to Run</h2>
              <p className="text-slate-500 text-sm max-w-sm">
                Click <span className="text-brand-400 font-semibold">Run Test Suite</span> to launch
                Selenium UI tests &amp; Postman API tests and view live analytics.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 pt-6 flex items-center justify-between text-xs text-slate-600">
          <span>QA Testing Dashboard</span>
          {results.run_at && (
            <span>
              Last run: {new Date(results.run_at).toLocaleString()}
            </span>
          )}
        </footer>
      </div>
    </div>
  )
}

/* ── Run Button ──────────────────────────────────────────────────────────── */
function RunButton({ onClick, loading }) {
  return (
    <motion.button
      id="run-tests-btn"
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={[
        'relative overflow-hidden px-7 py-3 rounded-xl font-semibold text-sm',
        'text-white tracking-wide transition-all duration-200',
        loading
          ? 'bg-brand-600/50 cursor-not-allowed'
          : 'bg-gradient-to-r from-brand-600 to-violet-600 hover:shadow-lg hover:shadow-brand-500/30 cursor-pointer'
      ].join(' ')}
    >
      {/* shimmer sweep */}
      {!loading && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.12) 50%,transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s linear infinite'
          }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Running Tests…
          </>
        ) : (
          <>▶  Run Test Suite</>
        )}
      </span>
    </motion.button>
  )
}
