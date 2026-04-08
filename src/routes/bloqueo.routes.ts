import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  crearBloqueo,
  listarBloqueos,
  desactivarBloqueo,
  verificarBloqueo,
} from "../controllers/bloqueo.controller";

const router = Router();

// POST   /api/bloqueos              — crear bloqueo (requiere RECEPCIONISTA)
router.post("/", verifyToken, requireRole(["RECEPCIONISTA", "recepcionista", "administrador"]), crearBloqueo);

// GET    /api/bloqueos?doctorId=&mes=&anio=  — listar bloqueos filtrados
router.get("/", listarBloqueos);

// DELETE /api/bloqueos/:id          — desactivar bloqueo (requiere RECEPCIONISTA)
router.delete("/:id", verifyToken, requireRole(["RECEPCIONISTA", "recepcionista", "administrador"]), desactivarBloqueo);

// GET    /api/bloqueos/doctor/:doctorId/fecha/:fecha  — verificar si un día está bloqueado
router.get("/doctor/:doctorId/fecha/:fecha", verificarBloqueo);

export default router;
