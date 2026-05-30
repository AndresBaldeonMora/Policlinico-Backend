import { Router } from "express";
import {
  listarExamenes,
  obtenerExamen,
  crearExamen,
  actualizarExamen,
  eliminarExamen,
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = Router();

router.use(verifyToken);

// Catálogo: lectura para cualquier rol clínico/staff.
router.get("/",    requireRole(["ADMINISTRADOR", "MEDICO", "RECEPCIONISTA"]), listarExamenes);
router.get("/:id", requireRole(["ADMINISTRADOR", "MEDICO", "RECEPCIONISTA"]), obtenerExamen);

// Escritura: sólo admin.
router.post("/",      requireRole(["ADMINISTRADOR"]), crearExamen);
router.put("/:id",    requireRole(["ADMINISTRADOR"]), actualizarExamen);
router.delete("/:id", requireRole(["ADMINISTRADOR"]), eliminarExamen);

export default router;
