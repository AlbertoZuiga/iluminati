import { useState } from "react"
import { createUsuario, updateUsuario } from "../services/api"
import { useData } from "../context/DataContext"
import useFeedback from "../hooks/useFeedback"
import Modal from "../components/Modal"
import EditButton from "../components/EditButton"

const INITIAL_FORM = { nombre: "" }

export default function UsuariosPage() {
  const { usuarios, setUsuarios, loading, reload } = useData()
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const { success, showSuccess } = useFeedback()
  const [modalOpen, setModalOpen] = useState(false)
  const [toggling, setToggling] = useState(new Set())
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleClose() {
    setModalOpen(false)
    setForm(INITIAL_FORM)
    setError("")
  }

  function handleOpenEdit(u) {
    setEditTarget(u)
    setEditForm({ nombre: u.nombre ?? "" })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    setEditForm({ nombre: "" })
    setEditError("")
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError("")
    try {
      await updateUsuario(editTarget.id, editForm)
      setUsuarios((prev) =>
        prev.map((x) => x.id === editTarget.id ? { ...x, ...editForm } : x)
      )
      handleCloseEdit()
      showSuccess("Usuario actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el usuario")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleToggleActivo(u) {
    const id = u.id
    if (toggling.has(id)) return
    const nextActivo = !u.activo
    setToggling((prev) => new Set([...prev, id]))
    setUsuarios((prev) => prev.map((x) => x.id === id ? { ...x, activo: nextActivo } : x))
    try {
      await updateUsuario(id, { activo: nextActivo })
    } catch (err) {
      setUsuarios((prev) => prev.map((x) => x.id === id ? { ...x, activo: u.activo } : x))
      setError(err.message || "No se pudo actualizar el usuario")
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const created = await createUsuario(form)
      handleClose()
      showSuccess("Usuario creado correctamente.")
      setUsuarios((prev) => [...prev, created])
      reload()
    } catch (err) {
      setError(err.message || "No se pudo crear el usuario")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      {success && (
        <p className="feedback-banner feedback-success feedback-banner-spaced" aria-live="polite">
          {success}
        </p>
      )}

      <div className="section-header">
        <p className="section-count">
          {loading ? "Cargando…" : `${usuarios.length} usuario${usuarios.length !== 1 ? "s" : ""}`}
        </p>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Crear usuario
        </button>
      </div>

      {loading && (
        <div className="skeleton-list">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && usuarios.length === 0 && (
        <p className="empty-state">Todavía no hay usuarios creados.</p>
      )}

      {!loading && usuarios.length > 0 && (
        <ul className="data-list">
          {usuarios.map((u, i) => (
            <li key={u.id ?? `u-${i}`}>
              <div className="list-item-main">
                <strong>{u.nombre ?? "Usuario sin nombre"}</strong>
                <button
                  className={`badge badge-clickable ${u.activo ? "badge-active" : "badge-inactive"}`}
                  onClick={() => handleToggleActivo(u)}
                  disabled={toggling.has(u.id)}
                  title={u.activo ? "Marcar inactivo" : "Marcar activo"}
                >
                  {toggling.has(u.id) ? "…" : u.activo ? "Activo" : "Inactivo"}
                </button>
                <EditButton onClick={() => handleOpenEdit(u)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal title="Editar usuario" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <label>
            <span>Nombre</span>
            <input type="text" name="nombre" value={editForm.nombre} onChange={handleEditChange} required autoComplete="off" />
          </label>

          <button type="submit" className="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </Modal>

      <Modal title="Crear usuario" open={modalOpen} onClose={handleClose}>
        <form className="form-card" onSubmit={handleSubmit}>
          {error && (
            <p className="feedback-banner feedback-error" role="alert">{error}</p>
          )}

          <label>
            <span>Nombre</span>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Camila"
              required
              autoComplete="off"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear usuario"}
          </button>
        </form>
      </Modal>
    </section>
  )
}
