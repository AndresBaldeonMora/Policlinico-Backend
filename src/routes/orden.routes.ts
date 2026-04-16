import { Router } from "express";
import {
  crearOrden,
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
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import { upload } from "../config/cloudinary";
import { AuditLog } from "../models/AuditLog";

const router = Router();

// ── Lectura y búsqueda ──────────────────────────────────────
router.get("/",                           listarOrdenesPorEstado);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/buscar",                     buscarOrdenPorCodigo);
// Disponibilidad del laboratorio por día (para selector de fecha en "Generar Orden")
router.get("/disponibilidad-lab",         obtenerDisponibilidadLab);
router.get("/paciente/:pacienteId",       listarOrdenesPorPaciente);
router.get("/cita/:citaId",               listarOrdenesPorCita);
router.get("/:id",                        obtenerOrden);
router.get("/:id/imprimir",               obtenerOrdenParaImprimir);

// ── Creación (solo MEDICO) ──────────────────────────────────
router.post("/",                          verifyToken, requireRole(["MEDICO"]), crearOrden);

// ── Flujo clínico de la orden ───────────────────────────────
// 1. Recepción autoriza la orden → PENDIENTE → EN_PROCESO
router.patch("/:id/autorizar",            verifyToken, autorizarOrden);

// 2. Recepción registra asistencia del paciente → EN_PROCESO → ASISTIDO
router.patch("/:id/registrar-asistencia", verifyToken, registrarAsistencia);

// 3. Laboratorio carga resultados (PDF) → ASISTIDO → FINALIZADO + envío de correo
router.patch("/:id/finalizar",            verifyToken, upload.single("archivo"), finalizarOrden);

// ── Procesamiento de vencimiento en lote ────────────────────
// Se invoca al abrir el módulo de Gestión de Órdenes
router.post("/vencimiento",               procesarVencidas);

// ── Acciones de compatibilidad / uso médico ─────────────────
router.patch("/:id/resultados",           verifyToken, cargarResultados);
router.post("/:id/subir-archivo",         verifyToken, upload.single("archivo"), subirArchivoResultado);
router.patch("/:id/cancelar",             cancelarOrden);
router.patch("/:id",                      verifyToken, requireRole(["MEDICO"]), actualizarOrden);

// ── Diagnóstico de audit logs ────────────────────────────────
router.get("/audit-logs", async (_req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(20);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
