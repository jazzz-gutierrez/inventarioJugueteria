import { useState } from "react";
import "./app.css";

import Dashboard from "./pages/dashboard";
import Productos from "./pages/productos";
import Inventario from "./pages/inventario";

function App() {
  const [pagina, setPagina] = useState("dashboard");

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="app-logo">
          🧸 Inventario
        </div>

        <div className="app-nav-links">
          <button
            className={
              pagina === "dashboard"
                ? "nav-btn activo"
                : "nav-btn"
            }
            onClick={() => setPagina("dashboard")}
          >
            📊 Dashboard
          </button>

          <button
            className={
              pagina === "productos"
                ? "nav-btn activo"
                : "nav-btn"
            }
            onClick={() => setPagina("productos")}
          >
            📦 Productos
          </button>

          <button
            className={
              pagina === "inventario"
                ? "nav-btn activo"
                : "nav-btn"
            }
            onClick={() => setPagina("inventario")}
          >
            📋 Inventario
          </button>
        </div>
      </nav>

      <main className="app-content">
        {pagina === "dashboard" && <Dashboard />}

        {pagina === "productos" && <Productos />}

        {pagina === "inventario" && <Inventario />}
      </main>
    </div>
  );
}

export default App;
