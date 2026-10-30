function EmptyState({ message, onSimulate, disabled }) {
  return (
    <div className="empty">
      <p>{message}</p>
      <button className="quiet" onClick={onSimulate} disabled={disabled}>Simulate load</button>
    </div>
  )
}

export default EmptyState
