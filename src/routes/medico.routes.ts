import express from "express";
import {
  obtenerMiPerfil,
  obtenerMisCitas,
  obtenerCitasHoy,
  obtenerTurnoHoy,
  actualizarEstadoCita,
  obtenerDetalleCita,
  guardarNotasClinicas,
  prescribirMedicamentos,
  generarReceta,
  obtenerHistorialCitasPaciente,
  obtenerResultadosRecientes,
} from "../controllers/medico.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

// Todas las rutas requieren autenticación Y rol MEDICO
router.use(verifyToken);
router.use(requireRole(["MEDICO"]));

// Perfil del médico
router.get("/perfil", obtenerMiPerfil);

// Citas
router.get("/citas", obtenerMisCitas);
router.get("/citas-hoy", obtenerCitasHoy)
router.get("/turno-hoy", obtenerTurnoHoy);

// Resultados de laboratorio/imagen recientemente finalizados (bandeja del dashboard)
router.get("/resultados-recientes", obtenerResultadosRecientes);
router.get("/citas/:id", obtenerDetalleCita);
router.patch("/citas/:id/estado", actualizarEstadoCita);
router.patch("/citas/:id/notas", guardarNotasClinicas);
router.patch("/citas/:id/medicamentos", prescribirMedicamentos);

// Receta Única Estandarizada en PDF (descarga/impresión)
router.get("/citas/:id/receta", generarReceta);

// Historial de citas de un paciente (acceso completo, todas las especialidades)
router.get("/pacientes/:pacienteId/historial-citas", obtenerHistorialCitasPaciente);

export default router;