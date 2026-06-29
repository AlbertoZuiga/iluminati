import { useEffect, useState } from "react"
import { createAuto, getAutos } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"

const INITIAL_FORM = { nombre: "", patente: "", marca: "", modelo: "", anio: "" }

export default function AutosPage() {
  const [autos, setAutos] = useState([])
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

    async function loadAutos() {
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

    loadAutos()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshAutos() {
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
      await createAuto({
        ...form,
        anio: form.anio ? Number(form.anio) : undefined,
      })
      setForm(INITIAL_FORM)
      setSuccess("Auto creado correctamente.")
      await refreshAutos()
    } catch (err) {
      setError(err.message || "No se pudo crear el auto")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-grid">
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <h2>Crear auto</h2>
          <p>Completa los datos básicos del vehículo.</p>
        </div>

        {error && (
          <p className="feedback-banner feedback-error" role="alert">{error}</p>
        )}
        {success && (
          <p className="feedback-banner feedback-success" aria-live="polite">{success}</p>
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

        <button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Crear auto"}
        </button>
      </form>

      <article className="card list-card">
        <div className="card-header">
          <h2>Autos registrados</h2>
          <p>{loading ? "Cargando…" : `${autos.length} auto${autos.length !== 1 ? "s" : ""}`}</p>
        </div>

        {loading && <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}

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
      </article>
    </section>
  )
}
