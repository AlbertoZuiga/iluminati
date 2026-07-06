import { useEffect, useMemo, useState } from "react"
import HomePage from "./pages/HomePage"
import AutosPage from "./pages/AutosPage"
import UsuariosPage from "./pages/UsuariosPage"
import ViajesPage from "./pages/ViajesPage"
import GastosPage from "./pages/GastosPage"
import SaldosPage from "./pages/SaldosPage"
import PeriodosPage from "./pages/PeriodosPage"
import { useCurrentUserId, setCurrentUserId } from "./hooks/useCurrentUser"
import { useData } from "./context/DataContext"
import UserSelectModal from "./components/UserSelectModal"
import "./App.css"

const routes = {
  "/": { label: "Inicio" },
  "/autos": { label: "Autos" },
  "/usuarios": { label: "Usuarios" },
  "/viajes": { label: "Viajes" },
  "/gastos": { label: "Gastos" },
  "/saldos": { label: "Saldos" },
  "/periodos": { label: "Periodos" },
}

function getRoute() {
  const path = window.location.pathname
  return routes[path] ? path : "/"
}

function App() {
  const [page, setPage] = useState(getRoute)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const currentUserId = useCurrentUserId()
  const { usuarios, loading, error, reload } = useData()
  const usuariosActivos = useMemo(() => usuarios.filter((u) => u.activo !== false), [usuarios])
  const currentUser = usuariosActivos.find((u) => u.id === currentUserId)

  useEffect(() => {
    if (!routes[window.location.pathname]) {
      window.history.replaceState(null, "", "/")
      setPage("/")
    }
    const handlePop = () => setPage(getRoute())
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
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
    const path = to.split("?")[0]
    setPage(routes[path] ? path : "/")
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">I</span>
          Iluminati
        </span>
        <nav className="page-nav" aria-label="Secciones">
          {Object.entries(routes).map(([path, { label }]) => (
            <a
              key={path}
              className={page === path ? "active" : ""}
              href={path}
              onClick={(e) => { e.preventDefault(); navigate(path) }}
            >
              {label}
            </a>
          ))}
        </nav>

        {currentUser ? (
          <div className="user-session">
            <span className="user-avatar" aria-hidden="true">
              {(currentUser.nombre ?? currentUser.email ?? currentUser.id ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="user-session-name">{currentUser.nombre ?? currentUser.email ?? currentUser.id}</span>
            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Cambiar usuario
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
        {page === "/" && <HomePage navigate={navigate} />}
        {page === "/autos" && <AutosPage />}
        {page === "/usuarios" && <UsuariosPage />}
        {page === "/viajes" && <ViajesPage />}
        {page === "/gastos" && <GastosPage />}
        {page === "/saldos" && <SaldosPage />}
        {page === "/periodos" && <PeriodosPage />}
      </main>

      <UserSelectModal
        open={userModalOpen}
        forced={!currentUserId}
        usuarios={usuariosActivos}
        loading={loading}
        error={error}
        onRetry={reload}
        onSelect={handleSelectUser}
        onClose={() => setUserModalOpen(false)}
      />
    </div>
  )
}

export default App
