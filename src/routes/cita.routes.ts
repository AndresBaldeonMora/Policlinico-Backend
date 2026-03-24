// src/routes/cita.routes.ts

import express from "express";
import {
  crearCita,
  listarCitas,
  reprogramarCita,
  obtenerCitasCalendario,
    obtenerCitaPorId,
    cancelarCita
} from "../controllers/cita.controller";


const router = express.Router();

router.get("/calendario", obtenerCitasCalendario);

router.post("/", crearCita);
router.get("/", listarCitas);
router.get("/:id", obtenerCitaPorId);
router.put("/:id/reprogramar", reprogramarCita);
router.put("/:id/cancelar", cancelarCita);


export default router;
