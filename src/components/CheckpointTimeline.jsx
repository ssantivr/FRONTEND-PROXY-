import { memo } from 'react'
import { STAMPS, SERVICES, getStamp } from '../services'

const LANE_TOP = { inventory: 20, orders: 50, payments: 80 }

function positionOf(log, from, to) {
  return ((Date.parse(log.timestamp) - from) / (to - from)) * 100
}

function describe(logs) {
  const counts = logs.reduce((total, log) => {
    const stamp = getStamp(log)
    return { ...total, [stamp]: (total[stamp] ?? 0) + 1 }
  }, {})
  const parts = Object.entries(STAMPS).map(([stamp, label]) => `${counts[stamp] ?? 0} ${label.toLowerCase()}`)
  return `${logs.length} calls crossed the checkpoint in this period: ${parts.join(', ')}.`
}

// Each call is a pulse on its service lane, placed by the time it crossed
const CheckpointTimeline = memo(function CheckpointTimeline({ trends, rangeLabel }) {
  if (trends.logs.length === 0) return null
  const summary = describe(trends.logs)

  return (
    <figure className="chart-figure">
      <figcaption>Crossings, last {rangeLabel}</figcaption>
      <div className="timeline" role="img" aria-label={summary}>
        {SERVICES.map((service) => (
          <span key={service.id} className="timeline-lane" style={{ top: `${LANE_TOP[service.id]}%` }}>
            <span className="timeline-lane-name">{service.id}</span>
          </span>
        ))}
        <span className="timeline-gate"><span>NOW</span></span>
        {trends.logs.map((log) => (
          <span
            key={log.requestId}
            className={`pulse pulse-${getStamp(log)}`}
            style={{ left: `${positionOf(log, trends.from, trends.to)}%`, top: `${LANE_TOP[log.serviceId]}%` }}
          />
        ))}
      </div>
      <p className="sr-only">{summary}</p>
    </figure>
  )
})

export default CheckpointTimeline
