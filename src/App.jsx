import { useEffect, useState } from "react"
import AutosPage from "./pages/AutosPage"
import UsuariosPage from "./pages/UsuariosPage"
import "./App.css"

const routes = {
  autos: { label: "Autos" },
  usuarios: { label: "Usuarios" },
}

function getRouteFromHash() {
  const hash = window.location.hash.replace("#/", "")
  return routes[hash] ? hash : "autos"
}

function App() {
  const [page, setPage] = useState(getRouteFromHash)

  useEffect(() => {
    if (!window.location.hash) window.location.hash = "#/autos"
    const handleHashChange = () => setPage(getRouteFromHash())
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  return (
    <div className="app-shell">
      <header className="topnav">
        <span className="brand">Iluminati</span>
        <nav className="page-nav" aria-label="Secciones">
          <a className={page === "autos" ? "active" : ""} href="#/autos">Autos</a>
          <a className={page === "usuarios" ? "active" : ""} href="#/usuarios">Usuarios</a>
        </nav>
      </header>

      <main className="page-main">
        <h1 className="page-title">{routes[page].label}</h1>
        {page === "autos" ? <AutosPage /> : <UsuariosPage />}
      </main>
    </div>
  )
}

export default App
