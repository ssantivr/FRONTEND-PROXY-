import { useEffect, useMemo, useRef, useState } from 'react'
import { ROUTES, SERVICES, getRoute } from '../services'
import AnimatedNumber from './AnimatedNumber'
import ServiceCard from './ServiceCard'

const CLIENT = [8, 50]
const GATE = [46, 50]
const JUNCTION_X = 58
const LANE_Y = { inventory: 16.67, orders: 50, payments: 83.33 }
const MAX_PACKETS_PER_UPDATE = 15
const PACKET_GAP_MS = 220
const MS_PER_MAP_UNIT = 13
const TAIL_DELAY_MS = 40
const TAIL_DOTS = [1, 2, 3]

function lanePoints(serviceId) {
  const y = LANE_Y[serviceId]
  return [[JUNCTION_X, 50], [JUNCTION_X, y], [100, y]]
}

// Points a call travels through, in percentages of the map
function pathOf(log) {
  const route = getRoute(log)
  if (route === 'cached') return [CLIENT, GATE, CLIENT]
  if (route === 'blocked') return [CLIENT, GATE]
  return [CLIENT, GATE, ...lanePoints(log.serviceId)]
}

function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x2 - x1, y2 - y1)
}

// Builds keyframes with a constant speed, whatever the length of each segment
function buildFlight(points) {
  const segments = points.slice(1).map((point, index) => distance(points[index], point))
  const length = segments.reduce((total, segment) => total + segment, 0)
  let travelled = 0
  const frames = points.map(([x, y], index) => {
    travelled += index === 0 ? 0 : segments[index - 1]
    return { left: `${x}%`, top: `${y}%`, offset: travelled / length, opacity: 1 }
  })
  return { frames, duration: length * MS_PER_MAP_UNIT, gateTime: segments[0] * MS_PER_MAP_UNIT }
}

function reactGate(gateBar, route, delay) {
  if (route === 'blocked') {
    const shake = ['0', '-4px', '4px', '0'].map((x) => ({ transform: `translateX(${x})` }))
    gateBar.animate(shake, { duration: 200, delay })
  } else {
    gateBar.animate([{ filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 200, delay })
  }
}

function Packet({ log, delay, gateBar, onDone }) {
  const route = getRoute(log)
  const dots = useRef([])

  useEffect(() => {
    const { frames, duration, gateTime } = buildFlight(pathOf(log))
    const animations = dots.current.map((dot, index) =>
      dot.animate(frames, { duration, delay: delay + index * TAIL_DELAY_MS, fill: 'both' }))
    animations.at(-1).onfinish = onDone
    reactGate(gateBar.current, route, delay + gateTime)
    return () => animations.forEach((animation) => animation.cancel())
    // A packet flies only once, so the effect must not restart with new props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {[0, ...TAIL_DOTS].map((index) => (
        <span
          key={index}
          ref={(dot) => { dots.current[index] = dot }}
          className={`packet route-${route} packet-${index}`}
        />
      ))}
    </>
  )
}

function useNewPackets(logs) {
  const [packets, setPackets] = useState([])
  const seenIds = useRef(null)

  useEffect(() => {
    if (logs.length === 0) return
    const isFirstLoad = seenIds.current === null
    const seen = seenIds.current ?? new Set()
    const newLogs = logs.filter((log) => !seen.has(log.requestId))
    newLogs.forEach((log) => seen.add(log.requestId))
    seenIds.current = seen

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isFirstLoad || reducedMotion) return
    const oldestFirst = [...newLogs].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-MAX_PACKETS_PER_UPDATE)
    setPackets((current) => [...current, ...oldestFirst.map((log, index) => ({ log, delay: index * PACKET_GAP_MS }))])
  }, [logs])

  function removePacket(requestId) {
    setPackets((current) => current.filter((packet) => packet.log.requestId !== requestId))
  }

  return { packets, removePacket }
}

function InterceptMap({ logsByService, summary }) {
  const logs = useMemo(() => SERVICES.flatMap((service) => logsByService[service.id] ?? []), [logsByService])
  const { packets, removePacket } = useNewPackets(logs)
  const [hits, setHits] = useState({})
  const gateBar = useRef(null)
  const routeCounts = Object.groupBy(logs, getRoute)

  // Lights the card of the service where the packet landed
  function handleLanding(log) {
    removePacket(log.requestId)
    const route = getRoute(log)
    if (route === 'passed' || route === 'failed') {
      setHits((current) => ({
        ...current,
        [log.serviceId]: { count: (current[log.serviceId]?.count ?? 0) + 1, route },
      }))
    }
  }

  return (
    <section id="services" className="panel" aria-labelledby="services-title">
      <div className="panel-heading">
        <h2 id="services-title">Services and live intercept map</h2>
        <p>Each dot is a real call passing through the proxy.</p>
      </div>
      <div className="map-layout">
        <div className={packets.length > 0 ? 'map map-busy' : 'map'} aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M${CLIENT} L${GATE}`} />
            {SERVICES.map((service) => (
              <path key={service.id} d={`M${GATE} ${lanePoints(service.id).map((point) => `L${point}`).join(' ')}`} />
            ))}
          </svg>
          <div className="node client-node">Client</div>
          <div className="gate">
            <span ref={gateBar} className="gate-bar" />
            <span className="gate-label">LoggingProxy</span>
          </div>
          {SERVICES.map((service) => (
            <span key={service.id} className="lane-label" style={{ top: `${LANE_Y[service.id]}%` }}>{service.id}</span>
          ))}
          {packets.map(({ log, delay }) => (
            <Packet key={log.requestId} log={log} delay={delay} gateBar={gateBar} onDone={() => handleLanding(log)} />
          ))}
        </div>
        <div className="service-cards">
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              name={service.name}
              metrics={summary.find((item) => item.serviceId === service.id)}
              hit={hits[service.id]}
            />
          ))}
        </div>
      </div>
      <ul className="route-legend">
        {Object.entries(ROUTES).map(([route, { label, description }]) => (
          <li key={route}>
            <span className={`route-dot route-${route}`} />
            <strong className="mono"><AnimatedNumber value={routeCounts[route]?.length ?? 0} /></strong> {label}
            <small>{description}</small>
          </li>
        ))}
      </ul>
      <p className="note">Counts cover the last 20 calls of each service.</p>
    </section>
  )
}

export default InterceptMap
