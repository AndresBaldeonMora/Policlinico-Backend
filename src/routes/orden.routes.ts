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

const router = Router();

// Órdenes de examen
router.post("/",                          crearOrden);
router.get("/pendientes",                 listarOrdenesPendientes);
router.get("/paciente/:pacienteId",       listarOrdenesPorPaciente);
router.get("/cita/:citaId",               listarOrdenesPorCita);
router.get("/:id",                        obtenerOrden);
router.patch("/:id/resultados",           cargarResultados);
router.patch("/:id/cancelar",             cancelarOrden);

export default router;
