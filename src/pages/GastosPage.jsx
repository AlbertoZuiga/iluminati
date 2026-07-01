import { useEffect, useMemo, useState } from "react"
import {
  createGasto, getGastos, getBootstrap, updateGasto,
} from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import { useCurrentUserId } from "../hooks/useCurrentUser"
import { useAutosVisibles } from "../hooks/useAutosVisibles"
import Modal from "../components/Modal"

const TIPOS = ["Bencina", "Peaje", "Mantención", "Seguro", "Otro"]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return { auto: "", fecha: today(), tipo: TIPOS[0], monto: "", pagadopor: "" }
}

function AutoCards({ selected, onSelect, options }) {
  if (options.length === 0) {
    return <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>No hay autos activos.</p>
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

function GastoFields({ values, onChange, onSelectAuto, autoOptions, usuarios }) {
  return (
    <>
      <div>
        <p className="auto-cards-label">Auto</p>
        <AutoCards selected={values.auto} onSelect={onSelectAuto} options={autoOptions} />
      </div>

      <div className="split-fields">
        <label>
          <span>Fecha</span>
          <input type="date" name="fecha" value={values.fecha} onChange={onChange} required />
        </label>
        <label>
          <span>Tipo</span>
          <select name="tipo" value={values.tipo} onChange={onChange} required>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <div className="split-fields">
        <label>
          <span>Monto</span>
          <input
            type="number"
            name="monto"
            min="0"
            step="1"
            value={values.monto}
            onChange={onChange}
            placeholder="25000"
            required
          />
        </label>
        <label>
          <span>Pagado por</span>
          <select name="pagadopor" value={values.pagadopor} onChange={onChange} required>
            <option value="">Selecciona…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre ?? u.email ?? u.id}</option>
            ))}
          </select>
        </label>
      </div>
    </>
  )
}

export default function GastosPage() {
  const currentUserId = useCurrentUserId()
  const [gastos, setGastos] = useState([])
  const [autos, setAutos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [autoUsuarios, setAutoUsuarios] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(""), 3000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getBootstrap()
        if (cancelled) return
        setGastos(normalizeCollection(data?.gastos))
        setAutos(normalizeCollection(data?.autos).filter((a) => a.activo !== false))
        setUsuarios(normalizeCollection(data?.usuarios).filter((u) => u.activo !== false))
        setAutoUsuarios(normalizeCollection(data?.autousuarios))
      } catch (err) {
        if (cancelled) return
        setError(err.message || "No se pudieron cargar los gastos")
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
      const data = await getGastos()
      setGastos(normalizeCollection(data))
    } catch (err) {
      setError(err.message || "No se pudieron cargar los gastos")
    } finally {
      setLoading(false)
    }
  }

  const autosById = useMemo(() => new Map(autos.map((a) => [a.id, a])), [autos])
  const usuariosById = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios])

  const { autosVisibles, usuariosParaAuto: usuariosDeAutoBase } = useAutosVisibles(
    autos, autoUsuarios, currentUserId
  )

  const gastosVisibles = useMemo(() => {
    const ids = new Set(autosVisibles.map((a) => a.id))
    return gastos.filter((g) => ids.has(g.auto))
  }, [gastos, autosVisibles])

  const editAutoOptions = useMemo(() => {
    if (autosVisibles.some((a) => a.id === editForm.auto)) return autosVisibles
    const current = autosById.get(editForm.auto)
    return current ? [...autosVisibles, current] : autosVisibles
  }, [autosVisibles, editForm.auto, autosById])

  function autoLabel(a) {
    return [a.nombre, a.patente].filter(Boolean).join(" · ")
  }

  function autoNombre(autoId) {
    const a = autosById.get(autoId)
    return a ? autoLabel(a) : autoId
  }

  function usuariosDeAuto(autoId) {
    return usuariosDeAutoBase(usuarios, autoId)
  }

  function usuarioNombre(userId) {
    const u = usuariosById.get(userId)
    return u ? (u.nombre ?? u.email ?? userId) : userId
  }

  function formatMonto(monto) {
    if (monto == null || monto === "") return null
    const n = Number(monto)
    return isNaN(n) ? String(monto) : `$${n.toLocaleString("es-CL")}`
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleOpenCreate() {
    const preAuto = autosVisibles.length === 1 ? autosVisibles[0].id : ""
    const prePagadoPor = usuariosDeAuto(preAuto).some((u) => u.id === currentUserId)
      ? currentUserId
      : ""
    setForm({
      ...emptyForm(),
      auto: preAuto,
      pagadopor: prePagadoPor,
    })
    setError("")
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setForm(emptyForm())
    setError("")
  }

  function handleOpenEdit(gasto) {
    setEditTarget(gasto)
    setEditForm({
      auto: gasto.auto ?? "",
      fecha: gasto.fecha ? String(gasto.fecha).slice(0, 10) : today(),
      tipo: gasto.tipo ?? TIPOS[0],
      monto: gasto.monto != null ? String(gasto.monto) : "",
      pagadopor: gasto.pagadopor ?? "",
    })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    setEditForm(emptyForm())
    setEditError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await createGasto({
        auto: form.auto,
        fecha: form.fecha,
        tipo: form.tipo,
        monto: form.monto ? Number(form.monto) : undefined,
        pagadopor: form.pagadopor,
      })
      handleClose()
      setSuccess("Gasto registrado correctamente.")
      await refresh()
    } catch (err) {
      setError(err.message || "No se pudo registrar el gasto")
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError("")
    try {
      await updateGasto(editTarget.id, {
        auto: editForm.auto,
        fecha: editForm.fecha,
        tipo: editForm.tipo,
        monto: editForm.monto ? Number(editForm.monto) : undefined,
        pagadopor: editForm.pagadopor,
      })
      setGastos((prev) =>
        prev.map((g) =>
          g.id === editTarget.id
            ? {
                ...g,
                auto: editForm.auto,
                fecha: editForm.fecha,
                tipo: editForm.tipo,
                monto: editForm.monto ? Number(editForm.monto) : g.monto,
                pagadopor: editForm.pagadopor,
              }
            : g
        )
      )
      handleCloseEdit()
      setSuccess("Gasto actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el gasto")
    } finally {
      setEditSaving(false)
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
          {loading ? "Cargando…" : `${gastosVisibles.length} gasto${gastosVisibles.length !== 1 ? "s" : ""}`}
        </p>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          + Registrar gasto
        </button>
      </div>

      {loading && (
        <div className="skeleton-list">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && gastosVisibles.length === 0 && (
        <p className="empty-state">Todavía no hay gastos registrados.</p>
      )}

      {!loading && gastosVisibles.length > 0 && (
        <ul className="data-list">
          {gastosVisibles.map((gasto, i) => (
            <li key={gasto.id ?? `gasto-${i}`}>
              <div className="list-item-main">
                <strong>{autoNombre(gasto.auto)}</strong>
                {formatMonto(gasto.monto) && (
                  <span className="badge badge-active">{formatMonto(gasto.monto)}</span>
                )}
                <button className="btn-icon" onClick={() => handleOpenEdit(gasto)} title="Editar" aria-label="Editar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>
              </div>
              <span className="list-item-sub">
                {[
                  gasto.tipo,
                  gasto.fecha ? String(gasto.fecha).slice(0, 10) : null,
                  gasto.pagadopor ? `Pagó: ${usuarioNombre(gasto.pagadopor)}` : null,
                ].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Create */}
      <Modal title="Registrar gasto" open={modalOpen} onClose={handleClose}>
        <form className="form-card" onSubmit={handleSubmit}>
          {error && (
            <p className="feedback-banner feedback-error" role="alert">{error}</p>
          )}

          <GastoFields
            values={form}
            onChange={handleChange}
            onSelectAuto={(id) => setForm((prev) => ({ ...prev, auto: id, pagadopor: "" }))}
            autoOptions={autosVisibles}
            usuarios={usuariosDeAuto(form.auto)}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !form.auto || !form.pagadopor}
          >
            {saving ? "Guardando…" : "Registrar gasto"}
          </button>
        </form>
      </Modal>

      {/* Edit */}
      <Modal title="Editar gasto" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <GastoFields
            values={editForm}
            onChange={handleEditChange}
            onSelectAuto={(id) => setEditForm((prev) => ({ ...prev, auto: id, pagadopor: "" }))}
            autoOptions={editAutoOptions}
            usuarios={usuariosDeAuto(editForm.auto)}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={editSaving || !editForm.auto || !editForm.pagadopor}
          >
            {editSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </Modal>
    </section>
  )
}
