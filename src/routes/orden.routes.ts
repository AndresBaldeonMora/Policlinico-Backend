import { Router } from "express";
import {
  crearOrden,
  crearOrdenRecepcion,
  listarOrdenesPorPaciente,
  listarOrdenesPorCita,
  listarOrdenesPendientes,
  listarOrdenesPorEstado,
  obtenerOrden,
  obtenerOrdenParaImprimir,
  buscarOrdenPorCodigo,
  cargarResultados,
  cancelarOrden,
  actualizarOrden,
  subirArchivoResultado,
  // Flujo clínico
  autorizarOrden,
  registrarAsistencia,
  finalizarOrden,
  procesarVencidas,
  obtenerDisponibilidadLab,
  obtenerDisponibilidadImagen,
  obtenerUrlResultadoFirmada,
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import { upload } from "../config/cloudinary";
import { AuditLog } from "../models/AuditLog";

const router = Router();

// Auth global. Roles específicos por endpoint debajo.
router.use(verifyToken);

const STAFF_LECTURA = ["ADMINISTRADOR", "MEDICO", "RECEPCIONISTA"];
const STAFF_RECEPCION = ["ADMINISTRADOR", "RECEPCIONISTA"];

// ── Audit logs (estática primero, sólo admin) ───────────────
router.get("/audit-logs", requireRole(["ADMINISTRADOR"]), async (_req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(20);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error consultando logs" });
  }
});

// ── Lectura y búsqueda ──────────────────────────────────────
router.get("/",                           requireRole(STAFF_LECTURA), listarOrdenesPorEstado);
router.get("/pendientes",                 requireRole(STAFF_LECTURA), listarOrdenesPendientes);
router.get("/buscar",                     requireRole(STAFF_LECTURA), buscarOrdenPorCodigo);
router.get("/disponibilidad-lab",         requireRole(STAFF_LECTURA), obtenerDisponibilidadLab);
router.get("/disponibilidad-imagen",      requireRole(STAFF_LECTURA), obtenerDisponibilidadImagen);
// PACIENTE incluido; el handler valida que pacienteId == token.pacienteId
router.get("/paciente/:pacienteId",       requireRole([...STAFF_LECTURA, "PACIENTE"]), listarOrdenesPorPaciente);
router.get("/cita/:citaId",               requireRole(STAFF_LECTURA), listarOrdenesPorCita);
// PACIENTE incluido; el handler valida ownership
router.get("/:id",                        requireRole([...STAFF_LECTURA, "PACIENTE"]), obtenerOrden);
router.get("/:id/imprimir",               requireRole([...STAFF_LECTURA, "PACIENTE"]), obtenerOrdenParaImprimir);

// URL temporal firmada para descargar el PDF de resultados.
// Roles autorizados validados dentro del handler (incluye PACIENTE dueño).
router.get("/:id/resultado-firmado", requireRole(["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO", "PACIENTE"]), obtenerUrlResultadoFirmada);

// ── Creación (médico) ──────────────────────────────────────
router.post("/",                          requireRole(["MEDICO"]), crearOrden);
// ── Creación directa (recepción) — pasa directo a EN_PROCESO
router.post("/recepcion",                 requireRole(STAFF_RECEPCION), crearOrdenRecepcion);

// ── Flujo clínico ──────────────────────────────────────────
router.patch("/:id/autorizar",            requireRole(STAFF_RECEPCION), autorizarOrden);
router.patch("/:id/registrar-asistencia", requireRole(STAFF_RECEPCION), registrarAsistencia);
router.patch("/:id/finalizar",            requireRole(STAFF_RECEPCION), upload.single("archivo"), finalizarOrden);

// ── Procesamiento de vencidos (job interno; sólo admin) ─────
router.post("/vencimiento",               requireRole(["ADMINISTRADOR"]), procesarVencidas);

// ── Compatibilidad / uso médico ────────────────────────────
router.patch("/:id/resultados",           requireRole(STAFF_RECEPCION), cargarResultados);
router.post("/:id/subir-archivo",         requireRole(STAFF_RECEPCION), upload.single("archivo"), subirArchivoResultado);
router.patch("/:id/cancelar",             requireRole(["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"]), cancelarOrden);
router.patch("/:id",                      requireRole(["MEDICO"]), actualizarOrden);

export default router;
