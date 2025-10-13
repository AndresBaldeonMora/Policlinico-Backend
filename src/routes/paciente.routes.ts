import express from 'express';
import Paciente from '../models/Paciente';
const router = express.Router();

// Ping (salud del módulo)
router.get('/', (_req, res) => {
  res.json({ message: 'Rutas de Pacientes funcionando 🚑' });
});

// Seed rápido para probar DB (crea un paciente)
router.post('/seed', async (_req, res, next) => {
  try {
    const p = await Paciente.create({
      nombres: 'Juan',
      apellidos: 'Pérez',
      dni: String(Math.floor(Math.random()*90000000)+10000000),
      telefono: '999999999',
    });
    res.json({ ok: true, paciente: p });
  } catch (e) { next(e); }
});

export default router;
