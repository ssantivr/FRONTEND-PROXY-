import { Fragment, useMemo, useState } from 'react'
import { ROUTES, STAMPS, getRoute, getStamp } from '../services'
import EmptyState from './EmptyState'
import Icon from './Icons'
import Stamp from './Stamp'

const DURATION_SCALE_MS = 100
const SKELETON_ROWS = [0, 1, 2, 3, 4]
const COLUMNS = [
  { key: 'timestamp', label: 'Time' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'serviceId', label: 'Service' },
  { key: 'operation', label: 'Operation' },
  { key: 'durationMs', label: 'Duration' },
  { key: 'status', label: 'Status' },
  { key: 'route', label: 'Proxy route' },
]

function toJson(value) {
  return JSON.stringify(value, null, 2)
}

function sortValue(log, key) {
  return key === 'route' ? getRoute(log) : log[key]
}

function selectLogs(logs, filters, sort) {
  const search = filters.search.trim().toLowerCase()
  const visible = logs.filter((log) => {
    const matchesSearch = !search || log.requestId.includes(search) || log.operation.toLowerCase().includes(search)
    return matchesSearch && (!filters.route || getRoute(log) === filters.route)
  })
  const direction = sort.ascending ? 1 : -1
  return [...visible].sort((a, b) => {
    const first = sortValue(a, sort.key)
    const second = sortValue(b, sort.key)
    return (first > second ? 1 : first < second ? -1 : 0) * direction
  })
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(event) {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button className="icon-button icon-button-small" onClick={handleCopy} aria-label={copied ? 'Request ID copied' : `Copy request ID ${value}`} title="Copy request ID">
      {copied ? <Icon name="check" /> : <Icon name="copy" />}
    </button>
  )
}

function LogDetails({ log }) {
  return (
    <div className="details-expander"><div className="details">
      <div>
        <h4>Input parameters</h4>
        <pre>{toJson(log.params)}</pre>
        <p className="note mono">Request {log.requestId}</p>
        <p className="note mono">{new Date(log.timestamp).toLocaleString()}</p>
      </div>
      {log.status === 'ERROR' ? (
        <div>
          <h4>Error</h4>
          <pre>{log.errorMessage}</pre>
          <h4>Stack trace</h4>
          <pre>{log.stackSummary}</pre>
        </div>
      ) : (
        <div>
          <h4>Response</h4>
          <pre>{toJson(log.response)}</pre>
        </div>
      )}
    </div></div>
  )
}

function LogRow({ log, expanded, onToggle }) {
  const route = getRoute(log)
  const barWidth = Math.min((log.durationMs / DURATION_SCALE_MS) * 100, 100)

  return (
    <tr className="log-row" onClick={onToggle}>
      <td data-label="Time" className="mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
      <td data-label="Request ID" className="mono">
        <button className="expand-button mono" aria-expanded={expanded} title={log.requestId} aria-label={`${expanded ? 'Hide' : 'Show'} details of call ${log.requestId}`} onClick={(event) => { event.stopPropagation(); onToggle() }}>
          <span className="chevron" aria-hidden="true" />
          {log.requestId.slice(0, 8)}
        </button>
        <CopyButton value={log.requestId} />
      </td>
      <td data-label="Service">{log.serviceId}</td>
      <td data-label="Operation" className="mono">{log.operation}</td>
      <td data-label="Duration">
        <span className="duration">
          <span className="mono">{log.durationMs} ms</span>
          <span className="duration-track" aria-hidden="true"><span style={{ width: `${barWidth}%` }} /></span>
        </span>
      </td>
      <td data-label="Status">
        <span className="status-cell">
          <Stamp state={getStamp(log)} label={STAMPS[getStamp(log)]} />
          <span className="mono status-text">{log.status}</span>
        </span>
      </td>
      <td data-label="Proxy route"><span className={`route-tag route-${route}`}>{ROUTES[route].label}</span></td>
    </tr>
  )
}

function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key
  const ariaSort = active ? (sort.ascending ? 'ascending' : 'descending') : 'none'
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button className="sort-button" onClick={() => onSort(column.key)}>
        {column.label}
        {active && <Icon name={sort.ascending ? 'up' : 'down'} />}
      </button>
    </th>
  )
}

function LogsTable({ logPage, page, filters, loading, onPageChange, onSimulate, simulating }) {
  const [expandedId, setExpandedId] = useState(null)
  const [sort, setSort] = useState({ key: 'timestamp', ascending: false })
  const lastPage = Math.max(logPage.totalPages - 1, 0)
  const logs = useMemo(() => selectLogs(logPage.content, filters, sort), [logPage.content, filters, sort])

  function toggle(requestId) {
    setExpandedId(expandedId === requestId ? null : requestId)
  }

  function handleSort(key) {
    setSort({ key, ascending: sort.key === key ? !sort.ascending : true })
  }

  if (!loading && logPage.totalElements === 0) {
    return <EmptyState message="No records for this period. Send calls through the gate, or clear the filters." onSimulate={onSimulate} disabled={simulating} />
  }

  return (
    <>
      <p className="note">Sorting, search and proxy route apply to the calls on this page.</p>
      <div className="table-wrapper">
        <table>
          <caption className="sr-only">Calls intercepted by the Logging Proxy</caption>
          <thead>
            <tr>{COLUMNS.map((column) => <SortHeader key={column.key} column={column} sort={sort} onSort={handleSort} />)}</tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <Fragment key={log.requestId}>
                <LogRow log={log} expanded={expandedId === log.requestId} onToggle={() => toggle(log.requestId)} />
                {expandedId === log.requestId && (
                  <tr className="details-row">
                    <td colSpan={COLUMNS.length}><LogDetails log={log} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loading && SKELETON_ROWS.map((row) => (
              <tr key={row}>
                <td colSpan={COLUMNS.length}><span className="skeleton skeleton-row" /></td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="no-matches">No records on this page match the search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="pagination" aria-label="Ledger pages">
        <button className="quiet" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span>Page {page + 1} of {lastPage + 1}, {logPage.totalElements} calls</span>
        <button className="quiet" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Next</button>
      </nav>
    </>
  )
}

export default LogsTable
