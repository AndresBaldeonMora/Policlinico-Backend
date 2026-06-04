import express from "express";
import {
  crearPaciente,
  crearCuentaPaciente,
  listarPacientes,
  obtenerPaciente,
  buscarPacientePorDni,
  actualizarPaciente,
  eliminarPaciente,
  desactivarPaciente,
  subirAvatarPaciente,
  uploadAvatarPaciente,
  obtenerHistorial,
  actualizarHistorialClinico,
  actualizarHistoriaClinicaEspecialidad,
  enviarRecordatorioEmail,
  enviarRecordatorioWsp,
} from "../controllers/paciente.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

// Todas las rutas requieren autenticación.
router.use(verifyToken);

// Recepción y admin gestionan el padrón de pacientes.
const STAFF_PADRON = ["ADMINISTRADOR", "RECEPCIONISTA"];

// Pueden consultar pacientes: cualquier rol clínico/staff.
const PUEDE_CONSULTAR = ["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"];

router.post("/",                                   requireRole(STAFF_PADRON), crearPaciente);
router.get("/",                                    requireRole(PUEDE_CONSULTAR), listarPacientes);
router.get("/dni/:dni",                            requireRole(PUEDE_CONSULTAR), buscarPacientePorDni);
router.post("/:id/crear-cuenta",                   requireRole(STAFF_PADRON), crearCuentaPaciente);
router.get("/:id/historial",                       requireRole(PUEDE_CONSULTAR), obtenerHistorial);
router.patch("/:id/historial-clinico",             requireRole(["ADMINISTRADOR", "MEDICO"]), actualizarHistorialClinico);
router.patch("/:id/historia-clinica-especialidad", requireRole(["ADMINISTRADOR", "MEDICO"]), actualizarHistoriaClinicaEspecialidad);
router.get("/:id",                                 requireRole(PUEDE_CONSULTAR), obtenerPaciente);
router.put("/:id",                                 requireRole(STAFF_PADRON), actualizarPaciente);
router.delete("/:id",                              requireRole(["ADMINISTRADOR"]), eliminarPaciente);
router.patch("/:id/desactivar",                    requireRole(["ADMINISTRADOR", "RECEPCIONISTA"]), desactivarPaciente);
router.post("/:id/avatar",                         requireRole(PUEDE_CONSULTAR), uploadAvatarPaciente, subirAvatarPaciente);
router.post("/:id/recordatorio-email",             requireRole(PUEDE_CONSULTAR), enviarRecordatorioEmail);
router.post("/:id/recordatorio-wsp",               requireRole(PUEDE_CONSULTAR), enviarRecordatorioWsp);

export default router;
