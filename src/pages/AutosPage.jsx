import { useEffect, useState } from "react"
import {
  createAuto, getAutos, updateAuto,
  getUsuarios, getAutoUsuarios, saveAutoUsuarios,
} from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import Modal from "../components/Modal"

const INITIAL_FORM = { nombre: "", patente: "", marca: "", modelo: "", anio: "" }
const INITIAL_EDIT_FORM = { ...INITIAL_FORM, miembros: [] }

export default function AutosPage() {
  const [autos, setAutos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [autoUsuarios, setAutoUsuarios] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [toggling, setToggling] = useState(new Set())
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(""), 3000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [autosData, usuariosData, autoUsuariosData] = await Promise.all([
          getAutos(), getUsuarios(), getAutoUsuarios(),
        ])
        if (cancelled) return
        setAutos(normalizeCollection(autosData))
        setUsuarios(normalizeCollection(usuariosData).filter((u) => u.activo !== false))
        setAutoUsuarios(normalizeCollection(autoUsuariosData))
      } catch (err) {
        if (cancelled) return
        setError(err.message || "No se pudieron cargar los autos")
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
      const data = await getAutos()
      setAutos(normalizeCollection(data))
    } catch (err) {
      setError(err.message || "No se pudieron cargar los autos")
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

  function handleOpenEdit(auto) {
    const miembros = autoUsuarios
      .filter((r) => r.autoid === auto.id)
      .map((r) => r.usuarioid)
    setEditTarget(auto)
    setEditForm({
      nombre: auto.nombre ?? "",
      patente: auto.patente ?? "",
      marca: auto.marca ?? "",
      modelo: auto.modelo ?? "",
      anio: auto.anio != null ? String(auto.anio) : "",
      miembros,
    })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    setEditForm(INITIAL_EDIT_FORM)
    setEditError("")
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleEditMiembro(userId) {
    setEditForm((prev) => ({
      ...prev,
      miembros: prev.miembros.includes(userId)
        ? prev.miembros.filter((id) => id !== userId)
        : [...prev.miembros, userId],
    }))
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError("")
    try {
      const { miembros, ...autoFields } = editForm
      await updateAuto(editTarget.id, {
        ...autoFields,
        anio: editForm.anio ? Number(editForm.anio) : undefined,
      })
      await saveAutoUsuarios(editTarget.id, miembros)
      setAutos((prev) =>
        prev.map((a) =>
          a.id === editTarget.id
            ? { ...a, ...autoFields, anio: editForm.anio ? Number(editForm.anio) : a.anio }
            : a
        )
      )
      setAutoUsuarios((prev) => {
        const kept = prev.filter((r) => r.autoid !== editTarget.id)
        const added = miembros.map((uid) => ({
          id: crypto.randomUUID(),
          autoid: editTarget.id,
          usuarioid: uid,
        }))
        return [...kept, ...added]
      })
      handleCloseEdit()
      setSuccess("Auto actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el auto")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleToggleActivo(auto) {
    const id = auto.id
    if (toggling.has(id)) return
    const nextActivo = !auto.activo
    setToggling((prev) => new Set([...prev, id]))
    setAutos((prev) => prev.map((a) => a.id === id ? { ...a, activo: nextActivo } : a))
    try {
      await updateAuto(id, { activo: nextActivo })
    } catch (err) {
      setAutos((prev) => prev.map((a) => a.id === id ? { ...a, activo: auto.activo } : a))
      setError(err.message || "No se pudo actualizar el auto")
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await createAuto({ ...form, anio: form.anio ? Number(form.anio) : undefined })
      handleClose()
      setSuccess("Auto creado correctamente.")
      await refresh()
    } catch (err) {
      setError(err.message || "No se pudo crear el auto")
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
          {loading ? "Cargando…" : `${autos.length} auto${autos.length !== 1 ? "s" : ""}`}
        </p>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Crear auto
        </button>
      </div>

      {loading && (
        <div className="skeleton-list">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && autos.length === 0 && (
        <p className="empty-state">Todavía no hay autos creados.</p>
      )}

      {!loading && autos.length > 0 && (
        <ul className="data-list">
          {autos.map((auto, i) => (
            <li key={auto.id ?? `auto-${i}`}>
              <div className="list-item-main">
                <strong>{auto.nombre ?? auto.patente ?? "Auto sin nombre"}</strong>
                <button
                  className={`badge badge-clickable ${auto.activo ? "badge-active" : "badge-inactive"}`}
                  onClick={() => handleToggleActivo(auto)}
                  disabled={toggling.has(auto.id)}
                  title={auto.activo ? "Marcar inactivo" : "Marcar activo"}
                >
                  {toggling.has(auto.id) ? "…" : auto.activo ? "Activo" : "Inactivo"}
                </button>
                <button className="btn-icon" onClick={() => handleOpenEdit(auto)} title="Editar" aria-label="Editar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>
              </div>
              <span className="list-item-sub">
                {[auto.marca, auto.modelo, auto.patente, auto.anio].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal title="Editar auto" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <label>
            <span>Alias</span>
            <input type="text" name="nombre" value={editForm.nombre} onChange={handleEditChange} required autoComplete="off" />
          </label>

          <label>
            <span>Patente</span>
            <input type="text" name="patente" value={editForm.patente} onChange={handleEditChange} required autoComplete="off" />
          </label>

          <div className="split-fields">
            <label>
              <span>Marca</span>
              <input type="text" name="marca" value={editForm.marca} onChange={handleEditChange} required autoComplete="off" />
            </label>
            <label>
              <span>Modelo</span>
              <input type="text" name="modelo" value={editForm.modelo} onChange={handleEditChange} required autoComplete="off" />
            </label>
          </div>

          <label>
            <span>Año <span className="field-optional">(opcional)</span></span>
            <input type="number" name="anio" min="1900" max="2100" value={editForm.anio} onChange={handleEditChange} />
          </label>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-h)" }}>
              Miembros <span className="field-optional">(quiénes usan este auto)</span>
            </p>
            {usuarios.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
                No hay usuarios activos.
              </p>
            ) : (
              <ul className="participant-list">
                {usuarios.map((u) => (
                  <li key={u.id}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.miembros.includes(u.id)}
                        onChange={() => toggleEditMiembro(u.id)}
                      />
                      {u.nombre ?? u.email ?? u.id}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </Modal>

      <Modal title="Crear auto" open={modalOpen} onClose={handleClose}>
        <form className="form-card" onSubmit={handleSubmit}>
          {error && (
            <p className="feedback-banner feedback-error" role="alert">{error}</p>
          )}

          <label>
            <span>Alias</span>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Auto familiar"
              required
              autoComplete="off"
            />
          </label>

          <label>
            <span>Patente</span>
            <input
              type="text"
              name="patente"
              value={form.patente}
              onChange={handleChange}
              placeholder="ABCD12"
              required
              autoComplete="off"
            />
          </label>

          <div className="split-fields">
            <label>
              <span>Marca</span>
              <input
                type="text"
                name="marca"
                value={form.marca}
                onChange={handleChange}
                placeholder="Toyota"
                required
                autoComplete="off"
              />
            </label>
            <label>
              <span>Modelo</span>
              <input
                type="text"
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                placeholder="Corolla"
                required
                autoComplete="off"
              />
            </label>
          </div>

          <label>
            <span>Año <span className="field-optional">(opcional)</span></span>
            <input
              type="number"
              name="anio"
              min="1900"
              max="2100"
              value={form.anio}
              onChange={handleChange}
              placeholder="2024"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear auto"}
          </button>
        </form>
      </Modal>
    </section>
  )
}
