import express from "express";
import {
  crearCita,
  listarCitas,
  reprogramarCita,
  obtenerCitasCalendario,
  obtenerCitaPorId,
  cancelarCita,
  cambiarEstado,
  marcarAsistencia,
  obtenerHistorialCitas,
  obtenerDetalleCitaHistorial,
  obtenerAuditoriaCita,
  actualizarCita,
  eliminarCita,
  listarCitasAfectadas,
  reprogramarCitaAfectada,
} from "../controllers/cita.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);

const STAFF_AGENDA = ["ADMINISTRADOR", "RECEPCIONISTA"];
const STAFF_LECTURA = ["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"];

// Rutas estáticas primero (antes de /:id para evitar colisiones)
router.get("/calendario",      requireRole(STAFF_LECTURA), obtenerCitasCalendario);
router.get("/historial",       requireRole([...STAFF_LECTURA, "PACIENTE"]), obtenerHistorialCitas);
router.get("/afectadas",       requireRole(STAFF_AGENDA), listarCitasAfectadas);
router.get("/",                requireRole(STAFF_LECTURA), listarCitas);

// Rutas con parámetro :id
router.get("/historial/:id",   requireRole(STAFF_LECTURA), obtenerDetalleCitaHistorial);
router.get("/:id/auditoria",   requireRole(STAFF_LECTURA), obtenerAuditoriaCita);
router.get("/:id",             requireRole(STAFF_LECTURA), obtenerCitaPorId);

// Mutaciones
router.post("/",                             requireRole([...STAFF_AGENDA, "PACIENTE"]), crearCita);
router.post("/:id/reprogramar-afectada",     requireRole(STAFF_AGENDA), reprogramarCitaAfectada);
router.put("/:id/reprogramar",               requireRole(STAFF_AGENDA), reprogramarCita);
router.put("/:id/cancelar",                  requireRole([...STAFF_AGENDA, "MEDICO", "PACIENTE"]), cancelarCita);
router.patch("/:id/estado",                  requireRole([...STAFF_AGENDA, "MEDICO"]), cambiarEstado);
router.patch("/:id/marcar-asistencia",       requireRole(STAFF_AGENDA), marcarAsistencia);
router.patch("/:id",                         requireRole(STAFF_AGENDA), actualizarCita);

// Eliminar — sólo admin.
router.delete("/:id", requireRole(["ADMINISTRADOR"]), eliminarCita);

export default router;
