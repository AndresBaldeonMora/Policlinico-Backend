import express from "express";
import {
  crearCita,
  listarCitas,
  eliminarCita,
  reprogramarCita,
} from "../controllers/cita.controller";

const router = express.Router();

// 🟢 Crear nueva cita
router.post("/", crearCita);

// 🟣 Listar todas las citas
router.get("/", listarCitas);

// 🔵 Reprogramar cita (cambia fecha y hora)
router.put("/:id/reprogramar", reprogramarCita);

// 🔴 Eliminar cita
router.delete("/:id", eliminarCita);

export default router;
