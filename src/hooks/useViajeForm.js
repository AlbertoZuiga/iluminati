import { useState } from "react"

export const EMPTY_VIAJE_FORM = { auto: "", participantes: [], kminicio: "", kmfin: "" }

// Estado + handlers compartidos por el formulario de viaje (crear y editar).
// `referenceKmForAuto(autoId)` se usa para prellenar el KM inicial y calcular el gap.
export function useViajeForm(referenceKmForAuto) {
  const [form, setForm] = useState(EMPTY_VIAJE_FORM)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Crear: al elegir auto, prellena KM inicial y descarta participantes no permitidos.
  function selectAutoWithPrefill(autoId, allowedIds) {
    const refKm = referenceKmForAuto(autoId)
    const allowed = new Set(allowedIds)
    setForm((prev) => ({
      ...prev,
      auto: autoId,
      kminicio: refKm != null ? String(refKm) : "",
      participantes: prev.participantes.filter((id) => allowed.has(id)),
    }))
  }

  // Editar: solo cambia el auto, sin tocar KM ni participantes.
  function selectAuto(autoId) {
    setForm((prev) => ({ ...prev, auto: autoId }))
  }

  function toggleParticipante(userId) {
    setForm((prev) => ({
      ...prev,
      participantes: prev.participantes.includes(userId)
        ? prev.participantes.filter((id) => id !== userId)
        : [...prev.participantes, userId],
    }))
  }

  // Aviso de tramo sin registrar: KM inicial mayor que el último KM conocido del auto.
  const refKm = form.auto ? referenceKmForAuto(form.auto) : null
  const kminicioNum = form.kminicio !== "" ? Number(form.kminicio) : null
  const gap = refKm != null && kminicioNum != null && kminicioNum > refKm
    ? { refKm, km: kminicioNum - refKm }
    : null

  return { form, setForm, handleChange, selectAuto, selectAutoWithPrefill, toggleParticipante, gap }
}

// Valida que, si hay KM final, sea mayor que el inicial. Devuelve mensaje de error o null.
export function validateViajeForm(form) {
  if (form.kmfin && Number(form.kmfin) <= Number(form.kminicio)) {
    return "El KM final debe ser mayor que el KM inicial."
  }
  return null
}
