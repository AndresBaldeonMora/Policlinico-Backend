import express from "express";
import {
  crearPaciente,
  listarPacientes,
  obtenerPaciente,
  buscarPacientePorDni,
  actualizarPaciente,
  eliminarPaciente,
  obtenerHistorial,
  actualizarHistorialClinico,
  actualizarHistoriaClinicaEspecialidad,
} from "../controllers/paciente.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

// Todas las rutas requieren autenticación.
router.use(verifyToken);

// Recepción y admin gestionan el padrón de pacientes.
const STAFF_PADRON = ["ADMINISTRADOR", "RECEPCIONISTA"];

// Pueden consultar pacientes: cualquier rol clínico/staff.
const PUEDE_CONSULTAR = ["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"];

router.post("/",                                requireRole(STAFF_PADRON), crearPaciente);
router.get("/",                                 requireRole(PUEDE_CONSULTAR), listarPacientes);
router.get("/dni/:dni",                         requireRole(PUEDE_CONSULTAR), buscarPacientePorDni);
router.get("/:id/historial",                    requireRole(PUEDE_CONSULTAR), obtenerHistorial);
router.patch("/:id/historial-clinico",          requireRole(["ADMINISTRADOR", "MEDICO"]), actualizarHistorialClinico);
router.patch("/:id/historia-clinica-especialidad", requireRole(["ADMINISTRADOR", "MEDICO"]), actualizarHistoriaClinicaEspecialidad);
router.get("/:id",                              requireRole(PUEDE_CONSULTAR), obtenerPaciente);
router.put("/:id",                              requireRole(STAFF_PADRON), actualizarPaciente);
router.delete("/:id",                           requireRole(["ADMINISTRADOR"]), eliminarPaciente);

export default router;
