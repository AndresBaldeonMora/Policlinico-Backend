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

const router = Router();

// Órdenes de examen (solo MEDICO puede crear)
router.post("/", verifyToken, requireRole(["MEDICO"]), crearOrden);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/paciente/:pacienteId",       listarOrdenesPorPaciente);
router.get("/cita/:citaId",               listarOrdenesPorCita);
router.get("/:id",                        obtenerOrden);
router.patch("/:id/resultados",           cargarResultados);
router.patch("/:id/cancelar",             cancelarOrden);

export default router;
