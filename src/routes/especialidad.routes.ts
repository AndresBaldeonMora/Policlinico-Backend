import { Router } from "express";
import {
  listarEspecialidades,
  obtenerEspecialidad,
  crearEspecialidad,
  eliminarEspecialidad,
  actualizarEspecialidad,
} from "../controllers/especialidad.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = Router();

router.use(verifyToken);

// Lectura: cualquier rol autenticado.
router.get("/",     listarEspecialidades);
router.get("/:id",  obtenerEspecialidad);

// Escritura: sólo admin (catálogo crítico).
router.post("/",      requireRole(["ADMINISTRADOR"]), crearEspecialidad);
router.delete("/:id", requireRole(["ADMINISTRADOR"]), eliminarEspecialidad);
router.patch("/:id",  requireRole(["ADMINISTRADOR"]), actualizarEspecialidad);

export default router;
