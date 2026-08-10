// Destinatarios del recordatorio: Script Property RECORDATORIO_DESTINATARIOS, mails separados por coma
// (Configuración del proyecto → Propiedades de la secuencia de comandos). Fuera del repo porque es público.
function getDestinatarios() {
  const raw = PropertiesService.getScriptProperties().getProperty("RECORDATORIO_DESTINATARIOS") || ""
  return raw.split(",").map(function (s) { return s.trim() }).filter(Boolean)
}

const APP_URL = "https://albertozuiga.github.io/iluminati/"
const DIAS_ALERTA = 35

// Trigger de tiempo mensual: avisa si el periodo abierto lleva demasiado tiempo sin cerrarse.
function recordatorioMensual() {
  const destinatarios = getDestinatarios()
  if (destinatarios.length === 0) {
    throw new Error("Falta la Script Property RECORDATORIO_DESTINATARIOS")
  }

  const periodo = getPeriodoAbierto()
  if (!periodo) {
    console.log("No hay periodo abierto, no se envía recordatorio.")
    return
  }

  const inicio = toLocalDayTs(periodo.fechainicio)
  if (isNaN(inicio)) {
    throw new Error("El periodo abierto tiene una fechainicio inválida: " + periodo.fechainicio)
  }

  const dias = Math.floor((Date.now() - inicio) / 86400000)
  if (dias <= DIAS_ALERTA) {
    console.log("El periodo lleva " + dias + " días abiertos, bajo el umbral de " + DIAS_ALERTA + ".")
    return
  }

  const saldos = getSaldos()
  const lineas = saldos.totales.map(function (t) {
    const neto = Math.round(t.neto)
    const monto = Math.abs(neto).toLocaleString("es-CL")
    const detalle = neto > 0 ? "debe pagar $" + monto : (neto < 0 ? "le deben $" + monto : "está en cero")
    return "- " + t.nombre + ": " + detalle
  })

  const asunto = "Iluminati: el periodo lleva " + dias + " días abierto"
  const cuerpo = [
    "El periodo \"" + (periodo.nombre || periodo.id) + "\" lleva " + dias + " días abierto y todavía no se cierra.",
    "",
    "Neto por persona:",
    lineas.length > 0 ? lineas.join("\n") : "- (sin movimientos)",
    "",
    "Cerrar el periodo en: " + APP_URL,
  ].join("\n")

  MailApp.sendEmail(destinatarios.join(","), asunto, cuerpo)
  console.log("Recordatorio enviado a " + destinatarios.join(", "))
}
