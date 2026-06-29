import { useEffect, useState } from "react"
import { createUsuario, getUsuarios } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"

const INITIAL_FORM = { nombre: "" }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(""), 3000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    let cancelled = false

    async function loadUsuarios() {
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

    loadUsuarios()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshUsuarios() {
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

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await createUsuario(form)
      setForm(INITIAL_FORM)
      setSuccess("Usuario creado correctamente.")
      await refreshUsuarios()
    } catch (err) {
      setError(err.message || "No se pudo crear el usuario")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-grid">
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <h2>Crear usuario</h2>
          <p>Registra a una persona que use los autos compartidos.</p>
        </div>

        {error && (
          <p className="feedback-banner feedback-error" role="alert">{error}</p>
        )}
        {success && (
          <p className="feedback-banner feedback-success" aria-live="polite">{success}</p>
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

        <button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Crear usuario"}
        </button>
      </form>

      <article className="card list-card">
        <div className="card-header">
          <h2>Usuarios registrados</h2>
          <p>{loading ? "Cargando…" : `${usuarios.length} usuario${usuarios.length !== 1 ? "s" : ""}`}</p>
        </div>

        {loading && <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}

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
      </article>
    </section>
  )
}
