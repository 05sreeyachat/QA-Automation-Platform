import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts'

const PIE_COLORS = { Pass: '#22c55e', Fail: '#ef4444', Skipped: '#f59e0b' }

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs text-slate-300 shadow-xl">
      {label && <p className="font-mono text-slate-400 mb-1 truncate max-w-[180px]">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || '#818cf8' }}>
          {p.name}: <strong>{p.value}{p.name === 'Time (ms)' ? 'ms' : ''}</strong>
        </p>
      ))}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 font-mono">
      {children}
    </h2>
  )
}

export default function ResultsCharts({ data, loading }) {
  // Pie data
  const pieData = [
    { name: 'Pass',    value: data.passed  || 0 },
    { name: 'Fail',    value: data.failed  || 0 },
    { name: 'Skipped', value: data.skipped || 0 },
  ].filter(d => d.value > 0)

  // Timeline data (first 20 for readability)
  const timelineData = (data.timeline || []).slice(0, 20).map((t, i) => ({
    name: `T${i + 1}`,
    label: t.name,
    'Time (ms)': t.time,
  }))

  // API response time from test_results with ms in execution_time
  const apiData = (data.test_results || [])
    .filter(t => t.suite === 'API Tests' && t.execution_time?.endsWith('ms'))
    .slice(0, 12)
    .map(t => ({
      name: t.test_case.substring(0, 30),
      'Response (ms)': parseInt(t.execution_time),
      fill: t.status === 'Pass' ? '#22c55e' : '#ef4444'
    }))

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-card h-64 shimmer" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Pie Chart ── */}
      <div className="glass-card p-5">
        <SectionTitle>Pass vs Fail</SectionTitle>
        {pieData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={85} innerRadius={45}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
                animationBegin={100}
                animationDuration={900}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={PIE_COLORS[entry.name]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* ── Timeline Bar Chart ── */}
      <div className="glass-card p-5">
        <SectionTitle>Execution Timeline</SectionTitle>
        {timelineData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timelineData} margin={{ top: 0, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Time (ms)" fill="#6366f1" radius={[4, 4, 0, 0]}
                animationBegin={100} animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* ── API Response Time Line Chart ── */}
      <div className="glass-card p-5">
        <SectionTitle>API Response Times</SectionTitle>
        {apiData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={apiData} margin={{ top: 0, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} hide />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="Response (ms)"
                stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 5 }}
                animationBegin={100} animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No API test data" />
        )}
      </div>
    </motion.div>
  )
}

function EmptyChart({ label = 'No data' }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
      {label}
    </div>
  )
}
