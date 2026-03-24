import express from "express";
import {
  crearPaciente,
  listarPacientes,
  obtenerPaciente,
  buscarPacientePorDni,
  actualizarPaciente,
} from "../controllers/paciente.controller";

const router = express.Router();

router.post("/",              crearPaciente);
router.get("/",               listarPacientes);
router.get("/dni/:dni",       buscarPacientePorDni);
router.get("/:id",            obtenerPaciente);
router.put("/:id",            actualizarPaciente);   // ✅ nuevo

export default router;