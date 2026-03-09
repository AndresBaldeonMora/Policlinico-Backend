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

router.get("/",                                    listarDoctores);
router.get("/:id",                                 obtenerDoctor);
router.post("/",                                   crearDoctor);
router.put("/:id",                                 actualizarDoctor);
router.get("/especialidad/:especialidadId",         obtenerDoctoresPorEspecialidad);
router.get("/:id/horarios-disponibles",            obtenerHorariosDisponibles);

export default router;