import express from "express";
import {
  obtenerMiPerfil,
  obtenerMisCitas,
  obtenerCitasHoy,
  actualizarEstadoCita,
  obtenerDetalleCita,
  guardarNotasClinicas,
  prescribirMedicamentos,
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
router.get("/citas-hoy", obtenerCitasHoy);
router.get("/citas/:id", obtenerDetalleCita);
router.patch("/citas/:id/estado", actualizarEstadoCita);
router.patch("/citas/:id/notas", guardarNotasClinicas);
router.patch("/citas/:id/medicamentos", prescribirMedicamentos);

export default router;