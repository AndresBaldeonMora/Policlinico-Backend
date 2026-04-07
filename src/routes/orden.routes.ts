import { Router } from "express";
import {
  crearOrden,
  listarOrdenesPorPaciente,
  listarOrdenesPorCita,
  listarOrdenesPendientes,
  obtenerOrden,
  cargarResultados,
  cancelarOrden,
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import { AuditLog } from "../models/AuditLog";
const router = Router();

// Órdenes de examen (solo MEDICO puede crear)
router.post("/", verifyToken, requireRole(["MEDICO"]), crearOrden);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/audit-logs", async (_req, res) => {  // ← antes de /:id
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
router.patch("/:id/resultados",           cargarResultados);
router.patch("/:id/cancelar",             cancelarOrden);

export default router;
