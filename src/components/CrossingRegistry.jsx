import { memo } from 'react'
import { SERVICES, STAMPS, getStamp } from '../services'

const SLOTS = 20

function describe(logsByService) {
  return SERVICES.map((service) => {
    const logs = logsByService[service.id] ?? []
    const rejected = logs.filter((log) => getStamp(log) === 'rejected').length
    return `${service.name}: ${logs.length} recent calls, ${rejected} rejected`
  }).join('. ')
}

// Low resolution dot map: one row per service, one dot per recent call
const CrossingRegistry = memo(function CrossingRegistry({ logsByService }) {
  const summary = describe(logsByService)

  return (
    <figure className="chart-figure">
      <figcaption>Crossing registry, last 20 calls per service</figcaption>
      <svg className="registry" viewBox="0 0 330 96" role="img" aria-label={summary}>
        {SERVICES.map((service, row) => {
          const logs = [...(logsByService[service.id] ?? [])].reverse()
          return (
            <g key={service.id}>
              <text x="0" y={row * 32 + 20} className="registry-label">{service.id}</text>
              {Array.from({ length: SLOTS }, (_, slot) => (
                <circle
                  key={slot}
                  cx={92 + slot * 12}
                  cy={row * 32 + 16}
                  r="4"
                  className={logs[slot] ? `registry-dot pulse-${getStamp(logs[slot])}` : 'registry-dot registry-empty'}
                />
              ))}
            </g>
          )
        })}
      </svg>
      <ul className="stamp-legend">
        {Object.entries(STAMPS).map(([stamp, label]) => (
          <li key={stamp}><span className={`legend-dot pulse-${stamp}`} /> {label}</li>
        ))}
      </ul>
      <p className="sr-only">{summary}</p>
    </figure>
  )
})

export default CrossingRegistry
