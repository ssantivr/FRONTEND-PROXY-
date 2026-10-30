import { memo, useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SERVICES } from '../services'

const CHART_CALLS = 20
const AXIS_TICK = { fontSize: 12, fontFamily: 'var(--mono)', fill: 'var(--text-muted)' }
const TOOLTIP_STYLE = { background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: 0, color: 'var(--text)' }

// Builds one row per call position, with one duration per service (oldest call first)
function buildChartData(logsByService) {
  const rows = Array.from({ length: CHART_CALLS }, (_, index) => ({ call: index + 1 }))
  SERVICES.forEach((service) => {
    const oldestFirst = [...(logsByService[service.id] ?? [])].reverse()
    oldestFirst.forEach((log, index) => {
      rows[index][service.id] = log.durationMs
    })
  })
  return rows
}

function describe(logsByService) {
  return SERVICES.map((service) => {
    const logs = logsByService[service.id] ?? []
    if (logs.length === 0) return `${service.name}: no calls`
    const average = logs.reduce((sum, log) => sum + log.durationMs, 0) / logs.length
    return `${service.name}: ${Math.round(average)} ms on average over ${logs.length} calls`
  }).join('. ')
}

const ResponseTimeChart = memo(function ResponseTimeChart({ logsByService }) {
  const data = useMemo(() => buildChartData(logsByService), [logsByService])
  const summary = describe(logsByService)

  return (
    <figure className="chart-figure">
      <figcaption>Response time of the last 20 calls per service</figcaption>
      <div className="chart" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="1 4" />
            <XAxis dataKey="call" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
            <YAxis unit=" ms" width={64} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(call) => `Call ${call}`} formatter={(value) => `${value} ms`} />
            <Legend iconType="plainline" />
            {SERVICES.map((service) => (
              <Line
                key={service.id}
                type="stepAfter"
                dataKey={service.id}
                name={service.name}
                stroke={service.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </figure>
  )
})

export default ResponseTimeChart
