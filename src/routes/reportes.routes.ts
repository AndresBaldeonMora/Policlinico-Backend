import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  reporteOrdenesPorPeriodo,
  reporteExamenesMasSolicitados,
} from "../controllers/reportes.controller";

const router = Router();

router.get("/ordenes-por-periodo",      verifyToken, requireRole(["administrador"]), reporteOrdenesPorPeriodo);
router.get("/examenes-mas-solicitados", verifyToken, requireRole(["administrador"]), reporteExamenesMasSolicitados);

export default router;