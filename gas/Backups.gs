const BACKUP_CARPETA = "Iluminati Backups"
const BACKUP_PREFIJO = "iluminati-backup-"
const BACKUP_SEMANAS = 8

// Trigger de tiempo semanal: copia el spreadsheet a Drive y rota las copias viejas.
function backupSemanal() {
  // getFoldersByName también devuelve carpetas en la papelera: hay que descartarlas
  // o los backups se irían a una carpeta que Drive borra sola a los 30 días.
  let carpeta = null
  const carpetas = DriveApp.getFoldersByName(BACKUP_CARPETA)
  while (carpetas.hasNext()) {
    const c = carpetas.next()
    if (!c.isTrashed()) { carpeta = c; break }
  }
  if (!carpeta) carpeta = DriveApp.createFolder(BACKUP_CARPETA)

  const tz = Session.getScriptTimeZone()
  const fecha = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd")
  const original = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId())
  const copia = original.makeCopy(BACKUP_PREFIJO + fecha, carpeta)
  console.log("Backup creado: " + copia.getName())

  const limite = Date.now() - BACKUP_SEMANAS * 7 * 86400000
  const archivos = carpeta.getFiles()
  while (archivos.hasNext()) {
    const f = archivos.next()
    if (f.getName().indexOf(BACKUP_PREFIJO) !== 0) continue
    if (f.getDateCreated().getTime() >= limite) continue
    f.setTrashed(true)
    console.log("Backup enviado a la papelera: " + f.getName())
  }
}
