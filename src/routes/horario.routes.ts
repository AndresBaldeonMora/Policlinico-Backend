import express from "express";
import {
  crearHorario,
  verificarDisponibilidad,
  reservarHorario,
} from "../controllers/horario.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);

// Crear horario: sólo admin (gestión de agenda del centro).
router.post("/", requireRole(["ADMINISTRADOR"]), crearHorario);

// Verificar disponibilidad: cualquier rol autenticado (paciente al reservar, recepción, médico).
router.get("/:doctorId/:fecha/:hora", verificarDisponibilidad);

// Reservar: recepción, médico, paciente (cuando el self-service lo soporte).
router.put("/reservar", requireRole(["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO", "PACIENTE"]), reservarHorario);

export default router;
