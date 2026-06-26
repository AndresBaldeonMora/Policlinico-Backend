import express from "express";
import {
  crearHorario,
  verificarDisponibilidad,
  reservarHorario,
  obtenerSlotsPorMes,
  crearSlotsBulk,
  eliminarSlotsBulk,
} from "../controllers/horario.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);

const SOLO_ADMIN = requireRole(["ADMINISTRADOR"]);

// Gestión mensual (admin)
router.get("/doctor/:doctorId",  SOLO_ADMIN, obtenerSlotsPorMes);
router.post("/bulk",             SOLO_ADMIN, crearSlotsBulk);
router.delete("/bulk",           SOLO_ADMIN, eliminarSlotsBulk);

// CRUD individual
router.post("/",    SOLO_ADMIN, crearHorario);
router.put("/reservar", requireRole(["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO", "PACIENTE"]), reservarHorario);
router.get("/:doctorId/:fecha/:hora", verificarDisponibilidad);

export default router;
