const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    imagen: {
      type: String,
      default: "",
    },

    // Identificador de la imagen dentro de Cloudinary.
    // Nos permitirá eliminar o reemplazar la imagen posteriormente.
    imagenPublicId: {
      type: String,
      default: "",
    },

    precioCompra: {
      type: Number,
      required: true,
      min: 0,
    },

    precioVenta: {
      type: Number,
      required: true,
      min: 0,
    },

    ganancia: {
      type: Number,
      default: 0,
    },

    cantidad: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    apartado: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Producto", productoSchema);