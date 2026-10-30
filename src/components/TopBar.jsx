import { useEffect, useState } from 'react'
import Icon from './Icons'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'services', label: 'Services' },
  { id: 'ledger', label: 'Ledger' },
]

function saveTheme(theme) {
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // The theme still works for this visit without storage
  }
}

const SESSION_SERIAL = `CP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

function UtcClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  return <time dateTime={now.toISOString()}>{now.toISOString().slice(11, 19)} UTC</time>
}

function UpdatedAgo({ lastUpdated }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  if (!lastUpdated) return <span className="updated">Connecting...</span>
  const seconds = Math.max(Math.round((now - lastUpdated) / 1000), 0)
  return <span className="updated">Last reading {seconds} s ago</span>
}

function ThemeButton() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  function applyTheme() {
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
    saveTheme(nextTheme)
  }

  // The new theme grows as a circle from the button
  function handleClick(event) {
    const root = document.documentElement.style
    root.setProperty('--reveal-x', `${event.clientX}px`)
    root.setProperty('--reveal-y', `${event.clientY}px`)
    if (document.startViewTransition) {
      document.startViewTransition(applyTheme)
    } else {
      applyTheme()
    }
  }

  return (
    <button className="icon-button" onClick={handleClick} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

function TopBar({ lastUpdated, offline, paused, onTogglePause, simulating, onSimulate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <p className="wordmark">Checkpoint</p>
        <button
          className="icon-button menu-button"
          aria-label="Sections menu"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name="menu" />
        </button>
        <nav id="main-nav" className={menuOpen ? 'main-nav main-nav-open' : 'main-nav'} aria-label="Sections">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} onClick={() => setMenuOpen(false)}>{section.label}</a>
          ))}
        </nav>
        <p className="docket"><span>Session {SESSION_SERIAL}</span><UtcClock /></p>
        <div className="topbar-actions">
          <span className={offline ? 'live live-off' : 'live'} aria-live="off">
            {paused ? 'Paused' : <UpdatedAgo lastUpdated={lastUpdated} />}
          </span>
          <button
            className="icon-button"
            onClick={onTogglePause}
            aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
            title={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
          >
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <ThemeButton />
          <button className={simulating ? 'primary primary-busy' : 'primary'} onClick={onSimulate} disabled={simulating}>
            {simulating ? 'Sending...' : 'Simulate load'}
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
