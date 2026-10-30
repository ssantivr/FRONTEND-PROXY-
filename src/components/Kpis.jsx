import { RANGES, buildTrend, summarize } from '../stats'
import { SERVICES } from '../services'
import AnimatedNumber from './AnimatedNumber'
import Icon from './Icons'

const ERRORS_PERIOD = '24 h'

function Trend({ trend }) {
  const icon = { up: 'up', down: 'down' }[trend.direction] ?? 'minus'
  return <p className="trend"><Icon name={icon} /> {trend.text}</p>
}

function Kpi({ label, trend, loading, children }) {
  return (
    <div className="kpi">
      <dt>{label}</dt>
      <dd className="kpi-value">{loading ? <span className="skeleton skeleton-kpi" /> : children}</dd>
      <dd>{loading ? <span className="skeleton skeleton-line" /> : <Trend trend={trend} />}</dd>
    </div>
  )
}

function Kpis({ trends, range }) {
  const loading = trends === null
  const period = RANGES.find((item) => item.id === range).label
  const current = summarize(trends?.logs ?? [])
  const previous = summarize(trends?.previousLogs ?? [])

  return (
    <dl className="kpis">
      <Kpi label={`Active services (${period})`} loading={loading} trend={buildTrend(current.activeServices, previous.activeServices, '', period)}>
        <AnimatedNumber value={current.activeServices} /> / {SERVICES.length}
      </Kpi>
      <Kpi label={`Success rate (${period})`} loading={loading} trend={buildTrend(current.successRate, previous.successRate, ' pts', period)}>
        {current.successRate === null ? '-' : <AnimatedNumber value={current.successRate} decimals={1} suffix="%" />}
      </Kpi>
      <Kpi label="Latency p50 / p95" loading={loading} trend={buildTrend(current.p95, previous.p95, ' ms p95', period)}>
        {current.p50 === null ? '-' : <><AnimatedNumber value={current.p50} /> / <AnimatedNumber value={current.p95} suffix=" ms" /></>}
      </Kpi>
      <Kpi label="Errors (24 h)" loading={loading} trend={buildTrend(trends?.errors ?? null, trends?.previousErrors ?? null, '', ERRORS_PERIOD)}>
        <AnimatedNumber value={trends?.errors ?? 0} />
      </Kpi>
    </dl>
  )
}

export default Kpis
