const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const productosRoutes = require("./routes/productos_routes");
const imagenesRoutes = require("./routes/imagenes_routes");
const movimientosRoutes = require("./routes/movimientos_routes");

const app = express();

// ==========================================
// SERVIDOR HTTP
// ==========================================

const server = http.createServer(app);

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// ==========================================
// MIDDLEWARES
// ==========================================

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

// ==========================================
// RUTAS
// ==========================================

app.use("/productos", productosRoutes);
app.use("/imagenes", imagenesRoutes);
app.use("/movimientos", movimientosRoutes);

// ==========================================
// RUTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
  res.json({
    mensaje: "Servidor del almacén funcionando correctamente",
  });
});

// ==========================================
// CONEXIÓN SOCKET.IO
// ==========================================

io.on("connection", (socket) => {
  console.log("📱 Dispositivo conectado:", socket.id);

  // ========================================
  // RECIBIR CÓDIGO ESCANEADO
  // ========================================

  socket.on("codigo_escaneado", async (datos) => {
    try {
      console.log("=================================");
      console.log("📷 CÓDIGO RECIBIDO DESDE ANDROID");
      console.log("Código:", datos?.codigo);
      console.log("=================================");

      const codigo = datos?.codigo;

      // Validar que se haya recibido un código
      if (!codigo) {
        io.emit("resultado_codigo", {
          encontrado: false,
          mensaje: "No se recibió ningún código.",
        });

        return;
      }

      const Producto = require("./models/producto");

      // Buscar el producto por código
      const producto = await Producto.findOne({
        codigo: String(codigo).trim(),
      });

      // Si no existe el producto
      if (!producto) {
        console.log("❌ Producto no encontrado");

        io.emit("resultado_codigo", {
          encontrado: false,
          codigo: String(codigo).trim(),
          mensaje: "Producto no encontrado.",
        });

        return;
      }

      // Si el producto existe
      console.log("✅ Producto encontrado:", producto.nombre);

      io.emit("resultado_codigo", {
        encontrado: true,
        codigo: String(codigo).trim(),
        producto,
      });
    } catch (error) {
      console.error(
        "Error al procesar el código escaneado:",
        error.message
      );

      io.emit("resultado_codigo", {
        encontrado: false,
        mensaje: "Error al buscar el producto.",
      });
    }
  });

  // ========================================
  // DESCONECTAR DISPOSITIVO
  // ========================================

  socket.on("disconnect", () => {
    console.log("📱 Dispositivo desconectado:", socket.id);
  });
});

// ==========================================
// PUERTO
// ==========================================

const PORT = process.env.PORT || 3000;
// ==========================================
// CONECTAR MONGODB Y ENCENDER SERVIDOR
// ==========================================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB conectado correctamente");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Servidor funcionando en http://localhost:${PORT}`
      );

      console.log(
        `Disponible en la red local en el puerto ${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB:");
    console.error(error.message);
  });