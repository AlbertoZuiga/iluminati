import Modal from "./Modal"

export default function UserSelectModal({ open, forced, usuarios, onSelect, onClose }) {
  return (
    <Modal title="¿Quién eres?" open={open} onClose={forced ? () => {} : onClose}>
      <div className="auto-cards">
        {usuarios.map((u) => (
          <button
            key={u.id}
            type="button"
            className="auto-card"
            onClick={() => onSelect(u.id)}
          >
            <span className="auto-card-name">{u.nombre ?? u.email ?? u.id}</span>
          </button>
        ))}
      </div>
      {usuarios.length === 0 && <p className="empty-state">No hay usuarios registrados.</p>}
    </Modal>
  )
}
