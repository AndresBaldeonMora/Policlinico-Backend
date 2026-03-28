// src/routes/cita.routes.ts

import express from "express";
import {
  crearCita,
  listarCitas,
  reprogramarCita,
  obtenerCitasCalendario,
  obtenerCitaPorId,
  cancelarCita,
  cambiarEstadoCita,
} from "../controllers/cita.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.get("/calendario", obtenerCitasCalendario);

router.post("/", crearCita);
router.get("/", listarCitas);
router.get("/:id", obtenerCitaPorId);
router.put("/:id/reprogramar", reprogramarCita);
router.put("/:id/cancelar", cancelarCita);
router.patch("/:id/estado", verifyToken, requireRole(["RECEPCIONISTA", "MEDICO"]), cambiarEstadoCita);


export default router;
