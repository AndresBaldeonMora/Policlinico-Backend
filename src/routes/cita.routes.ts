// src/routes/cita.routes.ts

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
} from "../controllers/cita.controller";


const router = express.Router();

router.get("/calendario", obtenerCitasCalendario);

router.post("/", crearCita);
router.get("/", listarCitas);
router.get("/historial", obtenerHistorialCitas);
router.get("/historial/:id", obtenerDetalleCitaHistorial);
router.get("/:id", obtenerCitaPorId);
router.put("/:id/reprogramar", reprogramarCita);
router.put("/:id/cancelar", cancelarCita);
router.patch("/:id/estado", cambiarEstado); 
router.patch("/:id/marcar-asistencia", marcarAsistencia);


export default router;
