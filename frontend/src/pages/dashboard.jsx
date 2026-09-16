import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDashboard = async () => {
    try {
      setCargando(true);
      setError("");

      const [productosRespuesta, movimientosRespuesta] =
        await Promise.all([
          api.get("/productos"),
          api.get("/movimientos"),
        ]);

      setProductos(productosRespuesta.data || []);
      setMovimientos(movimientosRespuesta.data || []);
    } catch (error) {
      console.error("Error al cargar el dashboard:", error);

      setError(
        error.response?.data?.mensaje ||
          "No se pudo cargar la información del dashboard."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const estadisticas = useMemo(() => {
    const totalProductos = productos.length;

    const totalPiezas = productos.reduce(
      (total, producto) => total + Number(producto.cantidad || 0),
      0
    );

    const disponibles = productos.filter(
      (producto) =>
        !producto.apartado && Number(producto.cantidad || 0) > 0
    ).length;

    const apartados = productos.filter(
      (producto) => Boolean(producto.apartado)
    ).length;

    const agotados = productos.filter(
      (producto) => Number(producto.cantidad || 0) <= 0
    ).length;

    const valorCompra = productos.reduce(
      (total, producto) =>
        total +
        Number(producto.cantidad || 0) *
          Number(producto.precioCompra || 0),
      0
    );

    const valorVenta = productos.reduce(
      (total, producto) =>
        total +
        Number(producto.cantidad || 0) *
          Number(producto.precioVenta || 0),
      0
    );

    const gananciaPotencial = productos.reduce(
      (total, producto) =>
        total +
        Number(producto.cantidad || 0) *
          Number(producto.ganancia || 0),
      0
    );

    return {
      totalProductos,
      totalPiezas,
      disponibles,
      apartados,
      agotados,
      valorCompra,
      valorVenta,
      gananciaPotencial,
    };
  }, [productos]);

  const productosApartados = useMemo(() => {
    return productos
      .filter((producto) => producto.apartado)
      .slice(0, 5);
  }, [productos]);

  const movimientosRecientes = useMemo(() => {
    return movimientos.slice(0, 5);
  }, [movimientos]);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) {
      return "Sin fecha";
    }

    return new Date(fecha).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (cargando) {
    return (
      <section className="pagina">
        <div className="pagina-encabezado">
          <div>
            <p className="pagina-etiqueta">Resumen del almacén</p>
            <h1>Dashboard</h1>
          </div>
        </div>

        <div className="dashboard-cargando">
          Cargando información del almacén...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="pagina">
        <div className="pagina-encabezado">
          <div>
            <p className="pagina-etiqueta">Resumen del almacén</p>
            <h1>Dashboard</h1>
          </div>
        </div>

        <div className="dashboard-error">
          <p>{error}</p>

          <button
            className="boton-principal"
            onClick={cargarDashboard}
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina dashboard">
      <div className="pagina-encabezado">
        <div>
          <p className="pagina-etiqueta">Resumen del almacén</p>
          <h1>Dashboard</h1>

          <p className="pagina-descripcion">
            Consulta rápidamente el estado de tus productos y existencias.
          </p>
        </div>

        <button
          className="boton-secundario"
          onClick={cargarDashboard}
        >
          ↻ Actualizar
        </button>
      </div>

      <div className="dashboard-tarjetas">
        <div className="dashboard-tarjeta tarjeta-morado">
          <div className="dashboard-tarjeta-icono">📦</div>

          <div>
            <span>Total de productos</span>
            <strong>{estadisticas.totalProductos}</strong>
            <small>Productos registrados</small>
          </div>
        </div>

        <div className="dashboard-tarjeta tarjeta-azul">
          <div className="dashboard-tarjeta-icono">🧸</div>

          <div>
            <span>Total de piezas</span>
            <strong>{estadisticas.totalPiezas}</strong>
            <small>Unidades en almacén</small>
          </div>
        </div>

        <div className="dashboard-tarjeta tarjeta-verde">
          <div className="dashboard-tarjeta-icono">🟢</div>

          <div>
            <span>Disponibles</span>
            <strong>{estadisticas.disponibles}</strong>
            <small>Productos disponibles</small>
          </div>
        </div>

        <div className="dashboard-tarjeta tarjeta-amarilla">
          <div className="dashboard-tarjeta-icono">🟡</div>

          <div>
            <span>Apartados</span>
            <strong>{estadisticas.apartados}</strong>
            <small>Productos apartados</small>
          </div>
        </div>
      </div>

      <div className="dashboard-resumen-financiero">
        <div className="dashboard-seccion-titulo">
          <div>
            <p className="pagina-etiqueta">Valor del inventario</p>
            <h2>Resumen económico</h2>
          </div>
        </div>

        <div className="dashboard-finanzas">
          <div className="dashboard-finanza">
            <span>Valor de compra</span>

            <strong>
              {formatoMoneda(estadisticas.valorCompra)}
            </strong>

            <small>
              Valor de tus productos a precio de compra
            </small>
          </div>

          <div className="dashboard-finanza">
            <span>Valor de venta</span>

            <strong>
              {formatoMoneda(estadisticas.valorVenta)}
            </strong>

            <small>
              Valor estimado de todo el inventario
            </small>
          </div>

          <div className="dashboard-finanza">
            <span>Ganancia potencial</span>

            <strong>
              {formatoMoneda(estadisticas.gananciaPotencial)}
            </strong>

            <small>
              Diferencia estimada entre compra y venta
            </small>
          </div>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel-encabezado">
          <div>
            <p className="pagina-etiqueta">Seguimiento</p>
            <h2>Productos apartados</h2>
          </div>

          <span className="dashboard-panel-contador">
            {estadisticas.apartados}
          </span>
        </div>

        {productosApartados.length === 0 ? (
          <div className="dashboard-vacio">
            No hay productos apartados.
          </div>
        ) : (
          <div className="dashboard-lista">
            {productosApartados.map((producto) => (
              <div
                className="dashboard-lista-item dashboard-item-apartado"
                key={producto._id}
              >
                <div className="dashboard-producto-imagen">
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                    />
                  ) : (
                    <span>🧸</span>
                  )}
                </div>

                <div className="dashboard-producto-datos">
                  <strong>{producto.nombre}</strong>

                  <small>
                    Código: {producto.codigo}
                  </small>
                </div>

                <span className="dashboard-estado apartado">
                  Apartado
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel-encabezado">
          <div>
            <p className="pagina-etiqueta">Historial</p>
            <h2>Movimientos recientes</h2>
          </div>

          <span className="dashboard-panel-contador">
            {movimientos.length}
          </span>
        </div>

        {movimientosRecientes.length === 0 ? (
          <div className="dashboard-vacio">
            Todavía no hay movimientos registrados.
          </div>
        ) : (
          <div className="dashboard-movimientos">
            {movimientosRecientes.map((movimiento) => (
              <div
                className="dashboard-movimiento"
                key={movimiento._id}
              >
                <div
                  className={
                    movimiento.tipo === "entrada"
                      ? "movimiento-icono entrada"
                      : "movimiento-icono salida"
                  }
                >
                  {movimiento.tipo === "entrada" ? "↑" : "↓"}
                </div>

                <div className="dashboard-movimiento-datos">
                  <strong>
                    {movimiento.producto?.nombre ||
                      "Producto eliminado"}
                  </strong>

                  <small>
                    {movimiento.tipo === "entrada"
                      ? "Entrada al almacén"
                      : "Salida del almacén"}
                  </small>
                </div>

                <div className="dashboard-movimiento-cantidad">
                  <strong>
                    {movimiento.tipo === "entrada" ? "+" : "-"}
                    {movimiento.cantidad}
                  </strong>

                  <small>
                    {formatoFecha(movimiento.createdAt)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;