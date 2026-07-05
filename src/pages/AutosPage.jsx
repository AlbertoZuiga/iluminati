import { useEffect, useState } from "react"
import {
  createAuto, getAutos, updateAuto,
  getUsuarios, getAutoUsuarios, saveAutoUsuarios,
} from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import Modal from "../components/Modal"

const INITIAL_FORM = { nombre: "", patente: "", marca: "", modelo: "", anio: "", tienebono: false, kmactual: "" }
const INITIAL_EDIT_FORM = { ...INITIAL_FORM, miembros: [] }

function toBool(v) {
  return v === true || v === "true" || v === 1 || v === "1"
}

function nuevoMiembro(usuarioid) {
  return { usuarioid, dividegastos: true, recibebono: false, pagaestanque: false }
}

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
      .map((r) => ({
        usuarioid: r.usuarioid,
        dividegastos: toBool(r.dividegastos),
        recibebono: toBool(r.recibebono),
        pagaestanque: toBool(r.pagaestanque),
      }))
    setEditTarget(auto)
    setEditForm({
      nombre: auto.nombre ?? "",
      patente: auto.patente ?? "",
      marca: auto.marca ?? "",
      modelo: auto.modelo ?? "",
      anio: auto.anio != null ? String(auto.anio) : "",
      tienebono: toBool(auto.tienebono),
      kmactual: auto.kmactual != null ? String(auto.kmactual) : "",
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
      miembros: prev.miembros.some((m) => m.usuarioid === userId)
        ? prev.miembros.filter((m) => m.usuarioid !== userId)
        : [...prev.miembros, nuevoMiembro(userId)],
    }))
  }

  function setMiembroFlag(userId, flag, value) {
    setEditForm((prev) => ({
      ...prev,
      miembros: prev.miembros.map((m) =>
        m.usuarioid === userId ? { ...m, [flag]: value } : m
      ),
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
        kmactual: editForm.kmactual ? Number(editForm.kmactual) : undefined,
      })
      await saveAutoUsuarios(editTarget.id, miembros)
      setAutos((prev) =>
        prev.map((a) =>
          a.id === editTarget.id
            ? {
                ...a,
                ...autoFields,
                anio: editForm.anio ? Number(editForm.anio) : a.anio,
                kmactual: editForm.kmactual ? Number(editForm.kmactual) : a.kmactual,
              }
            : a
        )
      )
      setAutoUsuarios((prev) => {
        const kept = prev.filter((r) => r.autoid !== editTarget.id)
        const added = miembros.map((m) => ({
          id: crypto.randomUUID(),
          autoid: editTarget.id,
          usuarioid: m.usuarioid,
          dividegastos: m.dividegastos,
          recibebono: m.recibebono,
          pagaestanque: m.pagaestanque,
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
      await createAuto({
        ...form,
        anio: form.anio ? Number(form.anio) : undefined,
        kmactual: form.kmactual ? Number(form.kmactual) : undefined,
      })
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
                {[
                  auto.marca, auto.modelo, auto.patente, auto.anio,
                  auto.kmactual != null ? `${auto.kmactual.toLocaleString("es-CL")} km` : null,
                ].filter(Boolean).join(" · ")}
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

          <div className="split-fields">
            <label>
              <span>Año <span className="field-optional">(opcional)</span></span>
              <input type="number" name="anio" min="1900" max="2100" value={editForm.anio} onChange={handleEditChange} />
            </label>
            <label>
              <span>KM actual <span className="field-optional">(opcional)</span></span>
              <input type="number" name="kmactual" min="0" value={editForm.kmactual} onChange={handleEditChange} />
            </label>
          </div>

          <div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.tienebono}
                onChange={(e) => setEditForm((p) => ({ ...p, tienebono: e.target.checked }))}
              />
              Recibe bono <span className="field-optional">(dador regala su excedente: lo que paga − lo que usa)</span>
            </label>
          </div>

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
                {usuarios.map((u) => {
                  const m = editForm.miembros.find((x) => x.usuarioid === u.id)
                  return (
                    <li key={u.id}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!m}
                          onChange={() => toggleEditMiembro(u.id)}
                        />
                        {u.nombre ?? u.email ?? u.id}
                      </label>
                      {m && (
                        <div style={{ margin: "4px 0 10px 26px", display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13 }}>
                          <label className="checkbox-label">
                            <input type="checkbox" checked={m.dividegastos}
                              onChange={(e) => setMiembroFlag(u.id, "dividegastos", e.target.checked)} />
                            Divide gastos
                          </label>
                          {editForm.tienebono && (
                            <>
                              <label className="checkbox-label">
                                <input type="checkbox" checked={m.recibebono}
                                  onChange={(e) => setMiembroFlag(u.id, "recibebono", e.target.checked)} />
                                Recibe bono
                              </label>
                              <label className="checkbox-label">
                                <input type="checkbox" checked={m.pagaestanque}
                                  onChange={(e) => setMiembroFlag(u.id, "pagaestanque", e.target.checked)} />
                                Paga estanque
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
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

          <div className="split-fields">
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
            <label>
              <span>KM actual <span className="field-optional">(opcional)</span></span>
              <input
                type="number"
                name="kmactual"
                min="0"
                value={form.kmactual}
                onChange={handleChange}
                placeholder="12500"
              />
            </label>
          </div>

          <div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.tienebono}
                onChange={(e) => setForm((p) => ({ ...p, tienebono: e.target.checked }))}
              />
              Recibe bono <span className="field-optional">(dador regala su excedente: lo que paga − lo que usa)</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear auto"}
          </button>
        </form>
      </Modal>
    </section>
  )
}
