import { Router } from "express";
import {
  listarDoctores,
  obtenerDoctor,
  crearDoctor,
  actualizarDoctor,
  obtenerDoctoresPorEspecialidad,
  obtenerHorariosDisponibles,
} from "../controllers/doctor.controller";

const router = Router();

router.get("/",                                       listarDoctores);
router.post("/",                                      crearDoctor);

// ⚠️ Rutas estáticas ANTES que las dinámicas (:id)
router.get("/especialidad/:especialidadId",            obtenerDoctoresPorEspecialidad);

// Rutas dinámicas después
router.get("/:id",                                    obtenerDoctor);
router.put("/:id",                                    actualizarDoctor);
router.get("/:id/horarios-disponibles",               obtenerHorariosDisponibles);

export default router;