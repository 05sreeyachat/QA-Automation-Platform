import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_BADGE = {
  Pass:    'badge-pass',
  Fail:    'badge-fail',
  Skipped: 'badge-skip',
}

const SUITE_COLOR = {
  'Selenium UI': 'text-violet-400',
  'API Tests':   'text-sky-400',
}

const PAGE_SIZE = 12

export default function ResultsTable({ results = [], loading }) {
  const [page, setPage]     = useState(0)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = results.filter(r => {
    const matchStatus = filter === 'All' || r.status === filter
    const matchSearch = r.test_case?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when filters change
  const setFilterAndReset = (v) => { setFilter(v); setPage(0) }
  const setSearchAndReset = (v) => { setSearch(v); setPage(0) }

  return (
    <div className="glass-card p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-mono">
          Test Results
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearchAndReset(e.target.value)}
            className="bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-brand-400/50 w-36 placeholder-slate-600"
          />
          {/* Status filter */}
          {['All', 'Pass', 'Fail', 'Skipped'].map(f => (
            <button
              key={f}
              onClick={() => setFilterAndReset(f)}
              className={[
                'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
                filter === f
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg shimmer" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm py-12">
          No results matching filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider font-mono">
                <th className="text-left pb-3 pr-4 font-medium">Test Case</th>
                <th className="text-left pb-3 pr-4 font-medium">Suite</th>
                <th className="text-left pb-3 pr-4 font-medium">Status</th>
                <th className="text-left pb-3 pr-4 font-medium">Time</th>
                <th className="text-left pb-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {paginated.map((row, i) => (
                  <motion.tr
                    key={`${row.test_case}-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={[
                      'group hover:bg-white/[0.02] transition-colors',
                      row.status === 'Fail' ? 'bg-red-500/[0.04]' : ''
                    ].join(' ')}
                  >
                    {/* Test Case */}
                    <td className="py-3 pr-4 max-w-[220px]">
                      <span
                        className="text-slate-300 font-mono text-xs truncate block"
                        title={row.test_case}
                      >
                        {row.test_case}
                      </span>
                    </td>
                    {/* Suite */}
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-mono ${SUITE_COLOR[row.suite] || 'text-slate-400'}`}>
                        {row.suite || '—'}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono ${STATUS_BADGE[row.status] || 'badge-skip'}`}>
                        {row.status}
                      </span>
                    </td>
                    {/* Time */}
                    <td className="py-3 pr-4">
                      <span className="text-slate-500 text-xs font-mono">{row.execution_time}</span>
                    </td>
                    {/* Error */}
                    <td className="py-3 max-w-[200px]">
                      {row.error ? (
                        <span
                          className="text-red-400/80 text-xs font-mono truncate block"
                          title={row.error}
                        >
                          {row.error.substring(0, 60)}{row.error.length > 60 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-xs text-slate-600 font-mono">
            {filtered.length} results · page {page + 1}/{totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
