import express from "express";
import {
  crearInterconsulta,
  listarRecibidas,
  listarEnviadas,
  responderInterconsulta,
  listarPorPaciente,
  obtenerPorId,
  agendarCitaInterconsulta,
  listarPendientesRecepcion,
  agendarDesdeRecepcion,
  cancelarInterconsulta,
} from "../controllers/interconsulta.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ── Solo MEDICO ───────────────────────────────────────────────────────────────
router.post("/",                      requireRole(["MEDICO"]), crearInterconsulta);
router.get("/recibidas",              requireRole(["MEDICO"]), listarRecibidas);
router.get("/enviadas",               requireRole(["MEDICO"]), listarEnviadas);
router.get("/paciente/:pacienteId",   requireRole(["MEDICO"]), listarPorPaciente);

// ── Solo RECEPCIONISTA ────────────────────────────────────────────────────────
router.get("/pendientes-recepcion",   requireRole(["RECEPCIONISTA"]), listarPendientesRecepcion);
router.post("/:id/agendar-recepcion", requireRole(["RECEPCIONISTA"]), agendarDesdeRecepcion);

// ── MEDICO + RECEPCIONISTA ────────────────────────────────────────────────────
// ⚠️ Rutas con :id deben ir DESPUÉS de las rutas estáticas para no shadowearlas
router.get("/:id",                    requireRole(["MEDICO", "RECEPCIONISTA"]), obtenerPorId);
router.patch("/:id/cancelar",         requireRole(["MEDICO", "RECEPCIONISTA"]), cancelarInterconsulta);

// ── Solo MEDICO (con :id) ─────────────────────────────────────────────────────
router.patch("/:id/responder",        requireRole(["MEDICO"]), responderInterconsulta);
router.post("/:id/agendar",           requireRole(["MEDICO"]), agendarCitaInterconsulta);

export default router;
