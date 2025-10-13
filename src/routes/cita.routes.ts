import express from "express";
import {
  crearCita,
  listarCitas,
  obtenerCita,
  eliminarCita,
} from "../controllers/cita.controller";

const router = express.Router();

router.post("/", crearCita);
router.get("/", listarCitas);
router.get("/:id", obtenerCita);
router.delete("/:id", eliminarCita);

export default router;
