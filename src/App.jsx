import { useEffect, useState } from "react"
import AutosPage from "./pages/AutosPage"
import UsuariosPage from "./pages/UsuariosPage"
import ViajesPage from "./pages/ViajesPage"
import { getUsuarios } from "./services/api"
import { normalizeCollection } from "./utils/normalizeCollection"
import { useCurrentUserId, setCurrentUserId } from "./hooks/useCurrentUser"
import UserSelectModal from "./components/UserSelectModal"
import "./App.css"

const routes = {
  "/autos": { label: "Autos" },
  "/usuarios": { label: "Usuarios" },
  "/viajes": { label: "Viajes" },
}

function getRoute() {
  const path = window.location.pathname
  return routes[path] ? path : "/autos"
}

function App() {
  const [page, setPage] = useState(getRoute)
  const [usuarios, setUsuarios] = useState([])
  const [userModalOpen, setUserModalOpen] = useState(false)
  const currentUserId = useCurrentUserId()
  const currentUser = usuarios.find((u) => u.id === currentUserId)

  useEffect(() => {
    if (!routes[window.location.pathname]) {
      window.history.replaceState(null, "", "/autos")
      setPage("/autos")
    }
    const handlePop = () => setPage(getRoute())
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  useEffect(() => {
    let cancelled = false
    getUsuarios()
      .then((data) => {
        if (!cancelled) setUsuarios(normalizeCollection(data).filter((u) => u.activo !== false))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!currentUserId) setUserModalOpen(true)
  }, [currentUserId])

  function handleSelectUser(id) {
    setCurrentUserId(id)
    setUserModalOpen(false)
  }

  function handleLogout() {
    setCurrentUserId(null)
  }

  function navigate(to) {
    window.history.pushState(null, "", to)
    setPage(to)
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">I</span>
          Iluminati
        </span>
        <nav className="page-nav" aria-label="Secciones">
          <a
            className={page === "/autos" ? "active" : ""}
            href="/autos"
            onClick={(e) => { e.preventDefault(); navigate("/autos") }}
          >
            Autos
          </a>
          <a
            className={page === "/usuarios" ? "active" : ""}
            href="/usuarios"
            onClick={(e) => { e.preventDefault(); navigate("/usuarios") }}
          >
            Usuarios
          </a>
          <a
            className={page === "/viajes" ? "active" : ""}
            href="/viajes"
            onClick={(e) => { e.preventDefault(); navigate("/viajes") }}
          >
            Viajes
          </a>
        </nav>

        {currentUser ? (
          <div className="user-session">
            <span className="user-avatar" aria-hidden="true">
              {(currentUser.nombre ?? currentUser.email ?? currentUser.id ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="user-session-name">{currentUser.nombre ?? currentUser.email ?? currentUser.id}</span>
            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button type="button" className="user-switcher" onClick={() => setUserModalOpen(true)}>
            ¿Quién eres?
          </button>
        )}
      </header>

      <main className="page-main">
        <h1 className="page-title">{routes[page].label}</h1>
        {page === "/autos" && <AutosPage />}
        {page === "/usuarios" && <UsuariosPage />}
        {page === "/viajes" && <ViajesPage />}
      </main>

      <UserSelectModal
        open={userModalOpen}
        forced={!currentUserId}
        usuarios={usuarios}
        onSelect={handleSelectUser}
        onClose={() => setUserModalOpen(false)}
      />
    </div>
  )
}

export default App
