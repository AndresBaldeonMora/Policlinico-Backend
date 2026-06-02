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
} from "../controllers/cita.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);

const STAFF_AGENDA = ["ADMINISTRADOR", "RECEPCIONISTA"];
const STAFF_LECTURA = ["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"];

// Lectura / consulta de agenda y citas
router.get("/calendario",      requireRole(STAFF_LECTURA), obtenerCitasCalendario);
router.get("/",                requireRole(STAFF_LECTURA), listarCitas);
// PACIENTE incluido — el controller cruza ?correo= con su pacienteId del token
router.get("/historial",       requireRole([...STAFF_LECTURA, "PACIENTE"]), obtenerHistorialCitas);
router.get("/historial/:id",   requireRole(STAFF_LECTURA), obtenerDetalleCitaHistorial);
router.get("/:id/auditoria",   requireRole(STAFF_LECTURA), obtenerAuditoriaCita);
router.get("/:id",             requireRole(STAFF_LECTURA), obtenerCitaPorId);

// Reservar cita — PACIENTE puede auto-reservar (handler valida pacienteId del token)
router.post("/",                   requireRole([...STAFF_AGENDA, "PACIENTE"]), crearCita);
router.put("/:id/reprogramar",     requireRole(STAFF_AGENDA), reprogramarCita);
// Cancelar — PACIENTE puede cancelar SU PROPIA cita (handler valida ownership)
router.put("/:id/cancelar",        requireRole([...STAFF_AGENDA, "MEDICO", "PACIENTE"]), cancelarCita);
router.patch("/:id/estado",        requireRole([...STAFF_AGENDA, "MEDICO"]), cambiarEstado);
router.patch("/:id",               requireRole(STAFF_AGENDA), actualizarCita);
router.patch("/:id/marcar-asistencia", requireRole(STAFF_AGENDA), marcarAsistencia);

// Eliminar — sólo admin.
router.delete("/:id", requireRole(["ADMINISTRADOR"]), eliminarCita);

export default router;
