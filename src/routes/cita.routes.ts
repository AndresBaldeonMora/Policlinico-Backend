import express from "express";
import {
  crearCita,
  listarCitas,
  reprogramarCita,
} from "../controllers/cita.controller";

const router = express.Router();

// 🟢 Crear nueva cita
router.post("/", crearCita);

// 🟣 Listar todas las citas
router.get("/", listarCitas);

// 🔵 Reprogramar cita (cambia fecha y hora)
router.put("/:id/reprogramar", reprogramarCita);


export default router;
