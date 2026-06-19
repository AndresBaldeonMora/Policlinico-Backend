import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  reporteOrdenesPorPeriodo,
  reporteExamenesMasSolicitados,
  reporteCitasPorPeriodo,
  reporteCitasPorEspecialidad,
} from "../controllers/reportes.controller";

const router = Router();

router.get("/ordenes-por-periodo",      verifyToken, requireRole(["ADMINISTRADOR"]), reporteOrdenesPorPeriodo);
router.get("/examenes-mas-solicitados", verifyToken, requireRole(["ADMINISTRADOR"]), reporteExamenesMasSolicitados);
router.get("/citas-por-periodo",        verifyToken, requireRole(["ADMINISTRADOR"]), reporteCitasPorPeriodo);
router.get("/citas-por-especialidad",   verifyToken, requireRole(["ADMINISTRADOR"]), reporteCitasPorEspecialidad);

export default router;