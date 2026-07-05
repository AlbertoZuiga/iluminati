import { useEffect, useMemo, useState } from "react"
import { createViaje, updateViaje, saveParticipantes } from "../services/api"
import { useCurrentUserId } from "../hooks/useCurrentUser"
import { useAutosVisibles } from "../hooks/useAutosVisibles"
import { useData } from "../context/DataContext"
import Modal from "../components/Modal"
import AutoCards from "../components/AutoCards"
import EditButton from "../components/EditButton"

const EMPTY_FORM = { auto: "", participantes: [], kminicio: "", kmfin: "" }

export default function ViajesPage() {
  const currentUserId = useCurrentUserId()
  const {
    viajes, setViajes,
    autos: autosRaw,
    usuarios: usuariosRaw,
    autoUsuarios,
    participantes, setParticipantes,
    loading,
    reload,
  } = useData()
  const autos = useMemo(() => autosRaw.filter((a) => a.activo !== false), [autosRaw])
  const usuarios = useMemo(() => usuariosRaw.filter((u) => u.activo !== false), [usuariosRaw])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [pendientesOpen, setPendientesOpen] = useState(false)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(""), 3000)
    return () => clearTimeout(t)
  }, [success])

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

  const { autosVisibles, usuariosParaAuto: usuariosParaAutoBase } = useAutosVisibles(
    autos, autoUsuarios, currentUserId
  )

  // Usuarios disponibles como participantes: miembros del auto elegido (o todos)
  function usuariosParaAuto(autoId) {
    return usuariosParaAutoBase(usuarios, autoId)
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

  const viajesOrdenados = useMemo(() => {
    return [...viajes].sort((a, b) => {
      const da = a.createdat ? new Date(a.createdat).getTime() : 0
      const db = b.createdat ? new Date(b.createdat).getTime() : 0
      return db - da
    })
  }, [viajes])

  // Huecos de KM y viajes abiertos, calculados por auto visible
  const pendientes = useMemo(() => {
    const gaps = []
    let abiertos = 0
    for (const auto of autosVisibles) {
      const viajesAuto = viajes
        .filter((v) => v.auto === auto.id && v.kminicio != null)
        .sort((a, b) => a.kminicio - b.kminicio)

      let maxKmFin = null
      for (let i = 0; i < viajesAuto.length; i++) {
        const v = viajesAuto[i]
        if (v.kmfin == null) abiertos++
        else if (maxKmFin == null || v.kmfin > maxKmFin) maxKmFin = v.kmfin

        const next = viajesAuto[i + 1]
        if (v.kmfin != null && next && next.kminicio != null && v.kmfin < next.kminicio) {
          gaps.push({
            auto: auto.id,
            kminicio: v.kmfin,
            kmfin: next.kminicio,
            km: next.kminicio - v.kmfin,
          })
        }
      }

      if (auto.kmactual != null && maxKmFin != null && auto.kmactual > maxKmFin) {
        gaps.push({
          auto: auto.id,
          kminicio: maxKmFin,
          kmfin: auto.kmactual,
          km: auto.kmactual - maxKmFin,
        })
      }
    }
    return { gaps, abiertos, totalKm: gaps.reduce((sum, g) => sum + g.km, 0) }
  }, [viajes, autosVisibles])

  function lastKmForAuto(autoId) {
    const kms = viajes
      .filter((v) => v.auto === autoId)
      .flatMap((v) => [v.kmfin, v.kminicio])
      .filter((k) => k != null)
    return kms.length > 0 ? Math.max(...kms) : null
  }

  function referenceKmForAuto(autoId) {
    const auto = autosById.get(autoId)
    if (auto?.kmactual != null) return auto.kmactual
    return lastKmForAuto(autoId)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleAutoSelect(autoId) {
    const refKm = referenceKmForAuto(autoId)
    const allowed = new Set(usuariosParaAuto(autoId).map((u) => u.id))
    setForm((prev) => ({
      ...prev,
      auto: autoId,
      kminicio: refKm != null ? String(refKm) : "",
      participantes: prev.participantes.filter((id) => allowed.has(id)),
    }))
  }

  function handleEditAutoSelect(autoId) {
    setEditForm((prev) => ({ ...prev, auto: autoId }))
  }

  // Miembros del auto en edición + participantes existentes que ya no son miembros (para no perderlos)
  function editUsuariosDisponibles() {
    const base = usuariosParaAuto(editForm.auto)
    const baseIds = new Set(base.map((u) => u.id))
    const extras = editForm.participantes
      .filter((id) => !baseIds.has(id))
      .map((id) => usuariosById.get(id))
      .filter(Boolean)
    return [...base, ...extras]
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

  function handleOpenCreate(prefill) {
    const preAuto = prefill?.auto ?? (autosVisibles.length === 1 ? autosVisibles[0].id : "")
    const preParticipantes = currentUserId ? [currentUserId] : []
    setForm({
      ...EMPTY_FORM,
      auto: preAuto,
      participantes: preParticipantes,
      kminicio: prefill?.kminicio != null
        ? String(prefill.kminicio)
        : preAuto ? (referenceKmForAuto(preAuto) ?? "") + "" : "",
      kmfin: prefill?.kmfin != null ? String(prefill.kmfin) : "",
    })
    setError("")
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setError("")
  }

  function handleOpenGap(gap) {
    handleOpenCreate({ auto: gap.auto, kminicio: gap.kminicio, kmfin: gap.kmfin })
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
    setEditError("")
    if (editForm.kmfin && Number(editForm.kmfin) <= Number(editForm.kminicio)) {
      setEditError("El KM final debe ser mayor que el KM inicial.")
      return
    }
    setEditSaving(true)
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
    setError("")
    if (form.kmfin && Number(form.kmfin) <= Number(form.kminicio)) {
      setError("El KM final debe ser mayor que el KM inicial.")
      return
    }
    setSaving(true)
    try {
      const created = await createViaje({
        auto: form.auto,
        kminicio: form.kminicio ? Number(form.kminicio) : undefined,
        kmfin: form.kmfin ? Number(form.kmfin) : undefined,
        participantes: form.participantes.join(","),
      })
      handleClose()
      setSuccess("Viaje registrado correctamente.")
      setViajes((prev) => [...prev, {
        id: created.id,
        auto: created.auto,
        kminicio: created.kminicio,
        kmfin: created.kmfin,
        createdat: created.createdat,
      }])
      setParticipantes((prev) => [
        ...prev,
        ...(created.participantes ?? []).map((usuarioid) => ({
          id: crypto.randomUUID(),
          viajeid: created.id,
          usuarioid,
        })),
      ])
      reload()
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

  const formRefKm = form.auto ? referenceKmForAuto(form.auto) : null
  const formKminicioNum = form.kminicio !== "" ? Number(form.kminicio) : null
  const formGapKm = formRefKm != null && formKminicioNum != null && formKminicioNum > formRefKm
    ? formKminicioNum - formRefKm
    : null

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
        <button className="btn btn-primary" onClick={() => handleOpenCreate()}>
          + Registrar viaje
        </button>
      </div>

      {!loading && (pendientes.gaps.length > 0 || pendientes.abiertos > 0) && (
        <div
          className="feedback-banner"
          style={{ background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", marginBottom: 16 }}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, cursor: pendientes.gaps.length > 0 ? "pointer" : "default" }}
            onClick={() => pendientes.gaps.length > 0 && setPendientesOpen((v) => !v)}
          >
            <span>
              ⚠ {pendientes.gaps.length} tramo{pendientes.gaps.length !== 1 ? "s" : ""} sin registrar
              {pendientes.totalKm > 0 ? ` (${pendientes.totalKm.toLocaleString("es-CL")} km)` : ""}
              {pendientes.abiertos > 0
                ? ` · ${pendientes.abiertos} viaje${pendientes.abiertos !== 1 ? "s" : ""} sin km final`
                : ""}
            </span>
            {pendientes.gaps.length > 0 && <span>{pendientesOpen ? "▲" : "▼"}</span>}
          </div>
          {pendientesOpen && pendientes.gaps.length > 0 && (
            <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {pendientes.gaps.map((gap, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: "100%", textAlign: "left", color: "#9a3412", borderColor: "#fdba74" }}
                    onClick={() => handleOpenGap(gap)}
                  >
                    {autoNombre(gap.auto)}: {gap.kminicio.toLocaleString("es-CL")} → {gap.kmfin.toLocaleString("es-CL")} km
                    {" "}({gap.km.toLocaleString("es-CL")} km sin registrar)
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
          {viajesOrdenados.map((viaje, i) => {
            const nombres = viajeParticipantesNombres(viaje)
            return (
              <li key={viaje.id ?? `viaje-${i}`}>
                <div className="list-item-main">
                  <strong>{autoNombre(viaje.auto)}</strong>
                  {kmRecorridos(viaje) && (
                    <span className="badge badge-active">{kmRecorridos(viaje)}</span>
                  )}
                  <EditButton onClick={() => handleOpenEdit(viaje)} />
                </div>
                <span className="list-item-sub">
                  {[
                    nombres.length > 0 ? nombres.join(", ") : null,
                    viaje.kminicio != null ? `KM ini: ${viaje.kminicio}` : null,
                    viaje.kmfin != null ? `KM fin: ${viaje.kmfin}` : null,
                    viaje.createdat ? new Date(viaje.createdat).toLocaleDateString("es-CL") : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Create Modal */}
      <Modal title="Registrar viaje" open={modalOpen} onClose={handleClose}>
        <form className="form-card" onSubmit={handleSubmit}>
          {error && (
            <p className="feedback-banner feedback-error" role="alert">{error}</p>
          )}

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

          {formGapKm != null && (
            <p
              style={{
                margin: 0, fontSize: 13, background: "#fff7ed",
                border: "1px solid #fdba74", color: "#9a3412",
                borderRadius: 8, padding: "8px 12px",
              }}
            >
              Últimos km registrados: {formRefKm.toLocaleString("es-CL")} · quedarán{" "}
              {formGapKm.toLocaleString("es-CL")} km sin registrar
            </p>
          )}

          <div>
            <p className="auto-cards-label" style={{ marginTop: 0 }}>
              Participantes {form.auto ? `de ${autoNombre(form.auto)}` : ""}
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
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !form.auto}
          >
            {saving ? "Guardando…" : "Registrar viaje"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Editar viaje" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <div>
            <p className="auto-cards-label">Auto</p>
            <AutoCards selected={editForm.auto} onSelect={handleEditAutoSelect} options={autos} />
          </div>

          <div>
            <p className="subsection-title">
              Participantes
            </p>
            <ul className="participant-list">
              {editUsuariosDisponibles().map((u) => (
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
