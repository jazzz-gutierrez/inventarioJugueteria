import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [orden, setOrden] = useState("nombre-az");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [socket, setSocket] = useState(null);
  const [modoEscaneo, setModoEscaneo] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const modoEscaneoRef = useRef(null);

  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState("");

  const [formulario, setFormulario] = useState({
    nombre: "",
    codigo: "",
    precioCompra: "",
    precioVenta: "",
    cantidad: "",
  });

  const solicitarEscaneo = (modo) => {
    if (!socket) {
      alert("La conexión con el escáner todavía no está lista.");
      return;
    }
    modoEscaneoRef.current = modo;
    setModoEscaneo(modo);
    setEscaneando(true);
    alert(modo === "nuevo" ? "Ahora escanea el código desde tu celular." : "Ahora escanea el código que quieres buscar.");
  };

  const obtenerProductos = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/productos");
      setProductos(respuesta.data || []);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setError(
        error.response?.data?.mensaje ||
          "No se pudieron cargar los productos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  useEffect(() => {
    const nuevaConexion = io("http://192.168.1.79:3000");
    nuevaConexion.on("connect", () => {
      console.log("React conectado a Socket.IO ✅");
      setSocket(nuevaConexion);
    });
    nuevaConexion.on("disconnect", () => {
      console.log("React desconectado de Socket.IO ❌");
      setSocket(null);
    });
    nuevaConexion.on("resultado_codigo", (datos) => {
      if (!datos?.codigo) return;
      const codigo = String(datos.codigo).trim();
      if (modoEscaneoRef.current === "nuevo") {
        setFormulario((anterior) => ({ ...anterior, codigo }));
        setEscaneando(false); setModoEscaneo(null); modoEscaneoRef.current = null;
        alert("Código agregado al producto.");
      } else if (modoEscaneoRef.current === "buscar") {
        setBusqueda(codigo);
        setEscaneando(false); setModoEscaneo(null); modoEscaneoRef.current = null;
      }
    });
    return () => nuevaConexion.disconnect();
  }, []);

  // ==========================================
  // CAMBIAR CAMPOS DEL FORMULARIO
  // ==========================================
  const cambiarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  // ==========================================
  // ABRIR FORMULARIO NUEVO
  // ==========================================
  const abrirNuevoProducto = () => {
    setEditando(null);

    setFormulario({
      nombre: "",
      codigo: "",
      precioCompra: "",
      precioVenta: "",
      cantidad: "",
    });

    setImagenArchivo(null);
    setImagenPreview("");

    setMostrarFormulario(true);
  };

  // ==========================================
  // ABRIR FORMULARIO EDITAR
  // ==========================================
  const abrirEditarProducto = (producto) => {
    setEditando(producto);

    setFormulario({
      nombre: producto.nombre || "",
      codigo: producto.codigo || "",
      precioCompra:
        producto.precioCompra !== undefined &&
        producto.precioCompra !== null
          ? producto.precioCompra
          : "",
      precioVenta:
        producto.precioVenta !== undefined &&
        producto.precioVenta !== null
          ? producto.precioVenta
          : "",
      cantidad:
        producto.cantidad !== undefined &&
        producto.cantidad !== null
          ? producto.cantidad
          : "",
    });

    setImagenArchivo(null);
    setImagenPreview(producto.imagen || "");

    setMostrarFormulario(true);
  };

  // ==========================================
  // CERRAR FORMULARIO
  // ==========================================
  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setEditando(null);
    setImagenArchivo(null);
    setImagenPreview("");

    setFormulario({
      nombre: "",
      codigo: "",
      precioCompra: "",
      precioVenta: "",
      cantidad: "",
    });
  };

  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================
  const seleccionarImagen = (e) => {
    const archivo = e.target.files[0];

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert("La imagen no puede pesar más de 5 MB.");
      return;
    }

    setImagenArchivo(archivo);

    const preview = URL.createObjectURL(archivo);
    setImagenPreview(preview);
  };

  // ==========================================
  // SUBIR IMAGEN A CLOUDINARY
  // ==========================================
  const subirImagen = async () => {
    if (!imagenArchivo) {
      return {
        imagen: editando?.imagen || "",
        publicId: editando?.imagenPublicId || "",
      };
    }

    const datos = new FormData();

    datos.append("imagen", imagenArchivo);

    const respuesta = await api.post("/imagenes", datos);

    return {
      imagen: respuesta.data.imagen,
      publicId: respuesta.data.publicId,
    };
  };

  // ==========================================
  // GUARDAR PRODUCTO
  // ==========================================
  const guardarProducto = async (e) => {
    e.preventDefault();

    if (guardando) return;

    if (!formulario.nombre.trim()) {
      alert("Escribe el nombre del producto.");
      return;
    }

    if (!formulario.codigo.trim()) {
      alert("Escribe el código de barras.");
      return;
    }

    if (
      formulario.precioCompra === "" ||
      formulario.precioVenta === ""
    ) {
      alert("Escribe el precio de compra y el precio de venta.");
      return;
    }

    if (formulario.cantidad === "") {
      alert("Escribe la cantidad.");
      return;
    }

    const precioCompra = Number(formulario.precioCompra);
    const precioVenta = Number(formulario.precioVenta);
    const cantidad = Number(formulario.cantidad);

    if (precioCompra < 0 || precioVenta < 0 || cantidad < 0) {
      alert("Los valores no pueden ser negativos.");
      return;
    }

    try {
      setGuardando(true);
      setError("");

      // Primero subimos la imagen a Cloudinary
      const datosImagen = await subirImagen();

      const datosProducto = {
        nombre: formulario.nombre.trim(),
        codigo: formulario.codigo.trim(),
        imagen: datosImagen.imagen,
        imagenPublicId: datosImagen.publicId,
        precioCompra,
        precioVenta,
        cantidad,
      };

      if (editando) {
        // EDITAR
        await api.put(
          `/productos/${editando._id}`,
          datosProducto
        );

        alert("Producto actualizado correctamente.");
      } else {
        // CREAR
        await api.post("/productos", datosProducto);

        alert("Producto registrado correctamente.");
      }

      await obtenerProductos();

      cerrarFormulario();
    } catch (error) {
      console.error("Error al guardar producto:", error);

      const mensaje =
        error.response?.data?.mensaje ||
        "Ocurrió un error al guardar el producto.";

      alert(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================
  const eliminarProducto = async (producto) => {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${producto.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await api.delete(`/productos/${producto._id}`);

      await obtenerProductos();

      alert("Producto eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar producto:", error);

      alert(
        error.response?.data?.mensaje ||
          "No se pudo eliminar el producto."
      );
    }
  };

  // ==========================================
// CAMBIAR ESTADO DE APARTADO
// ==========================================
const cambiarApartado = async (producto) => {
  try {
    const nuevoEstado = !Boolean(producto.apartado);

    console.log("Cambiando apartado:", {
      producto: producto.nombre,
      apartado: nuevoEstado,
    });

    await api.patch(
      `/productos/${producto._id}/apartado`,
      {
        apartado: nuevoEstado,
      }
    );

    await obtenerProductos();
  } catch (error) {
    console.error(
      "Error al cambiar estado de apartado:",
      error
    );

    alert(
      error.response?.data?.mensaje ||
        "No se pudo cambiar el estado del producto."
    );
  }
};

// ==========================================
// FILTRAR Y ORDENAR PRODUCTOS
// ==========================================
const productosFiltrados = productos
  .filter((producto) => {
    // ------------------------------
    // BUSCADOR
    // ------------------------------
    const texto = busqueda.toLowerCase().trim();

    const nombre = producto.nombre?.toLowerCase() || "";
    const codigo = producto.codigo?.toLowerCase() || "";

    const coincideBusqueda =
      !texto ||
      nombre.includes(texto) ||
      codigo.includes(texto);

    if (!coincideBusqueda) {
      return false;
    }

    // ------------------------------
    // FILTRO DE EXISTENCIA
    // ------------------------------
    const cantidad = Number(producto.cantidad) || 0;

    if (filtro === "disponibles") {
      return cantidad > 0;
    }

    if (filtro === "agotados") {
      return cantidad === 0;
    }

    return true;
  })
  .sort((a, b) => {
    // ------------------------------
    // ORDENAMIENTO
    // ------------------------------

    const nombreA = a.nombre?.toLowerCase() || "";
    const nombreB = b.nombre?.toLowerCase() || "";

    const precioA = Number(a.precioVenta) || 0;
    const precioB = Number(b.precioVenta) || 0;

    const cantidadA = Number(a.cantidad) || 0;
    const cantidadB = Number(b.cantidad) || 0;

    switch (orden) {
      case "nombre-az":
        return nombreA.localeCompare(nombreB);

      case "nombre-za":
        return nombreB.localeCompare(nombreA);

      case "precio-menor":
        return precioA - precioB;

      case "precio-mayor":
        return precioB - precioA;

      case "cantidad-mayor":
        return cantidadB - cantidadA;

      case "cantidad-menor":
        return cantidadA - cantidadB;

      default:
        return 0;
    }
  });

  // ==========================================
  // CALCULAR GANANCIA EN EL FORMULARIO
  // ==========================================
  const gananciaFormulario =
    formulario.precioCompra !== "" &&
    formulario.precioVenta !== ""
      ? Number(formulario.precioVenta) -
        Number(formulario.precioCompra)
      : 0;

  // ==========================================
  // FORMATO DE DINERO
  // ==========================================
  const mostrarPrecio = (valor) => {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return "Sin dato";
    }

    return `$${numero.toFixed(2)}`;
  };

  return (
    <div className="productos-page">

      {/* ======================================
          ENCABEZADO
      ====================================== */}
      <div className="productos-header">

        <div>
          <h1>Productos</h1>

          <p>
            Administra los juguetes de tu inventario
          </p>
        </div>

        <button
          className="btn-nuevo"
          onClick={abrirNuevoProducto}
        >
          + Nuevo producto
        </button>

      </div>

      {/* ======================================
          BUSCADOR
      ====================================== */}
      <div className="productos-toolbar">

        {/* BUSCADOR */}
        <div className="buscador-con-escaneo">
          <input
            type="text"
            placeholder="🔎 Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <button
            type="button"
            className="btn-escanear"
            onClick={() => solicitarEscaneo("buscar")}
          >
            📷 Escanear código
          </button>
        </div>

        {/* FILTRO */}
        <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
        >
            <option value="todos">
            Todos los productos
            </option>

            <option value="disponibles">
            Disponibles
            </option>

            <option value="agotados">
            Agotados
            </option>
        </select>

        {/* ORDEN */}
        <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
        >
            <option value="nombre-az">
            Nombre A → Z
            </option>

            <option value="nombre-za">
            Nombre Z → A
            </option>

            <option value="precio-menor">
            Precio menor → mayor
            </option>

            <option value="precio-mayor">
            Precio mayor → menor
            </option>

            <option value="cantidad-mayor">
            Mayor cantidad
            </option>

            <option value="cantidad-menor">
            Menor cantidad
            </option>
        </select>

        </div>

      {/* ======================================
          CARGANDO
      ====================================== */}
      {cargando && (
        <p className="mensaje">
          Cargando productos...
        </p>
      )}

      {/* ======================================
          ERROR
      ====================================== */}
      {error && (
        <p className="mensaje error">
          {error}
        </p>
      )}

      {/* ======================================
          PRODUCTOS
      ====================================== */}
      {!cargando && !error && (
        <div className="productos-contador">
            Mostrando{" "}
            <strong>{productosFiltrados.length}</strong>{" "}
            de <strong>{productos.length}</strong> productos
        </div>
        )}

      {!cargando && !error && (
        <div className="productos-lista">

          <div className="productos-lista-header">
            <span>Producto</span>
            <span>Código</span>
            <span>Compra</span>
            <span>Venta</span>
            <span>Ganancia</span>
            <span>Cantidad</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {productosFiltrados.map((producto) => (
            <div
              className={`producto-fila ${
                producto.apartado ? "producto-fila-apartado" : ""
              }`}
              key={producto._id}
            >

              <div className="producto-col producto-col-producto">

                <div className="producto-imagen-mini">
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                    />
                  ) : (
                    <div className="sin-imagen-mini">
                      🧸
                    </div>
                  )}
                </div>

                <div className="producto-datos">
                  <strong>{producto.nombre}</strong>
                  <span>{producto.codigo}</span>
                </div>

              </div>

              <div className="producto-col producto-col-codigo">
                {producto.codigo}
              </div>

              <div className="producto-col">
                {mostrarPrecio(producto.precioCompra)}
              </div>

              <div className="producto-col">
                {mostrarPrecio(producto.precioVenta)}
              </div>

              <div className="producto-col producto-ganancia">
                {mostrarPrecio(producto.ganancia)}
              </div>

              <div className="producto-col producto-cantidad">
                {Number(producto.cantidad) || 0}
              </div>

              <div className="producto-col producto-estado-col">
                  <button
                    type="button"
                    className={
                      producto.apartado
                        ? "estado-apartado"
                        : Number(producto.cantidad) > 0
                        ? "estado-disponible"
                        : "estado-agotado"
                    }
                    onClick={() => cambiarApartado(producto)}
                    title={
                      producto.apartado
                        ? "Hacer disponible"
                        : "Marcar como apartado"
                    }
                  >
                    {producto.apartado
                      ? "🟡 Apartado"
                      : Number(producto.cantidad) > 0
                      ? "🟢 Disponible"
                      : "🔴 Agotado"}
                  </button>

                </div>

              <div className="producto-acciones">

                <button
                  className="btn-editar"
                  onClick={() =>
                    abrirEditarProducto(producto)
                  }
                >
                  Editar
                </button>

                <button
                  className="btn-eliminar"
                  onClick={() =>
                    eliminarProducto(producto)
                  }
                >
                  Eliminar
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

      {/* ======================================
          SIN RESULTADOS
      ====================================== */}
      {!cargando &&
        !error &&
        productosFiltrados.length === 0 && (
          <p className="mensaje">
            No se encontraron productos.
          </p>
        )}

      {/* ======================================
          MODAL NUEVO / EDITAR
      ====================================== */}
      {mostrarFormulario && (
        <div
          className="modal-fondo"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarFormulario();
            }
          }}
        >

          <div className="modal">

            <div className="modal-header">

              <div>
                <h2>
                  {editando
                    ? "Editar producto"
                    : "Nuevo producto"}
                </h2>

                <p>
                  {editando
                    ? "Actualiza la información del juguete"
                    : "Registra un nuevo juguete"}
                </p>
              </div>

              <button
                className="btn-cerrar"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarProducto}>

              {/* IMAGEN */}
              <div className="formulario-imagen">

                <div className="imagen-preview">

                  {imagenPreview ? (
                    <img
                      src={imagenPreview}
                      alt="Vista previa"
                    />
                  ) : (
                    <div className="preview-vacio">
                      📷
                      <span>
                        Sin imagen
                      </span>
                    </div>
                  )}

                </div>

                <label className="btn-seleccionar-imagen">

                  📷{" "}
                  {imagenArchivo
                    ? "Cambiar imagen"
                    : "Seleccionar imagen"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={seleccionarImagen}
                  />

                </label>

                <small>
                  Máximo 5 MB
                </small>

              </div>

              {/* NOMBRE */}
              <div className="campo">

                <label>
                  Nombre del producto
                </label>

                <input
                  type="text"
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  placeholder="Ej. Barbie Princesa"
                  required
                />

              </div>

              {/* CÓDIGO */}
              <div className="campo">

                <label>
                  Código de barras
                </label>

                <div className="codigo-con-escaneo">
                  <input type="text" name="codigo" value={formulario.codigo} onChange={cambiarCampo} placeholder="Ej. 750123456789" required />
                  <button type="button" className="btn-escanear" onClick={() => solicitarEscaneo("nuevo")}>📷 Escanear</button>
                </div>
                {escaneando && <small className="mensaje-escaneo">Esperando código del celular...</small>}

              </div>

              {/* PRECIOS */}
              <div className="campos-dos">

                <div className="campo">

                  <label>
                    Precio de compra
                  </label>

                  <input
                    type="number"
                    name="precioCompra"
                    value={formulario.precioCompra}
                    onChange={cambiarCampo}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />

                </div>

                <div className="campo">

                  <label>
                    Precio de venta
                  </label>

                  <input
                    type="number"
                    name="precioVenta"
                    value={formulario.precioVenta}
                    onChange={cambiarCampo}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />

                </div>

              </div>

              {/* GANANCIA */}
              <div
                className={`ganancia-preview ${
                  gananciaFormulario < 0
                    ? "ganancia-negativa"
                    : ""
                }`}
              >

                <span>
                  Ganancia
                </span>

                <strong>
                  {mostrarPrecio(
                    gananciaFormulario
                  )}
                </strong>

              </div>

              {/* CANTIDAD */}
              <div className="campo">

                <label>
                  Cantidad
                </label>

                <input
                  type="number"
                  name="cantidad"
                  value={formulario.cantidad}
                  onChange={cambiarCampo}
                  placeholder="0"
                  min="0"
                  step="1"
                  required
                />

              </div>

              {/* BOTONES */}
              <div className="modal-acciones">

                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarFormulario}
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
                    ? "Guardando..."
                    : editando
                    ? "Guardar cambios"
                    : "Guardar producto"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </div>
  );
}

export default Productos;