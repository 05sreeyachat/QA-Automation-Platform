import { useMemo } from 'react'
import { motion } from 'framer-motion'

const SEV_LEVELS = ['Critical', 'High', 'Medium', 'Low']
const BUG_STATUSES = ['Open', 'In Review', 'Resolved']

const SEV_CLASS = {
  Critical: 'sev-critical',
  High:     'sev-high',
  Medium:   'sev-medium',
  Low:      'sev-low',
}

const STATUS_CLASS = {
  Open:       'badge-fail',
  'In Review':'badge-skip',
  Resolved:   'badge-pass',
}

/**
 * Deterministically derive mock bugs from failed test results.
 * If fewer than 2 failures exist, pad with static placeholder bugs.
 */
function deriveBugs(testResults = []) {
  const failed = testResults.filter(t => t.status === 'Fail')

  const derived = failed.map((t, i) => ({
    id: `BUG-${(100 + i).toString().padStart(3, '0')}`,
    testName: t.test_case,
    severity: SEV_LEVELS[i % SEV_LEVELS.length],
    status: BUG_STATUSES[i % BUG_STATUSES.length],
    error: t.error || 'Assertion failure',
  }))

  const fallback = [
    { id: 'BUG-201', testName: 'TC-04: Checkout', severity: 'High',     status: 'Open',       error: 'StaleElementReferenceException on #checkout' },
    { id: 'BUG-202', testName: 'GET /users/999',   severity: 'Medium',   status: 'In Review',  error: 'Expected 404 but received 200' },
    { id: 'BUG-203', testName: 'TC-02: Invalid Login', severity: 'Low', status: 'Resolved',   error: 'Timeout waiting for error banner' },
  ]

  // merge, unique by id, up to 8 entries
  const all = [...derived, ...fallback]
  const seen = new Set()
  return all.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true }).slice(0, 8)
}

export default function BugTracker({ results = [] }) {
  const bugs = useMemo(() => deriveBugs(results), [results])

  return (
    <div className="glass-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-mono">
          Bug Tracker
        </h2>
        <span className="text-xs font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-500">
          {bugs.filter(b => b.status === 'Open').length} Open
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
        {bugs.map((bug, i) => (
          <motion.div
            key={bug.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10 rounded-xl p-3.5 transition-all cursor-default"
          >
            {/* Row 1: ID + Severity + Status */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-500">{bug.id}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${SEV_CLASS[bug.severity]}`}>
                  ● {bug.severity}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono ${STATUS_CLASS[bug.status]}`}>
                  {bug.status}
                </span>
              </div>
            </div>

            {/* Row 2: Test Name */}
            <p className="text-slate-300 text-xs font-medium truncate" title={bug.testName}>
              {bug.testName}
            </p>

            {/* Row 3: Error snippet */}
            {bug.error && (
              <p className="text-slate-600 text-xs font-mono mt-1 truncate" title={bug.error}>
                {bug.error.substring(0, 55)}{bug.error.length > 55 ? '…' : ''}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
