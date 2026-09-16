const express = require("express");
const mongoose = require("mongoose");

const Movimiento = require("../models/movimiento");
const Producto = require("../models/producto");

const router = express.Router();

// ==========================================
// OBTENER TODOS LOS MOVIMIENTOS
// ==========================================
router.get("/", async (req, res) => {
  try {
    const movimientos = await Movimiento.find()
      .populate("producto", "nombre codigo imagen cantidad")
      .sort({ createdAt: -1 });

    res.json(movimientos);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los movimientos",
      error: error.message,
    });
  }
});

// ==========================================
// OBTENER MOVIMIENTOS DE UN PRODUCTO
// ==========================================
router.get("/producto/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        mensaje: "ID de producto no válido",
      });
    }

    const movimientos = await Movimiento.find({
      producto: req.params.id,
    })
      .populate("producto", "nombre codigo imagen cantidad")
      .sort({ createdAt: -1 });

    res.json(movimientos);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los movimientos del producto",
      error: error.message,
    });
  }
});

// ==========================================
// REGISTRAR MOVIMIENTO
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { productoId, tipo, cantidad } = req.body;

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (!productoId) {
      return res.status(400).json({
        mensaje: "Debes seleccionar un producto",
      });
    }

    if (!["entrada", "salida"].includes(tipo)) {
      return res.status(400).json({
        mensaje: "El tipo de movimiento debe ser entrada o salida",
      });
    }

    const cantidadMovimiento = Number(cantidad);

    if (
      !Number.isInteger(cantidadMovimiento) ||
      cantidadMovimiento <= 0
    ) {
      return res.status(400).json({
        mensaje: "La cantidad debe ser un número entero mayor a 0",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productoId)) {
      return res.status(400).json({
        mensaje: "ID de producto no válido",
      });
    }

    // ==========================================
    // BUSCAR PRODUCTO
    // ==========================================

    const producto = await Producto.findById(productoId);

    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    // ==========================================
    // CALCULAR NUEVA CANTIDAD
    // ==========================================

    let nuevaCantidad;

    if (tipo === "entrada") {
      nuevaCantidad = producto.cantidad + cantidadMovimiento;
    } else {
      // Evitar inventario negativo
      if (cantidadMovimiento > producto.cantidad) {
        return res.status(400).json({
          mensaje: `No puedes sacar ${cantidadMovimiento} unidades. Solo hay ${producto.cantidad} disponibles.`,
        });
      }

      nuevaCantidad = producto.cantidad - cantidadMovimiento;
    }

    // ==========================================
    // ACTUALIZAR PRODUCTO
    // ==========================================

    producto.cantidad = nuevaCantidad;

    await producto.save();

    // ==========================================
    // GUARDAR MOVIMIENTO
    // ==========================================

    const movimiento = new Movimiento({
      producto: producto._id,
      tipo,
      cantidad: cantidadMovimiento,
    });

    await movimiento.save();

    // ==========================================
    // DEVOLVER INFORMACIÓN
    // ==========================================

    await movimiento.populate(
      "producto",
      "nombre codigo imagen cantidad"
    );

    res.status(201).json({
      mensaje:
        tipo === "entrada"
          ? "Entrada registrada correctamente"
          : "Salida registrada correctamente",

      movimiento,

      producto: {
        id: producto._id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        cantidadAnterior:
          tipo === "entrada"
            ? producto.cantidad - cantidadMovimiento
            : producto.cantidad + cantidadMovimiento,
        cantidadNueva: producto.cantidad,
      },
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al registrar el movimiento",
      error: error.message,
    });
  }
});

module.exports = router;