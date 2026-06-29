import { useEffect, useState } from "react"
import { createUsuario, getUsuarios } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import Modal from "../components/Modal"

const INITIAL_FORM = { nombre: "" }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(""), 3000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getUsuarios()
        if (cancelled) return
        setUsuarios(normalizeCollection(data))
      } catch (err) {
        if (cancelled) return
        setError(err.message || "No se pudieron cargar los usuarios")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function refresh() {
    setLoading(true)
    setError("")
    try {
      const data = await getUsuarios()
      setUsuarios(normalizeCollection(data))
    } catch (err) {
      setError(err.message || "No se pudieron cargar los usuarios")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleClose() {
    setModalOpen(false)
    setForm(INITIAL_FORM)
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await createUsuario(form)
      handleClose()
      setSuccess("Usuario creado correctamente.")
      await refresh()
    } catch (err) {
      setError(err.message || "No se pudo crear el usuario")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      {success && (
        <p className="feedback-banner feedback-success" aria-live="polite" style={{ marginBottom: 16 }}>
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
                <span className={`badge ${u.activo ? "badge-active" : "badge-inactive"}`}>
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

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
