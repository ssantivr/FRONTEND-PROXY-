import { memo, useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildBuckets } from '../stats'
import EmptyState from './EmptyState'

const AXIS_TICK = { fontSize: 14, fill: 'var(--text-muted)' }
const TOOLTIP_STYLE = { background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--text)' }
const MAX_SAMPLE = 100

function ChartAxes({ unit, domain }) {
  return (
    <>
      <CartesianGrid stroke="var(--line)" vertical={false} />
      <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={32} />
      <YAxis yAxisId="left" unit={unit} width={64} domain={domain} tick={AXIS_TICK} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
    </>
  )
}

function ChartFigure({ title, summary, children }) {
  return (
    <figure className="chart-figure">
      <figcaption>{title}</figcaption>
      <div className="chart" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </figure>
  )
}

function describe(buckets, totalCalls, sampled) {
  const withData = buckets.filter((bucket) => bucket.latency !== null)
  const highest = Math.max(...withData.map((bucket) => bucket.latency))
  const lowestSuccess = Math.min(...withData.map((bucket) => bucket.success))
  const sample = sampled < totalCalls ? ` Based on the newest ${sampled} of ${totalCalls} calls.` : ''
  return {
    latency: `Average latency peaked at ${highest} ms across ${withData.length} time slots.${sample}`,
    success: `Success rate fell as low as ${lowestSuccess}% across ${withData.length} time slots.${sample}`,
  }
}

const TrafficCharts = memo(function TrafficCharts({ trends, onSimulate, simulating }) {
  const buckets = useMemo(() => buildBuckets(trends.logs, trends.from, trends.to), [trends])

  if (trends.logs.length === 0) {
    return <EmptyState message="No calls in this time range. Send some through the proxy to see the trends." onSimulate={onSimulate} disabled={simulating} />
  }
  const summary = describe(buckets, trends.totalCalls, Math.min(trends.logs.length, MAX_SAMPLE))

  return (
    <>
      <div className="chart-grid">
        <ChartFigure title="Latency" summary={summary.latency}>
          <LineChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <ChartAxes unit=" ms" />
            <Line yAxisId="left" dataKey="latency" name="Average latency (ms)" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ChartFigure>
        <ChartFigure title="Success rate and traffic" summary={summary.success}>
          <LineChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <ChartAxes unit="%" domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" unit=" req/s" width={72} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Legend iconType="plainline" />
            <Line yAxisId="left" dataKey="success" name="Success rate (%)" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
            <Line yAxisId="right" dataKey="rate" name="Traffic (req/s)" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartFigure>
      </div>
      {trends.logs.length < trends.totalCalls && (
        <p className="note">Showing the newest {trends.logs.length} of {trends.totalCalls} calls in this range.</p>
      )}
    </>
  )
})

export default TrafficCharts
