export default function EditButton({ onClick, title = "Editar" }) {
  return (
    <button className="btn-icon" onClick={onClick} title={title} aria-label={title}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    </button>
  )
}
