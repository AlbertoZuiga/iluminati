import { useMemo } from "react"

// Huecos de KM, viajes abiertos y KM de referencia por auto visible.
// `autosById`: Map de id → auto (para leer kmactual en referenceKmForAuto).
export function usePendientesKm(viajes, autosVisibles, autosById) {
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
        // El km "más avanzado" del viaje: kmfin si está cerrado, si no su kminicio
        // (un viaje abierto igual sube el kmactual del auto vía bumpKmActual).
        const vMax = v.kmfin != null ? v.kmfin : v.kminicio
        if (vMax != null && (maxKmFin == null || vMax > maxKmFin)) maxKmFin = vMax

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

  // KM de referencia para prellenar un viaje nuevo: kmactual del auto, si no el último KM visto.
  function referenceKmForAuto(autoId) {
    const auto = autosById.get(autoId)
    if (auto?.kmactual != null) return auto.kmactual
    return lastKmForAuto(autoId)
  }

  return { ...pendientes, lastKmForAuto, referenceKmForAuto }
}
