import { Router } from "express";
import {
  crearOrden,
  listarOrdenesPorPaciente,
  listarOrdenesPorCita,
  listarOrdenesPendientes,
  obtenerOrden,
  cargarResultados,
  cancelarOrden,
  actualizarOrden,
} from "../controllers/examen.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = Router();

// Órdenes de examen (solo MEDICO puede crear)
router.post("/",                          verifyToken, requireRole(["MEDICO"]), crearOrden);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/paciente/:pacienteId",       listarOrdenesPorPaciente);
router.get("/cita/:citaId",               listarOrdenesPorCita);
router.get("/:id",                        obtenerOrden);
router.patch("/:id/resultados",           cargarResultados);
router.patch("/:id/cancelar",             cancelarOrden);
router.patch("/:id",                      verifyToken, requireRole(["MEDICO"]), actualizarOrden);

export default router;
