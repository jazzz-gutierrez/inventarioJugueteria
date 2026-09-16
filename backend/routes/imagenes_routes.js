const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// Guardar temporalmente la imagen en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // máximo 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"));
    }
  },
});

// POST /imagenes
router.post("/", upload.single("imagen"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        mensaje: "No se recibió ninguna imagen",
      });
    }

    const resultado = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "inventario_juguetes",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    res.status(201).json({
      mensaje: "Imagen subida correctamente",
      imagen: resultado.secure_url,
      publicId: resultado.public_id,
    });
  } catch (error) {
    console.error("Error al subir imagen:", error);

    res.status(500).json({
      mensaje: "Error al subir la imagen",
      error: error.message,
    });
  }
});

module.exports = router;