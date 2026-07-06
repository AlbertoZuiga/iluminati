import { useEffect, useMemo, useState } from "react"
import { createViaje, updateViaje } from "../services/api"
import { useCurrentUserId } from "../hooks/useCurrentUser"
import { useAutosVisibles } from "../hooks/useAutosVisibles"
import { useViajeForm, EMPTY_VIAJE_FORM, validateViajeForm } from "../hooks/useViajeForm"
import { usePendientesKm } from "../hooks/usePendientesKm"
import { useData } from "../context/DataContext"
import ViajeFormModal from "../components/ViajeFormModal"
import FinalizarViajeModal from "../components/FinalizarViajeModal"

function clp(n) {
  const v = Math.round(Number(n) || 0)
  return `$${v.toLocaleString("es-CL")}`
}

export default function HomePage({ navigate }) {
  const currentUserId = useCurrentUserId()
  const {
    viajes, setViajes,
    autos: autosRaw,
    usuarios: usuariosRaw,
    autoUsuarios,
    participantes, setParticipantes,
    loading,
    reload,
    saldos, saldosError, fetchSaldos,
  } = useData()
  const autos = useMemo(() => autosRaw.filter((a) => a.activo !== false), [autosRaw])
  const usuarios = useMemo(() => usuariosRaw.filter((u) => u.activo !== false), [usuariosRaw])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [finalizarTarget, setFinalizarTarget] = useState(null)

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

  const pendientes = usePendientesKm(viajes, autosVisibles, autosById)
  const { referenceKmForAuto } = pendientes
  const create = useViajeForm(referenceKmForAuto)

  // Viajes abiertos (sin km final) de los autos visibles del usuario
  const abiertosList = useMemo(() => {
    const visibleIds = new Set(autosVisibles.map((a) => a.id))
    return viajes
      .filter((v) => v.kmfin == null && v.kminicio != null && visibleIds.has(v.auto))
      .sort((a, b) => {
        const da = a.createdat ? new Date(a.createdat).getTime() : 0
        const db = b.createdat ? new Date(b.createdat).getTime() : 0
        return db - da
      })
  }, [viajes, autosVisibles])

  // Estado KM por auto visible: km sin registrar (suma de tramos) o al día
  const kmPorAuto = useMemo(() => {
    return autosVisibles.map((a) => {
      const autoGaps = pendientes.gaps.filter((g) => g.auto === a.id)
      const km = autoGaps.reduce((s, g) => s + g.km, 0)
      return { auto: a, km, gap: autoGaps[0] ?? null }
    })
  }, [autosVisibles, pendientes.gaps])

  function handleCreateAutoSelect(autoId) {
    const allowed = usuariosParaAuto(autoId).map((u) => u.id)
    create.selectAutoWithPrefill(autoId, allowed)
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

  async function handleFinalizar(viaje, kmfin) {
    await updateViaje(viaje.id, { kmfin })
    setViajes((prev) => prev.map((v) => (v.id === viaje.id ? { ...v, kmfin } : v)))
    setSuccess("Viaje finalizado.")
    reload()
  }

  // Saldo del periodo abierto: carga diferida vía cache del contexto, no bloquea el render.
  useEffect(() => {
    fetchSaldos().catch(() => {})
  }, [fetchSaldos])

  const miTotal = saldos?.totales?.find((t) => t.usuarioid === currentUserId)
  const neto = miTotal?.neto ?? 0

  function viajeParticipantes(viaje) {
    return (participantesByViaje.get(viaje.id) ?? []).map((p) => usuarioNombre(p.usuarioid))
  }

  return (
    <section className="home-grid">
      {success && (
        <p className="feedback-banner feedback-success" aria-live="polite">{success}</p>
      )}

      {/* ── Viaje en curso / iniciar viaje ── */}
      {abiertosList.length > 0 ? (
        <>
          {abiertosList.map((viaje) => {
            const nombres = viajeParticipantes(viaje)
            return (
              <div key={viaje.id} className="home-card home-card-accent">
                <div className="home-card-head">
                  <p className="home-card-title">Viaje en curso</p>
                  <span className="badge badge-warning">En curso</span>
                </div>
                <div>
                  <p className="home-net" style={{ fontSize: 17 }}>{autoNombre(viaje.auto)}</p>
                  <p className="home-net-sub">
                    {[
                      viaje.kminicio != null ? `KM inicial: ${viaje.kminicio.toLocaleString("es-CL")}` : null,
                      nombres.length > 0 ? nombres.join(", ") : null,
                      viaje.createdat ? new Date(viaje.createdat).toLocaleDateString("es-CL") : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => setFinalizarTarget(viaje)}
                >
                  Finalizar viaje
                </button>
              </div>
            )
          })}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleOpenCreate()}
            style={{ justifySelf: "start" }}
          >
            + Iniciar otro viaje
          </button>
        </>
      ) : (
        <div className="home-card">
          <p className="home-card-title">Viajes</p>
          <button
            type="button"
            className="btn btn-primary home-cta"
            onClick={() => handleOpenCreate()}
            disabled={loading || autosVisibles.length === 0}
          >
            Iniciar viaje
          </button>
        </div>
      )}

      {/* ── Estado KM por auto ── */}
      {kmPorAuto.length > 0 && (
        <div className="home-card">
          <div className="home-card-head">
            <p className="home-card-title">Estado KM</p>
            <button type="button" className="home-card-link" onClick={() => navigate("/viajes")}>
              Ver viajes →
            </button>
          </div>
          <div className="home-km-list">
            {kmPorAuto.map(({ auto, km, gap }) =>
              gap ? (
                <button
                  key={auto.id}
                  type="button"
                  className="home-km-row"
                  onClick={() => handleOpenCreate({ auto: gap.auto, kminicio: gap.kminicio, kmfin: gap.kmfin })}
                >
                  <span>
                    <span className="home-km-name">{autoLabel(auto)}</span>
                    <br />
                    <span className="home-km-sub">
                      {auto.kmactual != null ? `${auto.kmactual.toLocaleString("es-CL")} km` : "—"}
                    </span>
                  </span>
                  <span className="badge badge-warning">
                    ⚠ {km.toLocaleString("es-CL")} km sin registrar
                  </span>
                </button>
              ) : (
                <div key={auto.id} className="home-km-row">
                  <span>
                    <span className="home-km-name">{autoLabel(auto)}</span>
                    <br />
                    <span className="home-km-sub">
                      {auto.kmactual != null ? `${auto.kmactual.toLocaleString("es-CL")} km` : "—"}
                    </span>
                  </span>
                  <span className="badge badge-active">✅ KM al día</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Mi saldo ── */}
      <div className="home-card">
        <div className="home-card-head">
          <p className="home-card-title">Mi saldo</p>
          <button type="button" className="home-card-link" onClick={() => navigate("/saldos")}>
            Ver saldos →
          </button>
        </div>
        {saldosError && !saldos ? (
          <p className="home-net">—</p>
        ) : !saldos ? (
          <p className="home-net-sub">Calculando…</p>
        ) : !saldos.periodo ? (
          <p className="home-net-sub">
            No hay un periodo abierto.{" "}
            <button type="button" className="home-card-link" onClick={() => navigate("/periodos")}>
              Abrir uno →
            </button>
          </p>
        ) : (
          <p className="home-net">
            {neto > 0 ? `Debes ${clp(neto)}` : neto < 0 ? `Te deben ${clp(-neto)}` : "Al día"}
          </p>
        )}
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="quick-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/gastos?nuevo=1")}>
          Registrar gasto
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/viajes")}>
          Ver viajes
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/saldos")}>
          Ver saldos
        </button>
      </div>

      <ViajeFormModal
        title="Iniciar viaje"
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
