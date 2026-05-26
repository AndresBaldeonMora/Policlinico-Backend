import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  reporteOrdenesPorPeriodo,
  reporteExamenesMasSolicitados,
  reporteCitasPorPeriodo,
  reporteCitasPorEspecialidad,
} from "../controllers/reportes.controller";

const router = Router();

router.get("/ordenes-por-periodo",      verifyToken, requireRole(["administrador"]), reporteOrdenesPorPeriodo);
router.get("/examenes-mas-solicitados", verifyToken, requireRole(["administrador"]), reporteExamenesMasSolicitados);
router.get("/citas-por-periodo",        verifyToken, requireRole(["administrador"]), reporteCitasPorPeriodo);
router.get("/citas-por-especialidad",   verifyToken, requireRole(["administrador"]), reporteCitasPorEspecialidad);

export default router;