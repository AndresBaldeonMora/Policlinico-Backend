import express from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  guardarHorarioMensual,
  obtenerHorarioMensual,
} from "../controllers/horarioMensual.controller";

const router = express.Router();

// Admin y recepción gestionan los horarios mensuales de los médicos.
const STAFF_AGENDA = ["ADMINISTRADOR", "RECEPCIONISTA"];

router.use(verifyToken);

router.post("/", requireRole(STAFF_AGENDA), guardarHorarioMensual);
router.get("/", requireRole(STAFF_AGENDA), obtenerHorarioMensual);

export default router;
