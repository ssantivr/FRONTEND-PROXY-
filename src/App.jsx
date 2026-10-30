import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { getLogs, getSummary, simulateLoad } from './api'
import { SERVICES } from './services'
import { RANGES } from './stats'
import CheckpointTimeline from './components/CheckpointTimeline'
import CrossingRegistry from './components/CrossingRegistry'
import EmptyState from './components/EmptyState'
import InterceptMap from './components/InterceptMap'
import Kpis from './components/Kpis'
import Filters from './components/Filters'
import LogsTable from './components/LogsTable'
import TopBar from './components/TopBar'
import './App.css'

// Recharts is only downloaded when the charts are needed
const TrafficCharts = lazy(() => import('./components/TrafficCharts'))
const ResponseTimeChart = lazy(() => import('./components/ResponseTimeChart'))

const POLL_INTERVAL_MS = 3000
const TOAST_DURATION_MS = 4500
const CHART_CALLS = 20
const PAGE_SIZE = 25
const SAMPLE_SIZE = 100
const DAY_MS = 24 * 60 * 60 * 1000
const EMPTY_FILTERS = { service: '', status: '', from: '', to: '', search: '', route: '' }

function iso(time) {
  return new Date(time).toISOString()
}

// Loads the last calls of each service for the map and the chart
async function loadRecentLogs() {
  const pages = await Promise.all(
    SERVICES.map((service) => getLogs({ service: service.id, page: 0, size: CHART_CALLS })),
  )
  return Object.fromEntries(SERVICES.map((service, index) => [service.id, pages[index].content]))
}

// Loads the selected period and the one before it, to compare them
async function loadTrends(rangeMs) {
  const now = Date.now()
  const [current, previous, errors, previousErrors] = await Promise.all([
    getLogs({ from: iso(now - rangeMs), page: 0, size: SAMPLE_SIZE }),
    getLogs({ from: iso(now - 2 * rangeMs), to: iso(now - rangeMs), page: 0, size: SAMPLE_SIZE }),
    getLogs({ status: 'ERROR', from: iso(now - DAY_MS), page: 0, size: 1 }),
    getLogs({ status: 'ERROR', from: iso(now - 2 * DAY_MS), to: iso(now - DAY_MS), page: 0, size: 1 }),
  ])
  return {
    from: now - rangeMs,
    to: now,
    logs: current.content,
    totalCalls: current.totalElements,
    previousLogs: previous.content,
    errors: errors.totalElements,
    previousErrors: previousErrors.totalElements,
  }
}

function ChartFallback() {
  return <span className="skeleton skeleton-chart" />
}

function App() {
  const [summary, setSummary] = useState([])
  const [recentLogs, setRecentLogs] = useState({})
  const [trends, setTrends] = useState(null)
  const [logPage, setLogPage] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [range, setRange] = useState('1h')
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [toast, setToast] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const lastRequest = useRef(0)
  const loading = lastUpdated === null

  const loadDashboard = useCallback(async () => {
    const requestNumber = ++lastRequest.current
    const rangeMs = RANGES.find((item) => item.id === range).ms
    try {
      const [newSummary, newRecentLogs, newTrends, newLogPage] = await Promise.all([
        getSummary(),
        loadRecentLogs(),
        loadTrends(rangeMs),
        getLogs({ ...filters, page, size: PAGE_SIZE }),
      ])
      if (requestNumber !== lastRequest.current) return // A newer request already answered
      setSummary(newSummary)
      setRecentLogs(newRecentLogs)
      setTrends(newTrends)
      setLogPage(newLogPage)
      setError('')
      setLastUpdated(Date.now())
    } catch {
      if (requestNumber === lastRequest.current) {
        setError('Notice: control post unreachable. It may be waking up, which can take a minute.')
      }
    }
  }, [filters, page, range])

  useEffect(() => {
    loadDashboard()
    if (paused) return undefined
    const intervalId = setInterval(loadDashboard, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [loadDashboard, paused])

  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = setTimeout(() => setToast(''), TOAST_DURATION_MS)
    return () => clearTimeout(timeoutId)
  }, [toast])

  function handleFiltersChange(newFilters) {
    setFilters(newFilters)
    setPage(0)
  }

  async function handleSimulateLoad() {
    setSimulating(true)
    try {
      const result = await simulateLoad()
      setToast(`${result.totalCalls} calls sent: ${result.successfulCalls} OK, ${result.failedCalls} failed`)
      await loadDashboard()
    } catch {
      setError('Load simulation failed. Check that the backend is running.')
    } finally {
      setSimulating(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#overview">Skip to content</a>
      <TopBar
        lastUpdated={lastUpdated}
        offline={Boolean(error)}
        paused={paused}
        onTogglePause={() => setPaused(!paused)}
        simulating={simulating}
        onSimulate={handleSimulateLoad}
      />

      <main className="app">
        <section className="hero">
          <h1>Every call stops at the gate.</h1>
          <p>A Logging Proxy stands in front of three microservices. Watch what it lets through, answers itself, or turns away.</p>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
            <button className="quiet" onClick={loadDashboard}>Retry</button>
          </div>
        )}

        <section id="overview" aria-label="Key indicators">
          <Kpis trends={trends} range={range} />
        </section>

        <section id="trends" className="panel" aria-labelledby="trends-title">
          <div className="panel-heading">
            <h2 id="trends-title">Trends</h2>
            <div className="segmented" role="group" aria-label="Time range">
              {RANGES.map((item) => (
                <button key={item.id} aria-pressed={range === item.id} onClick={() => setRange(item.id)}>{item.label}</button>
              ))}
            </div>
          </div>
          {trends !== null && (
            <div className="crossing-grid">
              <CheckpointTimeline trends={trends} rangeLabel={RANGES.find((item) => item.id === range).label} />
              {trends.logs.length > 0 && <CrossingRegistry logsByService={recentLogs} />}
            </div>
          )}
          <Suspense fallback={<ChartFallback />}>
            {trends === null
              ? <ChartFallback />
              : <TrafficCharts trends={trends} onSimulate={handleSimulateLoad} simulating={simulating} />}
          </Suspense>
        </section>

        <InterceptMap logsByService={recentLogs} summary={summary} />

        <section className="panel" aria-label="Response time per service">
          <Suspense fallback={<ChartFallback />}>
            {loading
              ? <ChartFallback />
              : Object.values(recentLogs).some((logs) => logs.length > 0)
                ? <ResponseTimeChart logsByService={recentLogs} />
                : <EmptyState message="No records for this period." onSimulate={handleSimulateLoad} disabled={simulating} />}
          </Suspense>
        </section>

        <section id="ledger" className="panel" aria-labelledby="ledger-title">
          <div className="panel-heading">
            <h2 id="ledger-title">Call ledger</h2>
            <p>Open a call to read what went in and what came out.</p>
          </div>
          <Filters filters={filters} onChange={handleFiltersChange} onClear={() => handleFiltersChange(EMPTY_FILTERS)} />
          <LogsTable
            logPage={logPage}
            page={page}
            filters={filters}
            loading={loading}
            onPageChange={setPage}
            onSimulate={handleSimulateLoad}
            simulating={simulating}
          />
        </section>
      </main>

      {toast && <p key={toast} className="toast" role="status">{toast}</p>}
    </>
  )
}

export default App
