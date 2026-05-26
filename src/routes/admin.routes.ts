import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  toggleActivoUsuario,
  resetearPassword,
} from "../controllers/admin.controller";
import {
  listarAuditoria,
  opcionesAuditoria,
} from "../controllers/auditoria.controller";

const router = Router();

// Todas las rutas de este módulo exigen sesión válida y rol ADMINISTRADOR.
router.use(verifyToken, requireRole(["ADMINISTRADOR"]));

// ── Gestión de usuarios del sistema ──
router.get("/usuarios",                  listarUsuarios);
router.get("/usuarios/:id",              obtenerUsuario);
router.post("/usuarios",                 crearUsuario);
router.patch("/usuarios/:id",            actualizarUsuario);
router.patch("/usuarios/:id/toggle",     toggleActivoUsuario);
router.post("/usuarios/:id/reset-password", resetearPassword);

// ── Visor de auditoría ──
router.get("/auditoria",          listarAuditoria);
router.get("/auditoria/opciones", opcionesAuditoria);

export default router;
