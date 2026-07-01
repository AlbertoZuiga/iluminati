import { useMemo } from "react"

export function useAutosVisibles(autos, autoUsuarios, currentUserId) {
  const miembrosByAuto = useMemo(() => {
    const map = new Map()
    for (const r of autoUsuarios) {
      const list = map.get(r.autoid)
      if (list) list.push(r.usuarioid)
      else map.set(r.autoid, [r.usuarioid])
    }
    return map
  }, [autoUsuarios])

  const autosVisibles = useMemo(() => {
    if (!currentUserId) return autos
    const mine = autos.filter((a) => (miembrosByAuto.get(a.id) ?? []).includes(currentUserId))
    return mine.length > 0 ? mine : autos
  }, [autos, currentUserId, miembrosByAuto])

  function usuariosParaAuto(usuarios, autoId) {
    const ids = miembrosByAuto.get(autoId)
    if (!ids || ids.length === 0) return usuarios
    const set = new Set(ids)
    return usuarios.filter((u) => set.has(u.id))
  }

  return { miembrosByAuto, autosVisibles, usuariosParaAuto }
}
