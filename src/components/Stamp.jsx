import Icon from './Icons'

const STAMP_ICONS = { approved: 'check', delayed: 'clock', rejected: 'cross', idle: 'minus' }

function Stamp({ state, label }) {
  return <span className={`stamp stamp-${state}`}><Icon name={STAMP_ICONS[state]} /> {label}</span>
}

export default Stamp
