import { Router } from "express";
import { verifyToken, requirePaciente, requireRole } from "../middlewares/authMiddlewares";
import { crearReclamacion, listarReclamaciones } from "../controllers/reclamacion.controller";

const router = Router();

// Todas las rutas requieren un token válido
router.use(verifyToken);

// Registrar una queja/reclamo
router.post("/", requirePaciente, crearReclamacion);

// Listar quejas/reclamos (exclusivo para administradores)
router.get("/", requireRole(["ADMINISTRADOR"]), listarReclamaciones);

export default router;
