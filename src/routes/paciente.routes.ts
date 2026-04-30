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
  actualizarHistorialClinico,
} from "../controllers/paciente.controller";

const router = express.Router();

router.post("/",                        crearPaciente);
router.get("/",                         listarPacientes);
router.get("/dni/:dni",                 buscarPacientePorDni);
router.get("/:id/historial",            obtenerHistorial);
router.patch("/:id/historial-clinico",  actualizarHistorialClinico);
router.get("/:id",                      obtenerPaciente);
router.put("/:id",                      actualizarPaciente);
router.delete("/:id",                   eliminarPaciente);

export default router;