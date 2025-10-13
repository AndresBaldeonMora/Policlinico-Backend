import express from "express";
import {
  crearPaciente,
  listarPacientes,
  obtenerPaciente,
  actualizarPaciente,
  eliminarPaciente,
} from "../controllers/paciente.controller";

const router = express.Router();

// /api/pacientes
router.post("/", crearPaciente);
router.get("/", listarPacientes);
router.get("/:id", obtenerPaciente);
router.put("/:id", actualizarPaciente);
router.delete("/:id", eliminarPaciente);

export default router;
