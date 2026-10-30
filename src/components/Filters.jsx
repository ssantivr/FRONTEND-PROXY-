import { ROUTES, SERVICES } from '../services'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'ERROR', label: 'Error' },
]

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span id={`${label}-label`}>{label}</span>
      <div className="segmented" role="group" aria-labelledby={`${label}-label`}>
        {options.map((option) => (
          <button key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Filters({ filters, onChange, onClear }) {
  const serviceOptions = [
    { value: '', label: 'All' },
    ...SERVICES.map((service) => ({ value: service.id, label: service.name })),
  ]

  function update(field, value) {
    onChange({ ...filters, [field]: value })
  }

  return (
    <div className="filters">
      <label className="field field-grow">
        Search request ID or operation
        <input type="search" value={filters.search} onChange={(event) => update('search', event.target.value)} />
      </label>
      <Segmented label="Service" options={serviceOptions} value={filters.service} onChange={(value) => update('service', value)} />
      <Segmented label="Status" options={STATUS_OPTIONS} value={filters.status} onChange={(value) => update('status', value)} />
      <label className="field">
        Proxy route
        <select value={filters.route} onChange={(event) => update('route', event.target.value)}>
          <option value="">All</option>
          {Object.entries(ROUTES).map(([route, { label }]) => <option key={route} value={route}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        From
        <input type="datetime-local" value={filters.from} onChange={(event) => update('from', event.target.value)} />
      </label>
      <label className="field">
        To
        <input type="datetime-local" value={filters.to} onChange={(event) => update('to', event.target.value)} />
      </label>
      <button className="quiet" onClick={onClear}>Clear filters</button>
    </div>
  )
}

export default Filters
