import { useEffect, useMemo, useState } from "react"
import {
  createViaje, getViajes, getBootstrap, updateViaje,
  getParticipantes, saveParticipantes,
} from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"
import { useCurrentUserId } from "../hooks/useCurrentUser"
import Modal from "../components/Modal"

const EMPTY_FORM = { auto: "", participantes: [], kminicio: "", kmfin: "" }

export default function ViajesPage() {
  const currentUserId = useCurrentUserId()
  const [viajes, setViajes] = useState([])
  const [autos, setAutos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [autoUsuarios, setAutoUsuarios] = useState([])
  const [participantes, setParticipantes] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [createStep, setCreateStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
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
        setViajes(normalizeCollection(data?.viajes))
        setAutos(normalizeCollection(data?.autos).filter((a) => a.activo !== false))
        setUsuarios(normalizeCollection(data?.usuarios).filter((u) => u.activo !== false))
        setAutoUsuarios(normalizeCollection(data?.autousuarios))
        setParticipantes(normalizeCollection(data?.participantes))
      } catch (err) {
        if (cancelled) return
        setError(err.message || "No se pudieron cargar los viajes")
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
      const [viajesData, participantesData] = await Promise.all([getViajes(), getParticipantes()])
      setViajes(normalizeCollection(viajesData))
      setParticipantes(normalizeCollection(participantesData))
    } catch (err) {
      setError(err.message || "No se pudieron cargar los viajes")
    } finally {
      setLoading(false)
    }
  }

  const autosById = useMemo(() => new Map(autos.map((a) => [a.id, a])), [autos])
  const usuariosById = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios])
  const participantesByViaje = useMemo(() => {
    const map = new Map()
    for (const p of participantes) {
      const list = map.get(p.viajeid)
      if (list) list.push(p)
      else map.set(p.viajeid, [p])
    }
    return map
  }, [participantes])

  // autoid -> [usuarioid] (relación M:N auto↔usuario)
  const miembrosByAuto = useMemo(() => {
    const map = new Map()
    for (const r of autoUsuarios) {
      const list = map.get(r.autoid)
      if (list) list.push(r.usuarioid)
      else map.set(r.autoid, [r.usuarioid])
    }
    return map
  }, [autoUsuarios])

  // Autos visibles al crear: si hay usuario actual, solo los suyos
  const autosVisibles = useMemo(() => {
    if (!currentUserId) return autos
    const mine = autos.filter((a) => (miembrosByAuto.get(a.id) ?? []).includes(currentUserId))
    return mine.length > 0 ? mine : autos
  }, [autos, currentUserId, miembrosByAuto])

  // Usuarios disponibles como participantes: miembros del auto elegido (o todos)
  function usuariosParaAuto(autoId) {
    const ids = miembrosByAuto.get(autoId)
    if (!ids || ids.length === 0) return usuarios
    const set = new Set(ids)
    return usuarios.filter((u) => set.has(u.id))
  }

  function autoLabel(a) {
    return [a.nombre, a.patente].filter(Boolean).join(" · ")
  }

  function autoNombre(autoId) {
    const a = autosById.get(autoId)
    return a ? autoLabel(a) : autoId
  }

  function usuarioNombre(userId) {
    const u = usuariosById.get(userId)
    return u ? (u.nombre ?? u.email ?? userId) : userId
  }

  function viajeParticipantesNombres(viaje) {
    return (participantesByViaje.get(viaje.id) ?? []).map((p) => usuarioNombre(p.usuarioid))
  }

  function lastKmForAuto(autoId) {
    const kms = viajes
      .filter((v) => v.auto === autoId)
      .flatMap((v) => [v.kmfin, v.kminicio])
      .filter((k) => k != null)
    return kms.length > 0 ? Math.max(...kms) : null
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleAutoSelect(autoId) {
    const lastKm = lastKmForAuto(autoId)
    const allowed = new Set(usuariosParaAuto(autoId).map((u) => u.id))
    setForm((prev) => ({
      ...prev,
      auto: autoId,
      kminicio: lastKm != null ? String(lastKm) : prev.kminicio,
      participantes: prev.participantes.filter((id) => allowed.has(id)),
    }))
  }

  function handleEditAutoSelect(autoId) {
    setEditForm((prev) => ({ ...prev, auto: autoId }))
  }

  function toggleParticipante(userId) {
    setForm((prev) => ({
      ...prev,
      participantes: prev.participantes.includes(userId)
        ? prev.participantes.filter((id) => id !== userId)
        : [...prev.participantes, userId],
    }))
  }

  function toggleEditParticipante(userId) {
    setEditForm((prev) => ({
      ...prev,
      participantes: prev.participantes.includes(userId)
        ? prev.participantes.filter((id) => id !== userId)
        : [...prev.participantes, userId],
    }))
  }

  function handleOpenCreate() {
    const preAuto = autosVisibles.length === 1 ? autosVisibles[0].id : ""
    const preParticipantes = currentUserId ? [currentUserId] : []
    setForm({
      ...EMPTY_FORM,
      auto: preAuto,
      participantes: preParticipantes,
      kminicio: preAuto ? (lastKmForAuto(preAuto) ?? "") + "" : "",
    })
    setCreateStep(1)
    setError("")
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setCreateStep(1)
    setForm(EMPTY_FORM)
    setError("")
  }

  function handleOpenEdit(viaje) {
    const viajeParticipantes = participantes
      .filter((p) => p.viajeid === viaje.id)
      .map((p) => p.usuarioid)
    setEditTarget(viaje)
    setEditForm({
      auto: viaje.auto ?? "",
      participantes: viajeParticipantes,
      kminicio: viaje.kminicio != null ? String(viaje.kminicio) : "",
      kmfin: viaje.kmfin != null ? String(viaje.kmfin) : "",
    })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    setEditForm(EMPTY_FORM)
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
      await updateViaje(editTarget.id, {
        auto: editForm.auto,
        kminicio: editForm.kminicio ? Number(editForm.kminicio) : undefined,
        kmfin: editForm.kmfin ? Number(editForm.kmfin) : undefined,
      })
      await saveParticipantes(editTarget.id, editForm.participantes)

      setViajes((prev) =>
        prev.map((v) =>
          v.id === editTarget.id
            ? {
                ...v,
                auto: editForm.auto,
                kminicio: editForm.kminicio ? Number(editForm.kminicio) : v.kminicio,
                kmfin: editForm.kmfin ? Number(editForm.kmfin) : v.kmfin,
              }
            : v
        )
      )
      setParticipantes((prev) => {
        const kept = prev.filter((p) => p.viajeid !== editTarget.id)
        const added = editForm.participantes.map((uid) => ({
          id: crypto.randomUUID(),
          viajeid: editTarget.id,
          usuarioid: uid,
        }))
        return [...kept, ...added]
      })

      handleCloseEdit()
      setSuccess("Viaje actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el viaje")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const viaje = await createViaje({
        auto: form.auto,
        kminicio: form.kminicio ? Number(form.kminicio) : undefined,
        kmfin: form.kmfin ? Number(form.kmfin) : undefined,
      })
      await saveParticipantes(viaje.id, form.participantes)
      handleClose()
      setSuccess("Viaje registrado correctamente.")
      await refresh()
    } catch (err) {
      setError(err.message || "No se pudo registrar el viaje")
    } finally {
      setSaving(false)
    }
  }

  function kmRecorridos(viaje) {
    if (viaje.kminicio != null && viaje.kmfin != null) {
      return `${viaje.kmfin - viaje.kminicio} km`
    }
    return null
  }

  function AutoCards({ selected, onSelect, options = autos }) {
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

  return (
    <section>
      {success && (
        <p className="feedback-banner feedback-success" aria-live="polite" style={{ marginBottom: 16 }}>
          {success}
        </p>
      )}

      <div className="section-header">
        <p className="section-count">
          {loading ? "Cargando…" : `${viajes.length} viaje${viajes.length !== 1 ? "s" : ""}`}
        </p>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          + Registrar viaje
        </button>
      </div>

      {loading && (
        <div className="skeleton-list">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && viajes.length === 0 && (
        <p className="empty-state">Todavía no hay viajes registrados.</p>
      )}

      {!loading && viajes.length > 0 && (
        <ul className="data-list">
          {viajes.map((viaje, i) => {
            const nombres = viajeParticipantesNombres(viaje)
            return (
              <li key={viaje.id ?? `viaje-${i}`}>
                <div className="list-item-main">
                  <strong>{autoNombre(viaje.auto)}</strong>
                  {kmRecorridos(viaje) && (
                    <span className="badge badge-active">{kmRecorridos(viaje)}</span>
                  )}
                  <button className="btn-icon" onClick={() => handleOpenEdit(viaje)} title="Editar" aria-label="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                  </button>
                </div>
                <span className="list-item-sub">
                  {[
                    nombres.length > 0 ? nombres.join(", ") : null,
                    viaje.kminicio != null ? `KM ini: ${viaje.kminicio}` : null,
                    viaje.kmfin != null ? `KM fin: ${viaje.kmfin}` : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Create — Step 1: Auto */}
      <Modal
        title={createStep === 1 ? "Registrar viaje — Auto" : "Registrar viaje — Participantes"}
        open={modalOpen}
        onClose={handleClose}
      >
        {createStep === 1 ? (
          <div className="form-card">
            <div>
              <p className="auto-cards-label">Auto</p>
              <AutoCards selected={form.auto} onSelect={handleAutoSelect} options={autosVisibles} />
            </div>

            <div className="split-fields">
              <label>
                <span>KM inicial</span>
                <input
                  type="number"
                  name="kminicio"
                  min="0"
                  value={form.kminicio}
                  onChange={handleChange}
                  placeholder="12500"
                  required
                />
              </label>
              <label>
                <span>KM final <span className="field-optional">(opcional)</span></span>
                <input
                  type="number"
                  name="kmfin"
                  min="0"
                  value={form.kmfin}
                  onChange={handleChange}
                  placeholder="12650"
                />
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setCreateStep(2)}
              disabled={!form.auto}
            >
              Continuar →
            </button>
          </div>
        ) : (
          /* Create — Step 2: Participantes */
          <form className="form-card" onSubmit={handleSubmit}>
            {error && (
              <p className="feedback-banner feedback-error" role="alert">{error}</p>
            )}

            <p className="auto-cards-label" style={{ marginTop: 0 }}>
              Participantes de {autoNombre(form.auto)}
            </p>
            {usuariosParaAuto(form.auto).length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
                No hay usuarios activos registrados.
              </p>
            ) : (
              <ul className="participant-list">
                {usuariosParaAuto(form.auto).map((u) => (
                  <li key={u.id}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.participantes.includes(u.id)}
                        onChange={() => toggleParticipante(u.id)}
                      />
                      {u.nombre ?? u.email ?? u.id}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(1)}>
                ← Atrás
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !form.auto}
                style={{ flex: 1 }}
              >
                {saving ? "Guardando…" : "Registrar viaje"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal title="Editar viaje" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <div>
            <p className="auto-cards-label">Auto</p>
            <AutoCards selected={editForm.auto} onSelect={handleEditAutoSelect} />
          </div>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-h)" }}>
              Participantes
            </p>
            <ul className="participant-list">
              {usuarios.map((u) => (
                <li key={u.id}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editForm.participantes.includes(u.id)}
                      onChange={() => toggleEditParticipante(u.id)}
                    />
                    {u.nombre ?? u.email ?? u.id}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="split-fields">
            <label>
              <span>KM inicial</span>
              <input type="number" name="kminicio" min="0" value={editForm.kminicio} onChange={handleEditChange} required />
            </label>
            <label>
              <span>KM final <span className="field-optional">(opcional)</span></span>
              <input type="number" name="kmfin" min="0" value={editForm.kmfin} onChange={handleEditChange} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={editSaving || !editForm.auto}>
            {editSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </Modal>
    </section>
  )
}
