import { memo } from 'react'
import { getServiceHealth } from '../services'
import AnimatedNumber from './AnimatedNumber'
import Icon from './Icons'

const HEALTH_ICONS = { healthy: 'check', degraded: 'warning', problem: 'cross', idle: 'minus' }

const ServiceCard = memo(function ServiceCard({ name, metrics, hit }) {
  const hasCalls = metrics?.totalCalls > 0
  const health = getServiceHealth(metrics)
  const placeholder = metrics ? '-' : <span className="skeleton skeleton-line" />

  return (
    <article className={health.state === 'problem' ? 'card card-problem' : 'card'}>
      {hit && <span key={hit.count} className={`hit-flash route-${hit.route}`} />}
      <div className="card-title">
        <h3>{name}</h3>
        <span className={`health health-${health.state}`}><Icon name={HEALTH_ICONS[health.state]} /> {health.label}</span>
      </div>
      <dl className="card-metrics">
        <div>
          <dt>Total calls</dt>
          <dd>{metrics ? <AnimatedNumber value={metrics.totalCalls} /> : placeholder}</dd>
        </div>
        <div>
          <dt>Success rate</dt>
          <dd>{hasCalls ? <AnimatedNumber value={metrics.successRate} decimals={1} suffix="%" /> : placeholder}</dd>
        </div>
        <div>
          <dt>Average time</dt>
          <dd>{hasCalls ? <AnimatedNumber value={metrics.averageResponseTimeMs} decimals={1} suffix=" ms" /> : placeholder}</dd>
        </div>
      </dl>
    </article>
  )
})

export default ServiceCard
