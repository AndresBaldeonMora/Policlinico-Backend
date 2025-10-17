import express from "express";
import { 
    listarDoctores, 
    obtenerDoctor, 
    obtenerDoctoresPorEspecialidad,
    obtenerHorariosDisponibles  // ⭐ Agregar esto
} from "../controllers/doctor.controller";

const router = express.Router();

// ⭐ Rutas específicas PRIMERO
router.get('/especialidad/:especialidadId', obtenerDoctoresPorEspecialidad);
router.get('/:id/horarios', obtenerHorariosDisponibles);  // ⭐ Nueva ruta

// Rutas genéricas después
router.get("/", listarDoctores);
router.get("/:id", obtenerDoctor);

export default router;