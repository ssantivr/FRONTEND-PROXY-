const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

// Keeps only the filters that have a value
function toQuery(params) {
  const filled = Object.entries(params).filter(([, value]) => value !== '' && value !== undefined)
  return new URLSearchParams(filled).toString()
}

function toIsoDate(localDate) {
  return localDate ? new Date(localDate).toISOString() : ''
}

export function getSummary() {
  return request('/api/metrics/summary')
}

export function getLogs({ service, status, from, to, page, size }) {
  const query = toQuery({ service, status, from: toIsoDate(from), to: toIsoDate(to), page, size })
  return request(`/api/metrics/logs?${query}`)
}

export function simulateLoad() {
  return request('/api/metrics/simulate-load', { method: 'POST' })
}
