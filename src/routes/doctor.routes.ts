import { Router } from "express";
import {
  listarDoctores,
  obtenerDoctor,
  crearDoctor,
  actualizarDoctor,
  eliminarDoctor,
  obtenerDoctoresPorEspecialidad,
  obtenerHorariosDisponibles,
  obtenerHorariosDia,
} from "../controllers/doctor.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = Router();

// Todas las rutas de doctores requieren autenticación.
// (Pacientes que necesiten ver doctores ya están autenticados al reservar.)
router.use(verifyToken);

// Lectura: cualquier rol autenticado puede listar/ver doctores.
router.get("/",                              listarDoctores);
router.get("/especialidad/:especialidadId",  obtenerDoctoresPorEspecialidad);
router.get("/:id",                           obtenerDoctor);
router.get("/:id/horarios-disponibles",      obtenerHorariosDisponibles);
router.get("/:id/horarios-dia",              obtenerHorariosDia);

// Escritura: sólo ADMINISTRADOR.
router.post("/",      requireRole(["ADMINISTRADOR"]), crearDoctor);
router.patch("/:id",  requireRole(["ADMINISTRADOR"]), actualizarDoctor);
router.delete("/:id", requireRole(["ADMINISTRADOR"]), eliminarDoctor);

export default router;
