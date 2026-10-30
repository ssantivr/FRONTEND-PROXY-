export const SERVICES = [
  { id: 'inventory', name: 'Inventory', color: 'var(--inventory)' },
  { id: 'orders', name: 'Orders', color: 'var(--orders)' },
  { id: 'payments', name: 'Payments', color: 'var(--payments)' },
]

export const ROUTES = {
  passed: { label: 'Passed', description: 'Reached the real service' },
  cached: { label: 'Cached', description: 'Answered by the proxy' },
  blocked: { label: 'Blocked', description: 'Stopped by access control' },
  failed: { label: 'Failed', description: 'Error in the real service' },
}

const DEGRADED_ERROR_RATE = 5
const PROBLEM_ERROR_RATE = 15

// Tells what the proxy did with a call
export function getRoute(log) {
  if (log.cacheHit) return 'cached'
  if (log.status === 'SUCCESS') return 'passed'
  return log.stackSummary?.includes('LoggingProxy.validateAccess') ? 'blocked' : 'failed'
}

export function getServiceHealth(metrics) {
  if (!metrics || metrics.totalCalls === 0) return { state: 'idle', label: 'No traffic' }
  if (metrics.errorRate > PROBLEM_ERROR_RATE) return { state: 'problem', label: 'Service with problems' }
  if (metrics.errorRate > DEGRADED_ERROR_RATE) return { state: 'degraded', label: 'Degraded' }
  return { state: 'healthy', label: 'Healthy' }
}
