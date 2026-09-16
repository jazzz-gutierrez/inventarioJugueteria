const express = require("express");
const Producto = require("../models/producto");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// ==========================================
// OBTENER TODOS LOS PRODUCTOS
// ==========================================
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });

    res.json(productos);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener los productos",
      error: error.message,
    });
  }
});

// ==========================================
// BUSCAR PRODUCTOS
// ==========================================
router.get("/buscar", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const productos = await Producto.find({
      $or: [
        { nombre: { $regex: q, $options: "i" } },
        { codigo: { $regex: q, $options: "i" } },
      ],
    }).sort({ nombre: 1 });

    res.json(productos);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al buscar productos",
      error: error.message,
    });
  }
});

// ==========================================
// CAMBIAR ESTADO DE APARTADO
// ==========================================
router.patch("/:id/apartado", async (req, res) => {
  try {
    const { apartado } = req.body;

    if (typeof apartado !== "boolean") {
      return res.status(400).json({
        mensaje: "El estado de apartado no es válido",
      });
    }

    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    producto.apartado = apartado;

    await producto.save();

    res.json({
      mensaje: apartado
        ? "Producto marcado como apartado"
        : "Producto marcado como disponible",
      producto,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al cambiar el estado del producto",
      error: error.message,
    });
  }
});

// ==========================================
// OBTENER UN PRODUCTO POR ID
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener el producto",
      error: error.message,
    });
  }
});

// ==========================================
// CREAR PRODUCTO
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      codigo,
      imagen,
      imagenPublicId,
      precioCompra,
      precioVenta,
      cantidad,
    } = req.body;

    // Verificar si ya existe el código
    const productoExistente = await Producto.findOne({ codigo });

    if (productoExistente) {
      return res.status(400).json({
        mensaje: "Ya existe un producto con ese código de barras",
      });
    }

    // Calcular la ganancia automáticamente
    const ganancia = Number(precioVenta) - Number(precioCompra);

    const producto = new Producto({
      nombre,
      codigo,
      imagen: imagen || "",
      imagenPublicId: imagenPublicId || "",
      precioCompra: Number(precioCompra),
      precioVenta: Number(precioVenta),
      ganancia,
      cantidad: Number(cantidad),
    });

    await producto.save();

    res.status(201).json({
      mensaje: "Producto registrado correctamente",
      producto,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al registrar el producto",
      error: error.message,
    });
  }
});

// ==========================================
// EDITAR PRODUCTO
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    const {
      nombre,
      codigo,
      imagen,
      imagenPublicId,
      precioCompra,
      precioVenta,
      cantidad,
    } = req.body;

    // Verificar que el nuevo código no pertenezca a otro producto
    if (codigo && codigo !== producto.codigo) {
      const codigoExistente = await Producto.findOne({
        codigo,
        _id: { $ne: producto._id },
      });

      if (codigoExistente) {
        return res.status(400).json({
          mensaje: "Ya existe otro producto con ese código de barras",
        });
      }
    }

    // Si cambiamos la imagen, eliminar la anterior de Cloudinary
    if (
      imagenPublicId &&
      imagenPublicId !== producto.imagenPublicId &&
      producto.imagenPublicId
    ) {
      try {
        await cloudinary.uploader.destroy(producto.imagenPublicId);
      } catch (error) {
        console.error("No se pudo eliminar la imagen anterior:", error);
      }
    }

    producto.nombre = nombre;
    producto.codigo = codigo;
    producto.imagen = imagen || "";
    producto.imagenPublicId = imagenPublicId || "";
    producto.precioCompra = Number(precioCompra);
    producto.precioVenta = Number(precioVenta);
    producto.ganancia =
      Number(precioVenta) - Number(precioCompra);
    producto.cantidad = Number(cantidad);

    await producto.save();

    res.json({
      mensaje: "Producto actualizado correctamente",
      producto,
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el producto",
      error: error.message,
    });
  }
});

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================
router.delete("/:id", async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    // Eliminar imagen de Cloudinary si existe
    if (producto.imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(producto.imagenPublicId);
      } catch (error) {
        console.error(
          "No se pudo eliminar la imagen de Cloudinary:",
          error
        );
      }
    }

    await Producto.findByIdAndDelete(req.params.id);

    res.json({
      mensaje: "Producto eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar el producto",
      error: error.message,
    });
  }
});

module.exports = router;