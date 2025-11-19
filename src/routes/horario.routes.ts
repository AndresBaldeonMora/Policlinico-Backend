import express from "express";
import {
  crearHorario,
  verificarDisponibilidad,
  reservarHorario,
} from "../controllers/horario.controller";

const router = express.Router();

// Crear nuevo horario
router.post("/", crearHorario);

// Verificar disponibilidad de horario
router.get("/:doctorId/:fecha/:hora", verificarDisponibilidad);

// Reservar horario
router.put("/reservar", reservarHorario);

export default router;
