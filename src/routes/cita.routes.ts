// src/routes/cita.routes.ts

import express from "express";
import {
  crearCita,
  listarCitas,
  reprogramarCita,
  obtenerCitasCalendario,
} from "../controllers/cita.controller";

const router = express.Router();

router.get("/calendario", obtenerCitasCalendario);

router.post("/", crearCita);
router.get("/", listarCitas);
router.put("/:id/reprogramar", reprogramarCita);

export default router;
