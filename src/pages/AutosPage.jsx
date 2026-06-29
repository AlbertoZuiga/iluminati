import { useEffect, useState } from "react"
import { createAuto, getAutos } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import Modal from "../components/Modal"

const INITIAL_FORM = { nombre: "", patente: "", marca: "", modelo: "", anio: "" }

export default function AutosPage() {
  const [autos, setAutos] = useState([])
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
        const data = await getAutos()
        if (cancelled) return
        setAutos(normalizeCollection(data))
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
                <span className={`badge ${auto.activo ? "badge-active" : "badge-inactive"}`}>
                  {auto.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <span className="list-item-sub">
                {[auto.marca, auto.modelo, auto.patente, auto.anio].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}

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
