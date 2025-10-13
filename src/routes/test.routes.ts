import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Endpoint para verificar conexión con MongoDB
router.get('/', async (req, res) => {
  try {
    // Estado actual de la conexión
    const estado = mongoose.connection.readyState;

    // 1 = conectado, 2 = conectando, 0 = desconectado
    const estados = ['Desconectado ❌', 'Conectado 🟢', 'Conectando...', 'Desconectado por error ⚠️'];

    res.json({
      success: true,
      estado: estados[estado],
      detalles: {
        host: mongoose.connection.host,
        nombreBD: mongoose.connection.name,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
