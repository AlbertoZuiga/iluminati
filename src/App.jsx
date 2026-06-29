import { useEffect, useState } from "react"
import AutosPage from "./pages/AutosPage"
import UsuariosPage from "./pages/UsuariosPage"
import "./App.css"

const routes = {
  "/autos": { label: "Autos" },
  "/usuarios": { label: "Usuarios" },
}

function getRoute() {
  const path = window.location.pathname
  return routes[path] ? path : "/autos"
}

function App() {
  const [page, setPage] = useState(getRoute)

  useEffect(() => {
    if (!routes[window.location.pathname]) {
      window.history.replaceState(null, "", "/autos")
      setPage("/autos")
    }
    const handlePop = () => setPage(getRoute())
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  function navigate(to) {
    window.history.pushState(null, "", to)
    setPage(to)
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <span className="brand">Iluminati</span>
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
        </nav>
      </header>

      <main className="page-main">
        <h1 className="page-title">{routes[page].label}</h1>
        {page === "/autos" ? <AutosPage /> : <UsuariosPage />}
      </main>
    </div>
  )
}

export default App
