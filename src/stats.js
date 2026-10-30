export const RANGES = [
  { id: '15m', label: '15 min', ms: 15 * 60 * 1000 },
  { id: '1h', label: '1 h', ms: 60 * 60 * 1000 },
  { id: '24h', label: '24 h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 d', ms: 7 * 24 * 60 * 60 * 1000 },
]

const BUCKETS = 12

function percentile(values, rank) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil((rank / 100) * sorted.length) - 1]
}

function successRate(logs) {
  if (logs.length === 0) return null
  return (logs.filter((log) => log.status === 'SUCCESS').length / logs.length) * 100
}

export function summarize(logs) {
  const durations = logs.map((log) => log.durationMs)
  return {
    activeServices: new Set(logs.map((log) => log.serviceId)).size,
    successRate: successRate(logs),
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
  }
}

// Compares two values and describes the change in words
export function buildTrend(current, previous, unit, periodLabel) {
  if (current === null || previous === null) return { direction: 'none', text: `No data for previous ${periodLabel}` }
  const change = Math.round((current - previous) * 10) / 10
  if (change === 0) return { direction: 'flat', text: `Same as previous ${periodLabel}` }
  return {
    direction: change > 0 ? 'up' : 'down',
    text: `${change > 0 ? '+' : ''}${change}${unit} vs previous ${periodLabel}`,
  }
}

function formatBucketTime(time, rangeMs) {
  const options = rangeMs > RANGES[2].ms
    ? { weekday: 'short', hour: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' }
  return new Date(time).toLocaleString('en-GB', options)
}

// Groups the calls in time slots, with average latency, success rate and req/s
export function buildBuckets(logs, from, to) {
  const bucketMs = (to - from) / BUCKETS
  return Array.from({ length: BUCKETS }, (_, index) => {
    const start = from + index * bucketMs
    const bucketLogs = logs.filter((log) => {
      const time = Date.parse(log.timestamp)
      return time >= start && time < start + bucketMs
    })
    const total = bucketLogs.reduce((sum, log) => sum + log.durationMs, 0)
    return {
      time: formatBucketTime(start, to - from),
      latency: bucketLogs.length ? Math.round(total / bucketLogs.length) : null,
      success: bucketLogs.length ? Math.round(successRate(bucketLogs) * 10) / 10 : null,
      rate: Math.round((bucketLogs.length / (bucketMs / 1000)) * 100) / 100,
    }
  })
}
