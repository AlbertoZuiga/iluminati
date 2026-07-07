import { useMemo, useState } from "react"
import { createViaje, updateViaje, saveParticipantes } from "../services/api"
import { useCurrentUserId } from "../hooks/useCurrentUser"
import { useAutosVisibles } from "../hooks/useAutosVisibles"
import { useViajeForm, EMPTY_VIAJE_FORM, validateViajeForm } from "../hooks/useViajeForm"
import { usePendientesKm } from "../hooks/usePendientesKm"
import useFeedback from "../hooks/useFeedback"
import { useData } from "../context/DataContext"
import ViajeFormModal from "../components/ViajeFormModal"
import FinalizarViajeModal from "../components/FinalizarViajeModal"
import EditButton from "../components/EditButton"

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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const { success, showSuccess } = useFeedback()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [pendientesOpen, setPendientesOpen] = useState(false)
  const [finalizarTarget, setFinalizarTarget] = useState(null)

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

  // Huecos de KM, viajes abiertos y KM de referencia por auto visible
  const pendientes = usePendientesKm(viajes, autosVisibles, autosById)
  const { referenceKmForAuto } = pendientes

  const create = useViajeForm(referenceKmForAuto)
  const edit = useViajeForm(referenceKmForAuto)

  function handleCreateAutoSelect(autoId) {
    const allowed = usuariosParaAuto(autoId).map((u) => u.id)
    create.selectAutoWithPrefill(autoId, allowed)
  }

  // Miembros del auto en edición + participantes existentes que ya no son miembros (para no perderlos)
  function editUsuariosDisponibles() {
    const base = usuariosParaAuto(edit.form.auto)
    const baseIds = new Set(base.map((u) => u.id))
    const extras = edit.form.participantes
      .filter((id) => !baseIds.has(id))
      .map((id) => usuariosById.get(id))
      .filter(Boolean)
    return [...base, ...extras]
  }

  function handleOpenCreate(prefill) {
    const preAuto = prefill?.auto ?? (autosVisibles.length === 1 ? autosVisibles[0].id : "")
    const preParticipantes = currentUserId ? [currentUserId] : []
    create.setForm({
      ...EMPTY_VIAJE_FORM,
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
    create.setForm(EMPTY_VIAJE_FORM)
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
    edit.setForm({
      auto: viaje.auto ?? "",
      participantes: viajeParticipantes,
      kminicio: viaje.kminicio != null ? String(viaje.kminicio) : "",
      kmfin: viaje.kmfin != null ? String(viaje.kmfin) : "",
    })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    edit.setForm(EMPTY_VIAJE_FORM)
    setEditError("")
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditError("")
    const invalid = validateViajeForm(edit.form)
    if (invalid) {
      setEditError(invalid)
      return
    }
    setEditSaving(true)
    try {
      await updateViaje(editTarget.id, {
        auto: edit.form.auto,
        kminicio: edit.form.kminicio ? Number(edit.form.kminicio) : undefined,
        kmfin: edit.form.kmfin ? Number(edit.form.kmfin) : undefined,
      })
      await saveParticipantes(editTarget.id, edit.form.participantes)

      setViajes((prev) =>
        prev.map((v) =>
          v.id === editTarget.id
            ? {
                ...v,
                auto: edit.form.auto,
                kminicio: edit.form.kminicio ? Number(edit.form.kminicio) : v.kminicio,
                kmfin: edit.form.kmfin ? Number(edit.form.kmfin) : v.kmfin,
              }
            : v
        )
      )
      setParticipantes((prev) => {
        const kept = prev.filter((p) => p.viajeid !== editTarget.id)
        const added = edit.form.participantes.map((uid) => ({
          id: crypto.randomUUID(),
          viajeid: editTarget.id,
          usuarioid: uid,
        }))
        return [...kept, ...added]
      })

      handleCloseEdit()
      showSuccess("Viaje actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el viaje")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    const invalid = validateViajeForm(create.form)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    try {
      const created = await createViaje({
        auto: create.form.auto,
        kminicio: create.form.kminicio ? Number(create.form.kminicio) : undefined,
        kmfin: create.form.kmfin ? Number(create.form.kmfin) : undefined,
        participantes: create.form.participantes.join(","),
      })
      handleClose()
      showSuccess("Viaje registrado correctamente.")
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

  async function handleFinalizar(viaje, kmfin) {
    await updateViaje(viaje.id, { kmfin })
    setViajes((prev) => prev.map((v) => (v.id === viaje.id ? { ...v, kmfin } : v)))
    showSuccess("Viaje finalizado.")
    reload()
  }

  function kmRecorridos(viaje) {
    if (viaje.kminicio != null && viaje.kmfin != null) {
      return `${viaje.kmfin - viaje.kminicio} km`
    }
    return null
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
                  {viaje.kmfin == null && (
                    <>
                      <span className="badge badge-warning">En curso</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setFinalizarTarget(viaje)}
                      >
                        Finalizar
                      </button>
                    </>
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

      <ViajeFormModal
        title="Registrar viaje"
        open={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        form={create.form}
        onChange={create.handleChange}
        onSelectAuto={handleCreateAutoSelect}
        onToggleParticipante={create.toggleParticipante}
        autoOptions={autosVisibles}
        participantOptions={usuariosParaAuto(create.form.auto)}
        participantesLabel={`Participantes ${create.form.auto ? `de ${autoNombre(create.form.auto)}` : ""}`}
        gap={create.gap}
        error={error}
        saving={saving}
        submitLabel="Registrar viaje"
      />

      <ViajeFormModal
        title="Editar viaje"
        open={editTarget !== null}
        onClose={handleCloseEdit}
        onSubmit={handleEditSubmit}
        form={edit.form}
        onChange={edit.handleChange}
        onSelectAuto={edit.selectAuto}
        onToggleParticipante={edit.toggleParticipante}
        autoOptions={autos}
        participantOptions={editUsuariosDisponibles()}
        participantesLabel="Participantes"
        gap={null}
        error={editError}
        saving={editSaving}
        submitLabel="Guardar cambios"
      />

      <FinalizarViajeModal
        key={finalizarTarget?.id ?? "none"}
        viaje={finalizarTarget}
        autoNombre={autoNombre}
        onClose={() => setFinalizarTarget(null)}
        onFinalizar={handleFinalizar}
      />
    </section>
  )
}
