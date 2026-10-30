// Airport board value: a character flips only when it changes
function SplitFlap({ value }) {
  return (
    <span className="flap-board" aria-label={value} role="text">
      {[...value].map((character, index) => (
        <span key={`${index}-${character}`} className="flap" aria-hidden="true">{character}</span>
      ))}
    </span>
  )
}

export default SplitFlap
