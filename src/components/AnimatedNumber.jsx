import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 220

// Counts from the previous value to the new one
function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    const start = current.current
    const startTime = performance.now()
    let frame = null

    function step(now) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const progress = reducedMotion ? 1 : Math.min((now - startTime) / DURATION_MS, 1)
      current.current = start + (value - start) * progress
      setShown(current.current)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{shown.toFixed(decimals)}{suffix}</>
}

export default AnimatedNumber
