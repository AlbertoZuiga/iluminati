export default function AutoCards({ selected, onSelect, options }) {
  if (options.length === 0) {
    return <p className="hint-text">No hay autos activos.</p>
  }
  return (
    <div className="auto-cards">
      {options.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`auto-card${selected === a.id ? " selected" : ""}`}
          onClick={() => onSelect(a.id)}
        >
          <span className="auto-card-name">{a.nombre}</span>
          {a.patente && <span className="auto-card-patente">{a.patente}</span>}
        </button>
      ))}
    </div>
  )
}
