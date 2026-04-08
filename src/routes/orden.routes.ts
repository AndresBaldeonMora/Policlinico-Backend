import { Router } from "express";
import {
  crearOrden,
  listarOrdenesPorPaciente,
  listarOrdenesPorCita,
  listarOrdenesPendientes,
  listarOrdenesSinCitaLab,
  obtenerOrden,
  obtenerOrdenParaImprimir,
  buscarOrdenPorCodigo,
  cargarResultados,
  cancelarOrden,
  actualizarOrden,
  generarCitaLab,
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import { AuditLog } from "../models/AuditLog";
const router = Router();

// Órdenes de examen (solo MEDICO puede crear)
router.post("/",                          verifyToken, requireRole(["MEDICO"]), crearOrden);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/sin-cita-lab",               listarOrdenesSinCitaLab);
router.get("/buscar",                     buscarOrdenPorCodigo);
router.get("/audit-logs", async (_req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(20);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/paciente/:pacienteId",       listarOrdenesPorPaciente);
router.get("/cita/:citaId",               listarOrdenesPorCita);
router.get("/:id",                        obtenerOrden);
router.get("/:id/imprimir",               obtenerOrdenParaImprimir);
router.patch("/:id/generar-cita-lab",     generarCitaLab);
router.patch("/:id/resultados",           cargarResultados);
router.patch("/:id/cancelar",             cancelarOrden);
router.patch("/:id",                      verifyToken, requireRole(["MEDICO"]), actualizarOrden);

export default router;
