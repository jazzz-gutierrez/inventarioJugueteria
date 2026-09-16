import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";

function Inventario() {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);

  const [productoId, setProductoId] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [cantidad, setCantidad] = useState("");

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoSeleccionadoPorBusqueda, setProductoSeleccionadoPorBusqueda] =
    useState(null);

  const [socket, setSocket] = useState(null);
  const modoEscaneoRef = useRef(false);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // ==========================================
  // CARGAR PRODUCTOS Y MOVIMIENTOS
  // ==========================================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [productosResponse, movimientosResponse] =
        await Promise.all([
          api.get("/productos"),
          api.get("/movimientos"),
        ]);

      setProductos(productosResponse.data || []);
      setMovimientos(movimientosResponse.data || []);
    } catch (error) {
      console.error("Error al cargar inventario:", error);

      setError(
        error.response?.data?.mensaje ||
          "No se pudieron cargar los datos del inventario."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // CONEXIÓN CON EL ESCÁNER DEL CELULAR
  // ==========================================

  useEffect(() => {
    const nuevaConexion = io("http://192.168.1.79:3000");

    nuevaConexion.on("connect", () => {
      console.log("Inventario conectado al escáner");
      setSocket(nuevaConexion);
    });

    nuevaConexion.on("disconnect", () => {
      console.log("Inventario desconectado del escáner");
      setSocket(null);
    });

    nuevaConexion.on("resultado_codigo", (datos) => {
      if (!datos?.codigo) return;

      const codigoRecibido = String(datos.codigo).trim();

      if (!modoEscaneoRef.current) return;

      modoEscaneoRef.current = false;

      setBusquedaProducto(codigoRecibido);

      const productoEncontrado = productos.find(
        (producto) =>
          String(producto.codigo || "").trim().toLowerCase() ===
          codigoRecibido.toLowerCase()
      );

      if (productoEncontrado) {
        setProductoId(productoEncontrado._id);
        setProductoSeleccionadoPorBusqueda(productoEncontrado);
        setMensaje("");
      } else {
        setProductoId("");
        setProductoSeleccionadoPorBusqueda(null);

        setMensaje(
          `No se encontró ningún producto con el código ${codigoRecibido}.`
        );
      }
    });

    return () => {
      nuevaConexion.disconnect();
    };
  }, [productos]);

  // ==========================================
  // BUSCAR PRODUCTOS EN LA TABLA PRINCIPAL
  // ==========================================

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return true;

    const nombre = producto.nombre?.toLowerCase() || "";
    const codigo = producto.codigo?.toLowerCase() || "";

    return nombre.includes(texto) || codigo.includes(texto);
  });

  // ==========================================
  // ABRIR MODAL
  // ==========================================

  const abrirModal = () => {
    setProductoId("");
    setTipo("entrada");
    setCantidad("");
    setMensaje("");
    setBusquedaProducto("");
    setProductoSeleccionadoPorBusqueda(null);

    modoEscaneoRef.current = false;

    setMostrarModal(true);
  };

  // ==========================================
  // CERRAR MODAL
  // ==========================================

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setMensaje("");
    setProductoId("");
    setBusquedaProducto("");
    setProductoSeleccionadoPorBusqueda(null);

    modoEscaneoRef.current = false;
  };

  // ==========================================
  // SOLICITAR ESCANEO
  // ==========================================

  const solicitarEscaneoMovimiento = () => {
    if (!socket) {
      setMensaje("La conexión con el escáner todavía no está lista.");
      return;
    }

    modoEscaneoRef.current = true;
    setMensaje("Ahora escanea el código desde tu celular.");
  };

  // ==========================================
  // SELECCIONAR PRODUCTO DESDE LA BÚSQUEDA
  // ==========================================

  const seleccionarProducto = (producto) => {
    setProductoId(producto._id);
    setProductoSeleccionadoPorBusqueda(producto);

    setBusquedaProducto(`${producto.nombre} — ${producto.codigo}`);

    setMensaje("");
  };

  // ==========================================
  // REGISTRAR MOVIMIENTO
  // ==========================================

  const registrarMovimiento = async (e) => {
    e.preventDefault();

    setMensaje("");

    if (!productoId) {
      setMensaje("Selecciona un producto.");
      return;
    }

    const cantidadNumero = Number(cantidad);

    if (
      !Number.isInteger(cantidadNumero) ||
      cantidadNumero <= 0
    ) {
      setMensaje(
        "La cantidad debe ser un número entero mayor a 0."
      );
      return;
    }

    const productoSeleccionado = productos.find(
      (producto) => producto._id === productoId
    );

    if (!productoSeleccionado) {
      setMensaje("No se encontró el producto seleccionado.");
      return;
    }

    const existenciaActual =
      Number(productoSeleccionado.cantidad) || 0;

    if (
      tipo === "salida" &&
      cantidadNumero > existenciaActual
    ) {
      setMensaje(
        `No puedes sacar ${cantidadNumero} unidades. Solo hay ${existenciaActual} disponibles.`
      );
      return;
    }

    try {
      setGuardando(true);

      const response = await api.post("/movimientos", {
        productoId,
        tipo,
        cantidad: cantidadNumero,
      });

      setMensaje(
        response.data?.mensaje ||
          "Movimiento registrado correctamente."
      );

      await cargarDatos();

      setTimeout(() => {
        setMostrarModal(false);
        setMensaje("");
        setProductoId("");
        setBusquedaProducto("");
        setProductoSeleccionadoPorBusqueda(null);
      }, 800);
    } catch (error) {
      console.error("Error al registrar movimiento:", error);

      setMensaje(
        error.response?.data?.mensaje ||
          "No se pudo registrar el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // FORMATO DE FECHA
  // ==========================================

  const mostrarFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const productoSeleccionado = productos.find(
    (producto) => producto._id === productoId
  );

  const productosEncontrados = productos.filter((producto) => {
    const texto = busquedaProducto.toLowerCase().trim();

    if (!texto) return false;

    const nombre = String(producto.nombre || "").toLowerCase();
    const codigo = String(producto.codigo || "").toLowerCase();

    return nombre.includes(texto) || codigo.includes(texto);
  });

  return (
    <div className="inventario-page">
      <div className="inventario-header">
        <div>
          <h1>Inventario</h1>

          <p>
            Controla las entradas y salidas de tus productos
          </p>
        </div>

        <button
          type="button"
          className="btn-nuevo-movimiento"
          onClick={abrirModal}
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="inventario-toolbar">
        <input
          type="text"
          placeholder="🔎 Buscar por nombre o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && (
        <div className="inventario-error">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="inventario-contador">
          Mostrando{" "}
          <strong>{productosFiltrados.length}</strong> de{" "}
          <strong>{productos.length}</strong> productos
        </div>
      )}

      <div className="inventario-tabla-contenedor">
        {cargando ? (
          <div className="inventario-vacio">
            Cargando inventario...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="inventario-vacio">
            No se encontraron productos.
          </div>
        ) : (
          <div className="inventario-tabla">
            <div className="inventario-tabla-header">
              <span>Producto</span>
              <span>Código</span>
              <span>Existencia</span>
              <span>Estado</span>
            </div>

            {productosFiltrados.map((producto) => (
              <div
                className={`inventario-fila ${
                  producto.apartado
                    ? "inventario-fila-apartado"
                    : ""
                }`}
                key={producto._id}
              >
                <div className="inventario-producto">
                  <div className="inventario-imagen">
                    {producto.imagen ? (
                      <img
                        src={producto.imagen}
                        alt={producto.nombre}
                      />
                    ) : (
                      <span>🧸</span>
                    )}
                  </div>

                  <strong>{producto.nombre}</strong>
                </div>

                <span className="inventario-codigo">
                  {producto.codigo || "Sin código"}
                </span>

                <strong className="inventario-cantidad">
                  {Number(producto.cantidad) || 0}
                </strong>

                <span
                  className={
                    producto.apartado
                      ? "estado-apartado inventario-estado"
                      : Number(producto.cantidad) > 0
                      ? "estado-disponible inventario-estado"
                      : "estado-agotado inventario-estado"
                  }
                >
                  {producto.apartado
                    ? "🟡 Apartado"
                    : Number(producto.cantidad) > 0
                    ? "🟢 Disponible"
                    : "🔴 Agotado"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="movimientos-seccion">
        <div className="movimientos-titulo">
          <div>
            <h2>Historial de movimientos</h2>

            <p>
              Últimas entradas y salidas registradas
            </p>
          </div>
        </div>

        <div className="movimientos-tabla-contenedor">
          {movimientos.length === 0 ? (
            <div className="movimientos-vacio">
              Todavía no hay movimientos registrados.
            </div>
          ) : (
            <div className="movimientos-tabla">
              <div className="movimientos-tabla-header">
                <span>Producto</span>
                <span>Código</span>
                <span>Tipo</span>
                <span>Cantidad</span>
                <span>Fecha</span>
              </div>

              {movimientos.map((movimiento) => (
                <div
                  className="movimiento-fila"
                  key={movimiento._id}
                >
                  <div className="movimiento-producto">
                    <div className="movimiento-imagen">
                      {movimiento.producto?.imagen ? (
                        <img
                          src={movimiento.producto.imagen}
                          alt={movimiento.producto.nombre}
                        />
                      ) : (
                        <span>🧸</span>
                      )}
                    </div>

                    <strong>
                      {movimiento.producto?.nombre ||
                        "Producto eliminado"}
                    </strong>
                  </div>

                  <span>
                    {movimiento.producto?.codigo ||
                      "Sin código"}
                  </span>

                  <span
                    className={
                      movimiento.tipo === "entrada"
                        ? "movimiento-entrada"
                        : "movimiento-salida"
                    }
                  >
                    {movimiento.tipo === "entrada"
                      ? "Entrada"
                      : "Salida"}
                  </span>

                  <strong
                    className={
                      movimiento.tipo === "entrada"
                        ? "cantidad-entrada"
                        : "cantidad-salida"
                    }
                  >
                    {movimiento.tipo === "entrada"
                      ? "+"
                      : "-"}
                    {movimiento.cantidad}
                  </strong>

                  <span>
                    {mostrarFecha(movimiento.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mostrarModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Registrar movimiento</h2>

                <p>
                  Actualiza la existencia del producto
                </p>
              </div>

              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
              >
                ×
              </button>
            </div>

            <form onSubmit={registrarMovimiento}>
              <div className="campo">
                <label>Buscar producto</label>

                <div className="buscador-movimiento">
                  <input
                    type="text"
                    placeholder="Escribe nombre o código..."
                    value={busquedaProducto}
                    onChange={(e) => {
                      const texto = e.target.value;

                      setBusquedaProducto(texto);
                      setProductoId("");
                      setProductoSeleccionadoPorBusqueda(null);
                      setMensaje("");
                    }}
                    disabled={guardando}
                  />

                  <button
                    type="button"
                    className="btn-escanear-movimiento"
                    onClick={solicitarEscaneoMovimiento}
                    disabled={guardando}
                    title="Escanear código"
                  >
                    📷
                  </button>
                </div>

                {busquedaProducto.trim() !== "" &&
                  !productoSeleccionadoPorBusqueda && (
                    <div className="resultados-movimiento">
                      {productosEncontrados.length > 0 ? (
                        productosEncontrados.map((producto) => (
                          <button
                            type="button"
                            key={producto._id}
                            className="resultado-producto"
                            onClick={() =>
                              seleccionarProducto(producto)
                            }
                          >
                            <span>
                              <strong>{producto.nombre}</strong>
                              <small>{producto.codigo}</small>
                            </span>

                            <span>
                              {producto.apartado
                                ? "🟡 Apartado"
                                : "Disponible"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="sin-resultados-movimiento">
                          No se encontró ningún producto.
                        </p>
                      )}
                    </div>
                  )}

                {productoSeleccionadoPorBusqueda && (
                  <div className="producto-elegido-movimiento">
                    <div>
                      <strong>
                        {productoSeleccionadoPorBusqueda.nombre}
                      </strong>

                      <span>
                        {productoSeleccionadoPorBusqueda.codigo}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProductoId("");
                        setBusquedaProducto("");
                        setProductoSeleccionadoPorBusqueda(null);
                        setMensaje("");
                      }}
                      disabled={guardando}
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              {productoSeleccionado && (
                <div className="existencia-actual">
                  Existencia actual:{" "}
                  <strong>
                    {productoSeleccionado.cantidad}
                  </strong>
                </div>
              )}

              <div className="campo">
                <label>Tipo de movimiento</label>

                <div className="tipo-movimiento">
                  <button
                    type="button"
                    className={
                      tipo === "entrada"
                        ? "tipo-btn activo entrada"
                        : "tipo-btn"
                    }
                    onClick={() => setTipo("entrada")}
                    disabled={guardando}
                  >
                    ➕ Entrada
                  </button>

                  <button
                    type="button"
                    className={
                      tipo === "salida"
                        ? "tipo-btn activo salida"
                        : "tipo-btn"
                    }
                    onClick={() => setTipo("salida")}
                    disabled={guardando}
                  >
                    ➖ Salida
                  </button>
                </div>
              </div>

              <div className="campo">
                <label>Cantidad</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(e.target.value)
                  }
                  placeholder="Ej. 2"
                  disabled={guardando}
                />
              </div>

              {mensaje && (
                <div className="movimiento-mensaje">
                  {mensaje}
                </div>
              )}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardando}
                >
                  {guardando
                    ? "Registrando..."
                    : "Registrar movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventario;