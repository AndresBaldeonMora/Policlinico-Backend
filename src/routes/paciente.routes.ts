import express from "express";
import {
  crearPaciente,
  crearCuentaPaciente,
  listarPacientes,
  obtenerPaciente,
  buscarPacientePorDni,
  actualizarPaciente,
  eliminarPaciente,
  obtenerHistorial,
} from "../controllers/paciente.controller";

const router = express.Router();

router.post("/",                       crearPaciente);
router.post("/:id/crear-cuenta",       crearCuentaPaciente);
router.get("/",                        listarPacientes);
router.get("/dni/:dni",                buscarPacientePorDni);
router.get("/:id/historial",           obtenerHistorial);
router.get("/:id",                     obtenerPaciente);
router.put("/:id",                     actualizarPaciente);
router.delete("/:id",                  eliminarPaciente);

export default router;