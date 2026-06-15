import { Router } from "express";
import { verifyToken, requirePaciente, requireRole } from "../middlewares/authMiddlewares";
import { crearReclamacion, listarReclamaciones,gestionarReclamacion } from "../controllers/reclamacion.controller";

const router = Router();

// Todas las rutas requieren un token válido
router.use(verifyToken);

// Registrar una queja/reclamo
router.post("/", requirePaciente, crearReclamacion);

// Listar quejas/reclamos (exclusivo para administradores)
router.get("/", requireRole(["ADMINISTRADOR"]), listarReclamaciones);
router.patch("/:id/gestionar", requireRole(["ADMINISTRADOR"]), gestionarReclamacion);
export default router;
